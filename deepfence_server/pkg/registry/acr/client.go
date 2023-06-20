package acr

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

var client = &http.Client{Timeout: 10 * time.Second}

func listImagesRegistryV2(url, namespace, userName, password string) ([]model.IngestedContainerImage, error) {

	var (
		images []model.IngestedContainerImage
	)

	repos, err := listCatalogRegistryV2(url, namespace, userName, password)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	for _, repo := range repos {
		repoTags, err := listRepoTagsV2(url, namespace, userName, password, repo)
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}
		log.Debug().Msgf("tags for image %s/%s are %s", repo, repoTags.Tags)

		images = append(images, getImageWithTags(url, namespace, userName, password, repo, repoTags)...)
	}

	return images, nil
}

func listCatalogRegistryV2(url, namespace, userName, password string) ([]string, error) {
	var (
		repositories []string
		err          error
	)

	listReposURL := "%s/v2/_catalog"
	queryURL := fmt.Sprintf(listReposURL, url)
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
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msg(err.Error())
	}

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
		log.Error().Msg(err.Error())
	}

	var repos ReposResp
	if err := json.Unmarshal(body, &repos); err != nil {
		log.Error().Msg(err.Error())
	}

	repositories = append(repositories, repos.Repositories...)

	return repositories, err
}

func listRepoTagsV2(url, namespace, userName, password, repoName string) (RepoTagsResp, error) {
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

func getManifestsAzure(url, namespace, userName, password, repoName string) (ManifestsAzureResp, error) {
	var (
		err       error
		manifests ManifestsAzureResp
	)

	getManifestsURL := "%s/acr/v1/%s/_manifests"
	queryURL := fmt.Sprintf(getManifestsURL, url, repoName)
	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return manifests, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(userName, password)

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return manifests, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msg(err.Error())
		return manifests, err
	}

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
		log.Error().Msg(err.Error())
		return manifests, err
	}

	if err := json.Unmarshal(body, &manifests); err != nil {
		log.Error().Msg(err.Error())
		return manifests, err
	}

	return manifests, err
}

func getImageWithTags(url, namespace, userName, password, repoName string, repoTags RepoTagsResp) []model.IngestedContainerImage {
	var imageAndTag []model.IngestedContainerImage
	manifests, err := getManifestsAzure(url, namespace, userName, password, repoName)
	if err != nil {
		return imageAndTag
	}
	for _, tag := range repoTags.Tags {
		details := getImageDetails(tag, manifests)
		if details != nil {
			tt := model.IngestedContainerImage{
				ID:            model.DigestToID(details.Digest),
				DockerImageID: model.DigestToID(details.Digest),
				Name:          repoName,
				Tag:           tag,
				Size:          fmt.Sprint(details.ImageSize),
				Metadata: model.Metadata{
					"created_time": details.CreatedTime.Unix(),
					"digest":       details.Digest,
					"last_pushed":  details.LastUpdateTime.Unix(),
					"last_updated": details.LastUpdateTime.Unix(),
					"os":           details.Os,
				},
			}
			imageAndTag = append(imageAndTag, tt)
		}
	}

	return imageAndTag
}

func getImageDetails(tag string, manifests ManifestsAzureResp) *ManifestV1Azure {
	for _, manifest := range manifests.Manifests {
		for _, i := range manifest.Tags {
			if i == tag {
				return &manifest
			}
		}
	}
	return nil
}
