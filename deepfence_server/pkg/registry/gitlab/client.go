package gitlab

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
)

type Project struct {
	ID                int    `json:"id"`
	Name              string `json:"name"`
	PathWithNamespace string `json:"path_with_namespace"`
}

type Image struct {
	ID                     int         `json:"id"`
	Name                   string      `json:"name"`
	Path                   string      `json:"path"`
	ProjectID              int         `json:"project_id"`
	Location               string      `json:"location"`
	CreatedAt              time.Time   `json:"created_at"`
	CleanupPolicyStartedAt interface{} `json:"cleanup_policy_started_at"`
	TagsCount              int         `json:"tags_count"`
	Tags                   []Tag       `json:"tags"`
}

type Tag struct {
	Name     string `json:"name"`
	Path     string `json:"path"`
	Location string `json:"location"`
}

type TagDetail struct {
	Name          string `json:"name"`
	Path          string `json:"path"`
	Location      string `json:"location"`
	Revision      string `json:"revision"`
	ShortRevision string `json:"short_revision"`
	Digest        string `json:"digest"`
	CreatedAt     string `json:"created_at"`
	Totalsize     int    `json:"total_size"`
}

func listImages(gitlabServerURL, gitlabRegistryURL, accessToken string) ([]model.IngestedContainerImage, error) {

	containerImages := []model.IngestedContainerImage{}

	// Retrieve a list of projects
	projects, err := getProjects(gitlabServerURL, accessToken)
	if err != nil {
		return nil, err
	}

	// For each project, retrieve a list of tags and images with tags
	for _, project := range projects {
		image, err := getImageWithTags(gitlabServerURL, accessToken, project.ID)
		if err != nil {
			return nil, err
		}

		for _, tag := range image.Tags {
			// Retrieve tag details
			tagDetail, err := getTagDetail(gitlabServerURL, tag.Name, accessToken, project.ID, image.ID)
			if err != nil {
				return nil, err
			}

			imageID, shortImageID := model.DigestToID(tagDetail.Digest)
			containerImage := model.IngestedContainerImage{
				ID:            imageID,
				DockerImageID: imageID,
				ShortImageID:  shortImageID,
				Name:          project.PathWithNamespace,
				Tag:           tag.Name,
				Size:          strconv.Itoa(tagDetail.Totalsize),
				Metadata: model.Metadata{
					"digest":       tagDetail.Digest,
					"last_updated": time.Now().Unix(),
					"created_at":   tagDetail.CreatedAt,
				},
			}
			containerImages = append(containerImages, containerImage)
		}
	}
	return containerImages, nil
}

func getProjects(gitlabServerURL, accessToken string) ([]Project, error) {
	url := fmt.Sprintf("%s/api/v4/projects?private_token=%s&simple=false&membership=true", gitlabServerURL, accessToken)

	resp, err := http.Get(url)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var projects []Project
	err = json.NewDecoder(resp.Body).Decode(&projects)
	if err != nil {
		return nil, err
	}

	return projects, nil
}

func getImageWithTags(gitlabServerURL, accessToken string, projectID int) (Image, error) {
	url := fmt.Sprintf("%s/api/v4/projects/%d/registry/repositories?tags=true&tags_count=true", gitlabServerURL, projectID)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return Image{}, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return Image{}, err
	}
	defer resp.Body.Close()

	var image []Image
	err = json.NewDecoder(resp.Body).Decode(&image)
	if err != nil {
		return Image{}, err
	}

	return image[0], nil
}

func getTagDetail(gitlabServerURL, tagName, accessToken string, projectID, repoID int) (TagDetail, error) {
	url := fmt.Sprintf("%s/api/v4/projects/%d/registry/repositories/%d/tags/%s", gitlabServerURL, projectID, repoID, tagName)

	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return TagDetail{}, err
	}

	req.Header.Set("Authorization", fmt.Sprintf("Bearer %s", accessToken))

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return TagDetail{}, err
	}
	defer resp.Body.Close()

	var tagDetail TagDetail
	err = json.NewDecoder(resp.Body).Decode(&tagDetail)
	if err != nil {
		return TagDetail{}, err
	}

	return tagDetail, nil
}
