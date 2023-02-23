package quay

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

func listImages(url, namespace, token string) ([]model.ContainerImage, error) {

	var (
		images []model.ContainerImage
	)

	repos, err := listRepos(url, namespace, token)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	for _, repo := range repos {
		tags, err := listRepoTags(url, namespace, token, repo.Name)
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}
		log.Debug().Msgf("tags for image %s/%s are %s", repo.Namespace, repo.Name, tags)

		images = append(images, getImageWithTags(repo, tags)...)
	}

	return images, nil
}

func listRepos(url, namespace, token string) ([]Repositories, error) {
	var (
		repositories []Repositories
		err          error
	)

	for {
		nextPageToken := ""
		listReposUrl := "%s/api/v1/repository?repo_kind=image&public=true&last_modified=true&namespace=%s&next_page=%s"
		queryURl := fmt.Sprintf(listReposUrl, url, namespace, nextPageToken)
		req, err := http.NewRequest(http.MethodGet, queryURl, nil)
		if err != nil {
			log.Error().Msg(err.Error())
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

		resp, err := client.Do(req)
		if err != nil {
			log.Error().Msg(err.Error())
			break
		}
		defer resp.Body.Close()

		body, err := io.ReadAll(resp.Body)
		if err != nil {
			log.Error().Msg(err.Error())
			break
		}

		if resp.StatusCode != http.StatusOK {
			err = fmt.Errorf("error bad status code %d", resp.StatusCode)
			log.Error().Msg(err.Error())
			break
		}

		var repos ReposResp
		if err := json.Unmarshal(body, &repos); err != nil {
			log.Error().Msg(err.Error())
			break
		}

		repositories = append(repositories, repos.Repositories...)

		if repos.NextPage == "" {
			break
		}
		// get next page token
		nextPageToken = repos.NextPage
		log.Info().Msgf("got next page token %s for quay namespace %s",
			nextPageToken, namespace)
	}

	return repositories, err
}

func listRepoTags(url, namespace, token, repoName string) (Tags, error) {
	var (
		err  error
		tags Tags
	)

	listRepoTagsUrl := "%s/api/v1/repository/%s/%s?includeTags=true&includeStats=false"
	queryURl := fmt.Sprintf(listRepoTagsUrl, url, namespace, repoName)
	req, err := http.NewRequest(http.MethodGet, queryURl, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return tags, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return tags, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msg(err.Error())
		return tags, err
	}

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
		log.Error().Msg(err.Error())
		return tags, err
	}

	var repoTags RepoTagsResp
	if err := json.Unmarshal(body, &repoTags); err != nil {
		log.Error().Msg(err.Error())
		return tags, err
	}

	return repoTags.Tags, err
}

func getImageWithTags(repo Repositories, tags Tags) []model.ContainerImage {
	var imageAndTag []model.ContainerImage

	for tag, data := range tags {
		tt := model.ContainerImage{
			ID:      model.DigestToID(data.ManifestDigest),
			Name:    repo.Name,
			Tag:     tag,
			Size:    fmt.Sprint(data.Size),
			Metrics: model.ComputeMetrics{},
			Metadata: model.Metadata{
				"status":       repo.State,
				"last_pushed":  repo.LastModified,
				"digest":       data.ManifestDigest,
				"last_updated": data.LastModified,
			},
		}
		imageAndTag = append(imageAndTag, tt)
	}

	return imageAndTag
}
