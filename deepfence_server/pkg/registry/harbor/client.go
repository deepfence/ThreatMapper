package harbor

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
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
	Project    string
	Repository Repository
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

func listImages(url, project, username, password string) ([]model.IngestedContainerImage, error) {

	var images []model.IngestedContainerImage
	parallelImageProcessor.SetSize(ParallelImageFetch)
	defer parallelImageProcessor.SetSize(0)

	repos, err := getRepos(url, project, username, password)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	for _, repo := range repos {
		r := RepoDetails{
			URL:        url,
			UserName:   username,
			Password:   password,
			Project:    project,
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

	for _, repo := range repos {
		artifacts, err := listArtifacts(url, username, password, project, repo.Name)
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}
		log.Debug().Msgf("tags for image %d/%s are %v", repo.ProjectID, repo.Name, artifacts)

		images = append(images, getImageWithTags(repo, artifacts)...)
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
	artifacts, err := listArtifacts(r.URL, r.UserName, r.Password, r.Project, r.Repository.Name)
	if err != nil {
		log.Error().Msg(err.Error())
		return false
	}
	log.Debug().Msgf("tags for image %d/%s are %s", r.Repository.ProjectID, r.Repository.Name, artifacts)

	images = getImageWithTags(r.Repository, artifacts)
	return true
}

func getRepos(url, project, name, password string) ([]Repository, error) {
	var repositories []Repository
	var queryURL string
	i := 0
	for {
		i++
		if len(repositories) == 0 {
			queryURL = fmt.Sprintf("%s/api/v2.0/projects/%s/repositories?page_size=%d", url, project, PerPageCount)
		} else {
			queryURL = fmt.Sprintf("%s/api/v2.0/projects/%s/repositories?page=%d&page_size=%d", url, project, i, PerPageCount)
		}
		repos, err := listRepos(queryURL, name, password)
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

func listRepos(url, username, password string) ([]Repository, error) {
	var (
		repositories []Repository
		err          error
	)

	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(username, password)

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Msg(err.Error())
		return repositories, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Msg(err.Error())
		return repositories, err
	}

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
		log.Error().Msg(err.Error())
		return repositories, err
	}

	if err := json.Unmarshal(body, &repositories); err != nil {
		log.Error().Msg(err.Error())
		return repositories, err
	}

	return repositories, nil
}

func listArtifacts(url, username, password, project, repo string) ([]Artifact, error) {
	var artifacts []Artifact

	listRepoTagsURL := "%s/api/v2.0/projects/%s/repositories/%s/artifacts"
	repoName := strings.TrimPrefix(repo, project)
	repoName = strings.TrimPrefix(repoName, "/")
	queryURL := fmt.Sprintf(listRepoTagsURL, url, project, repoName)
	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
	if err != nil {
		log.Error().Msg(err.Error())
		return artifacts, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.SetBasicAuth(username, password)

	resp, err := client.Do(req)
	if err != nil {
		log.Error().Err(err).Msgf("response: %+v", resp)
		return artifacts, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		log.Error().Err(err).Msgf("response: %+v", resp)
		return artifacts, err
	}

	if resp.StatusCode != http.StatusOK {
		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
		log.Error().Err(err).Msgf("response: %+v", resp)
		return artifacts, err
	}

	if err := json.Unmarshal(body, &artifacts); err != nil {
		log.Error().Err(err).Msgf("response: %+v", resp)
		return artifacts, err
	}

	return artifacts, err
}

func getImageWithTags(repo Repository, artifacts []Artifact) []model.IngestedContainerImage {
	var imageAndTag []model.IngestedContainerImage

	for _, artifact := range artifacts {
		if artifact.Type != "IMAGE" {
			continue
		}
		for _, tag := range artifact.Tags {
			imageID, shortImageID := model.DigestToID(artifact.Digest)
			tt := model.IngestedContainerImage{
				ID:            imageID,
				DockerImageID: imageID,
				ShortImageID:  shortImageID,
				Name:          repo.Name,
				Tag:           tag.Name,
				Size:          fmt.Sprint(artifact.Size),
				Metadata: model.Metadata{
					"last_pushed":   tag.PushTime.Unix(),
					"digest":        artifact.Digest,
					"creation_time": repo.CreationTime.Unix(),
					"last_updated":  tag.PushTime.Unix(),
				},
			}
			imageAndTag = append(imageAndTag, tt)
		}
	}

	return imageAndTag
}
