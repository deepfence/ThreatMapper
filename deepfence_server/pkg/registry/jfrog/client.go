package jfrog

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

const PerPageCount = 100

var client = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	},
}

func listImagesRegistryV2(url, repository, userName, password string) ([]model.IngestedContainerImage, error) {

	var (
		images []model.IngestedContainerImage
	)

	repos, err := getRepos(url, repository, userName, password)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	for _, repo := range repos {
		repoTags, err := listRepoTagsV2(url, repository, userName, password, repo)
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}
		log.Debug().Msgf("tags for image %s are %s", repo, repoTags.Tags)

		images = append(images, getImageWithTags(url, repository, userName, password, repo, repoTags)...)
	}

	return images, nil
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

	listReposURL := "%s/artifactory/api/docker/%s/v2/_catalog"
	queryURL := fmt.Sprintf(listReposURL, url, repository)
	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
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
