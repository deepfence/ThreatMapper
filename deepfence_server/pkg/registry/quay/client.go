package quay

import (
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
	ParallelImageFetch   = 10
	ImageQueueBufferSize = 100
)

var (
	client                 = &http.Client{Timeout: 10 * time.Second}
	parallelImageProcessor *tunny.Pool
	queue                  chan []model.IngestedContainerImage
)

func init() {
	parallelImageProcessor = tunny.NewFunc(0, fetchImageWithTags)
	queue = make(chan []model.IngestedContainerImage, ImageQueueBufferSize)
}

type RepoDetails struct {
	URL        string
	Token      string
	Password   string
	NameSpace  string
	Repository Repositories
}

func listImages(url, namespace, token string) ([]model.IngestedContainerImage, error) {

	var (
		images []model.IngestedContainerImage
	)
	parallelImageProcessor.SetSize(ParallelImageFetch)
	defer parallelImageProcessor.SetSize(0)

	repos, err := listRepos(url, namespace, token)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	for _, repo := range repos {
		r := RepoDetails{
			URL:        url,
			NameSpace:  namespace,
			Token:      token,
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
	tags, err := listRepoTags(r.URL, r.NameSpace, r.Token, r.Repository.Name)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	log.Debug().Msgf("tags for image %s/%s are %v", r.Repository.Namespace, r.Repository.Name, tags)

	images = getImageWithTags(r.Repository, tags)
	return true
}

func listRepos(url, namespace, token string) ([]Repositories, error) {
	var (
		repositories []Repositories
		err          error
	)

	for {
		nextPageToken := ""
		listReposURL := "%s/api/v1/repository?repo_kind=image&public=true&last_modified=true&namespace=%s&next_page=%s"
		queryURL := fmt.Sprintf(listReposURL, url, namespace, nextPageToken)
		req, err := http.NewRequest(http.MethodGet, queryURL, nil)
		if err != nil {
			log.Error().Msg(err.Error())
			return nil, err
		}
		req.Header.Set("Content-Type", "application/json")
		req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))

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
			break
		}

		var repos ReposResp
		err = json.Unmarshal(body, &repos)
		if err != nil {
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

	listRepoTagsURL := "%s/api/v1/repository/%s/%s?includeTags=true&includeStats=false"
	queryURL := fmt.Sprintf(listRepoTagsURL, url, namespace, repoName)
	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
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

func getImageWithTags(repo Repositories, tags Tags) []model.IngestedContainerImage {
	var imageAndTag []model.IngestedContainerImage

	for tag, data := range tags {
		// data.LastModified is like Mon, 30 May 2022 16:23:08 -0000
		lastUpdatedUnix, err := time.Parse(time.RFC1123Z, data.LastModified)
		if err != nil {
			log.Error().Msg(err.Error())
		}

		imageID, shortImageID := model.DigestToID(data.ManifestDigest)
		tt := model.IngestedContainerImage{
			ID:            imageID,
			DockerImageID: imageID,
			ShortImageID:  shortImageID,
			Name:          repo.Name,
			Tag:           tag,
			Size:          fmt.Sprint(data.Size),
			Metadata: model.Metadata{
				"status":       repo.State,
				"last_pushed":  repo.LastModified,
				"digest":       data.ManifestDigest,
				"last_updated": lastUpdatedUnix.Unix(),
			},
		}
		imageAndTag = append(imageAndTag, tt)
	}

	return imageAndTag
}
