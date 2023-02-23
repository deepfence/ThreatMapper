package dockerprivate

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

var client = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	},
}

func listImagesRegistryV2(url, userName, password string) ([]model.ContainerImage, error) {

	var (
		images []model.ContainerImage
	)

	repos, err := listCatalogRegistryV2(url, userName, password)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	for _, repo := range repos {
		repoTags, err := listRepoTagsV2(url, userName, password, repo)
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}
		log.Debug().Msgf("tags for image %s/%s are %s", repo, repoTags.Tags)

		images = append(images, getImageWithTags(url, userName, password, repo, repoTags)...)
	}

	return images, nil
}

func listCatalogRegistryV2(url, userName, password string) ([]string, error) {
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

func getImageWithTags(url, userName, password, repoName string, repoTags RepoTagsResp) []model.ContainerImage {
	var imageAndTag []model.ContainerImage

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

		tt := model.ContainerImage{
			ID:      model.DigestToID(digest),
			Name:    repoName,
			Tag:     tag,
			Size:    "",
			Metrics: model.ComputeMetrics{},
			Metadata: model.Metadata{
				"created": comp.Created,
				"digest":  digest,
			},
		}
		imageAndTag = append(imageAndTag, tt)
	}

	return imageAndTag
}
