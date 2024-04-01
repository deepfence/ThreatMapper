package jfrog

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/Jeffail/tunny"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

const (
	PerPageCount         = 100
	ParallelImageFetch   = 10
	ImageQueueBufferSize = 100
)

func init() {
	parallelImageProcessor = tunny.NewFunc(0, fetchImageWithTags)
	queue = make(chan []model.IngestedContainerImage, ImageQueueBufferSize)
}

type RepoDetails struct {
	URL        string
	UserName   string
	Password   string
	NameSpace  string
	Repository string
}

var (
	client = &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			Proxy:           http.ProxyFromEnvironment,
			TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
		},
	}
	parallelImageProcessor *tunny.Pool
	queue                  chan []model.IngestedContainerImage
)

func listImagesRegistryV2(url, repository, userName, password string) ([]model.IngestedContainerImage, error) {

	var (
		images []model.IngestedContainerImage
	)

	parallelImageProcessor.SetSize(ParallelImageFetch)
	defer parallelImageProcessor.SetSize(0)

	repos, err := getRepos(url, repository, userName, password)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	for _, repo := range repos {
		r := RepoDetails{
			URL:        url,
			UserName:   userName,
			Password:   password,
			NameSpace:  repository,
			Repository: repo,
		}
		go parallelImageProcessor.Process(&r)
	}
	for _, _ = range repos {
		select {
		case t := <-queue:
			images = append(images, t...)
		}
	}

	return images, nil
}

func fetchImageWithTags(rInterface interface{}) interface{} {
	var images []model.IngestedContainerImage
	defer func() {
		queue <- images
	}()
	r, ok := rInterface.(*RepoDetails)
	if !ok {
		log.Error().Msg("Error processing repo details")
		return false
	}
	repoTags, err := listRepoTagsV2(r.URL, r.NameSpace, r.UserName, r.Password, r.Repository)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	log.Debug().Msgf("tags for image %s are %s", r.Repository, repoTags.Tags)

	images = getImageWithTags(r.URL, r.NameSpace, r.UserName, r.Password, r.Repository, repoTags)
	return true
}

func getRepos(url, repository, name, password string) ([]string, error) {
	var repositories []string
	var queryURL string
	for {
		if len(repositories) == 0 {
			queryURL = fmt.Sprintf("%s/artifactory/api/docker/%s/v2/_catalog?n=%d", url, repository, PerPageCount)
		} else {
			queryURL = fmt.Sprintf("%s/artifactory/api/docker/%s/v2/_catalog?last=%s&n=%d", url, repository, repositories[len(repositories)-1], PerPageCount)
		}
		repos, err := listCatalogRegistryV2(queryURL, repository, name, password)
		if err != nil {
			return repositories, err
		}
		if len(repos) == 0 {
			break
		}
		repositories = append(repositories, repos...)
	}
	return repositories, nil
}

func listCatalogRegistryV2(url, repository, userName, password string) ([]string, error) {
	var (
		repositories []string
		err          error
	)

	log.Debug().Msgf("url:%s", url)
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(userName, password)

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
		log.Error().Msg(err.Error())
		return nil, err
	}

	var repos ReposResp
	if err = json.Unmarshal(body, &repos); err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}

	repositories = append(repositories, repos.Repositories...)

	return repositories, err
}

func listRepoTagsV2(url, repository, userName, password, repoName string) (RepoTagsResp, error) {
	var (
		err      error
		repoTags RepoTagsResp
	)

	listRepoTagsURL := "%s/artifactory/api/docker/%s/v2/%s/tags/list"
	queryURL := fmt.Sprintf(listRepoTagsURL, url, repository, repoName)
	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return repoTags, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(userName, password)

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return repoTags, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msg(err.Error())
		return repoTags, err
	}

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
		log.Error().Msg(err.Error())
		return repoTags, err
	}

	if err := json.Unmarshal(body, &repoTags); err != nil {
		log.Error().Msg(err.Error())
		return repoTags, err
	}

	return repoTags, err
}

func getManifestsV2(url, repository, userName, password, repoName, tag string) (string, Manifest, error) {
	var (
		err       error
		manifests Manifest
		digest    string
	)

	getManifestsURL := "%s/artifactory/api/docker/%s/v2/%s/manifests/%s"
	queryURL := fmt.Sprintf(getManifestsURL, url, repository, repoName, tag)
	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return digest, manifests, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/vnd.docker.distribution.manifest.list.v2+json")
	req.SetBasicAuth(userName, password)

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return digest, manifests, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msg(err.Error())
		return digest, manifests, err
	}

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
		log.Error().Msg(err.Error())
		return digest, manifests, err
	}

	if err := json.Unmarshal(body, &manifests); err != nil {
		log.Error().Msg(err.Error())
		return digest, manifests, err
	}

	digest = resp.Header.Get("Docker-Content-Digest")

	return digest, manifests, err
}

func getTagInfo(url, repository, userName, password, repoName, tag string) (TagInfo, error) {
	var info TagInfo

	infoURL := "%s/artifactory/api/storage/%s/%s/%s"
	queryURL := fmt.Sprintf(infoURL, url, repository, repoName, tag)

	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return info, err
	}

	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(userName, password)
	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return info, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msg(err.Error())
		return info, err
	}

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
		log.Error().Msg(err.Error())
		return info, err
	}

	if err := json.Unmarshal(body, &info); err != nil {
		log.Error().Msg(err.Error())
		return info, err
	}

	return info, err
}

func getImageWithTags(url, repository, userName, password, repoName string, repoTags RepoTagsResp) []model.IngestedContainerImage {
	var imageAndTag []model.IngestedContainerImage
	// ISO8601 format
	dateFormat := "2006-01-02T15:04:05.000Z"

	for _, tag := range repoTags.Tags {
		digest, manifest, err := getManifestsV2(url, repository, userName, password, repoName, tag)
		if err != nil {
			continue
		}

		var comp HistoryV1Compatibility
		if len(manifest.History) > 0 {
			if err := json.Unmarshal([]byte(manifest.History[0].V1Compatibility), &comp); err != nil {
				log.Error().Msg(err.Error())
			}
		}

		tagDateInfo, err := getTagInfo(url, repository, userName, password, repoName, tag)
		if err != nil {
			continue
		}

		var createdDateTS, lastModifiedTS, lastUpdatedTS int64
		createdDate, err := time.Parse(dateFormat, tagDateInfo.Created)
		if err != nil {
			log.Error().Msgf("Error in parsing Created timestamp: %v", err)
		} else {
			createdDateTS = createdDate.Unix()
		}

		lastModified, err := time.Parse(dateFormat, tagDateInfo.LastModified)
		if err != nil {
			log.Error().Msgf("Error in parsing LastModified timestamp: %v", err)
		} else {
			lastModifiedTS = lastModified.Unix()
		}

		lastUpdated, err := time.Parse(dateFormat, tagDateInfo.LastUpdated)
		if err != nil {
			log.Error().Msgf("Error in parsing LastUpdated timestamp: %v", err)
		} else {
			lastUpdatedTS = lastUpdated.Unix()
		}

		imageID, shortImageID := model.DigestToID(digest)
		tt := model.IngestedContainerImage{
			ID:            imageID,
			DockerImageID: imageID,
			ShortImageID:  shortImageID,
			Name:          repoName,
			Tag:           tag,
			Size:          "",
			Metadata: model.Metadata{
				"created":      createdDateTS,
				"digest":       digest,
				"last_updated": lastUpdatedTS,
				"last_pushed":  lastModifiedTS,
			},
		}
		imageAndTag = append(imageAndTag, tt)
	}

	return imageAndTag
}
