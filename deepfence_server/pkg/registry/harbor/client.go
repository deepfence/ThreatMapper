package harbor

import (
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var client = &http.Client{
	Timeout: 10 * time.Second,
	Transport: &http.Transport{
		TLSClientConfig: &tls.Config{InsecureSkipVerify: true},
	},
}

func listImages(url, project, username, password string) ([]model.IngestedContainerImage, error) {

	var (
		images []model.IngestedContainerImage
	)

	repos, err := listRepos(url, project, username, password)
	if err != nil {
		log.Error().Msg(err.Error())
		return nil, err
	}
	for _, repo := range repos {
		artifacts, err := listArtifacts(url, username, password, project, repo.Name)
		if err != nil {
			log.Error().Msg(err.Error())
			continue
		}
		log.Debug().Msgf("tags for image %s/%s are %s", repo.ProjectID, repo.Name, artifacts)

		images = append(images, getImageWithTags(repo, artifacts)...)
	}

	return images, nil
}

func listRepos(url, project, username, password string) ([]Repository, error) {
	var (
		repositories []Repository
		err          error
	)

	listReposUrl := "%s/api/v2.0/projects/%s/repositories"
	queryURl := fmt.Sprintf(listReposUrl, url, project)
	req, err := http.NewRequest(http.MethodGet, queryURl, nil)
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
	var (
		err       error
		artifacts []Artifact
	)

	listRepoTagsUrl := "%s/api/v2.0/projects/%s/repositories/%s/artifacts"
	queryURl := fmt.Sprintf(listRepoTagsUrl, url, project, strings.TrimPrefix(repo, project))
	req, err := http.NewRequest(http.MethodGet, queryURl, nil)
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
			tt := model.IngestedContainerImage{
				ID:            model.DigestToID(artifact.Digest),
				DockerImageID: model.DigestToID(artifact.Digest),
				Name:          repo.Name,
				Tag:           tag.Name,
				Size:          fmt.Sprint(artifact.Size),
				Metadata: model.Metadata{
					"last_pushed":   tag.PushTime,
					"digest":        artifact.Digest,
					"creation_time": repo.CreationTime,
					"last_updated":  tag.PushTime,
				},
			}
			imageAndTag = append(imageAndTag, tt)
		}
	}

	return imageAndTag
}
