package dockerprivate

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
	parallelImageProcessor = tunny.NewFunc(ParallelImageFetch, fetchImageWithTags)
	queue = make(chan []model.IngestedContainerImage, ImageQueueBufferSize)
}

type RepoDetails struct {
	URL        string
	UserName   string
	Password   string
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

func listImagesRegistryV2(url, userName, password string) ([]model.IngestedContainerImage, error) {

	var (
		images []model.IngestedContainerImage
	)
	parallelImageProcessor.SetSize(ParallelImageFetch)
	defer parallelImageProcessor.SetSize(0)

	repos, err := getRepos(url, userName, password)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	for _, repo := range repos {
		r := RepoDetails{
			URL:        url,
			UserName:   userName,
			Password:   password,
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
	repoTags, err := listRepoTagsV2(r.URL, r.UserName, r.Password, r.Repository)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	log.Debug().Msgf("tags for image %s/%s are %s", r.Repository, repoTags.Name, repoTags.Tags)

	images = getImageWithTags(r.URL, r.UserName, r.Password, r.Repository, repoTags)
	return true
}

func getRepos(url, name, password string) ([]string, error) {
	var repositories []string
	var queryURL string
	for {
		if len(repositories) == 0 {
			queryURL = fmt.Sprintf("%s/v2/_catalog?n=%d", url, PerPageCount)
		} else {
			queryURL = fmt.Sprintf("%s/v2/_catalog?last=%s&n=%d", url, repositories[len(repositories)-1], PerPageCount)
		}
		repos, err := listCatalogRegistryV2(queryURL, name, password)
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

func listCatalogRegistryV2(url, userName, password string) ([]string, error) {
	var err error

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	if len(userName) > 0 {
		req.SetBasicAuth(userName, password)
	}

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

	return repos.Repositories, err
}

func listRepoTagsV2(url, userName, password, repoName string) (RepoTagsResp, error) {
	var (
		err      error
		repoTags RepoTagsResp
	)

	listRepoTagsURL := "%s/v2/%s/tags/list"
	queryURL := fmt.Sprintf(listRepoTagsURL, url, repoName)
	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return repoTags, err
	}
	req.Header.Set("Content-Type", "application/json")
	if len(userName) > 0 {
		req.SetBasicAuth(userName, password)
	}

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

func getManifestsV2(url, userName, password, repoName, tag string) (string, Manifest, error) {
	var (
		err       error
		manifests Manifest
		digest    string
	)

	getManifestsURL := "%s/v2/%s/manifests/%s"
	queryURL := fmt.Sprintf(getManifestsURL, url, repoName, tag)
	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return digest, manifests, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/vnd.docker.distribution.manifest.list.v2+json")
	if len(userName) > 0 {
		req.SetBasicAuth(userName, password)
	}

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

func getImageWithTags(url, userName, password, repoName string, repoTags RepoTagsResp) []model.IngestedContainerImage {
	var imageAndTag []model.IngestedContainerImage

	for _, tag := range repoTags.Tags {
		digest, manifest, err := getManifestsV2(url, userName, password, repoName, tag)
		if err != nil {
			continue
		}

		var comp HistoryV1Compatibility
		if len(manifest.History) > 0 {
			if err := json.Unmarshal([]byte(manifest.History[0].V1Compatibility), &comp); err != nil {
				log.Error().Msg(err.Error())
			}
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
				"created":      comp.Created,
				"digest":       digest,
				"last_updated": comp.Created.Unix(),
			},
		}
		imageAndTag = append(imageAndTag, tt)
	}

	return imageAndTag
}
