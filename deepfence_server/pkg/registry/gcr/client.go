package gcr

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
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

var (
	client                 = &http.Client{Timeout: 10 * time.Second}
	parallelImageProcessor *tunny.Pool
	queue                  chan []model.IngestedContainerImage
)

func init() {
	parallelImageProcessor = tunny.NewFunc(ParallelImageFetch, fetchImageWithTags)
	queue = make(chan []model.IngestedContainerImage, ImageQueueBufferSize)
}

type RepoDetails struct {
	URL        string
	UserName   string
	Password   string
	NameSpace  string
	Repository string
}

func listImagesRegistryV2(url, namespace, userName, password string) ([]model.IngestedContainerImage, error) {

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
			NameSpace:  namespace,
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
	log.Debug().Msgf("tags for image %s/%s are %s", r.Repository, repoTags.Name, repoTags.Tags)

	images = getImageWithTags(r.URL, r.NameSpace, r.UserName, r.Password, r.Repository, repoTags)
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

	return repos.Repositories, err
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

// func getManifestsV2(url, namespace, userName, password, repoName, tag string) (ManifestsResp, error) {
// 	var (
// 		err       error
// 		manifests ManifestsResp
// 	)

// 	getManifestsURL := "%s/v2/%s/manifests/%s"
// 	queryURL := fmt.Sprintf(getManifestsURL, url, repoName, tag)
// 	req, err := http.NewRequest(http.MethodGet, queryURL, nil)
// 	if err != nil {
// 		log.Error().Msg(err.Error())
// 		return manifests, err
// 	}
// 	req.Header.Set("Content-Type", "application/json")
// 	req.SetBasicAuth(userName, password)

// 	resp, err := client.Do(req)
// 	if err != nil {
// 		log.Error().Msg(err.Error())
// 		return manifests, err
// 	}
// 	defer resp.Body.Close()

// 	body, err := io.ReadAll(resp.Body)
// 	if err != nil {
// 		log.Error().Msg(err.Error())
// 		return manifests, err
// 	}

// 	if resp.StatusCode != http.StatusOK {
// 		err = fmt.Errorf("error bad status code %d", resp.StatusCode)
// 		log.Error().Msg(err.Error())
// 		return manifests, err
// 	}

// 	if err := json.Unmarshal(body, &manifests); err != nil {
// 		log.Error().Msg(err.Error())
// 		return manifests, err
// 	}

// 	return manifests, err
// }

func getImageWithTags(url, namespace, userName, password, repoName string, repoTags RepoTagsResp) []model.IngestedContainerImage {
	var imageAndTag []model.IngestedContainerImage

	for _, tag := range repoTags.Tags {
		digest, details := getImageDetails(tag, repoTags)
		imageID, shortImageID := model.DigestToID(*digest)

		timeUploaded := ""
		timeMS, err := strconv.ParseInt(details.TimeUploadedMs, 10, 64)
		if err != nil {
			timeUploaded = details.TimeUploadedMs
		} else {
			tm := timeMS / 1000
			timeUploaded = strconv.FormatInt(tm, 10)
		}

		tt := model.IngestedContainerImage{
			ID:            imageID,
			DockerImageID: imageID,
			ShortImageID:  shortImageID,
			Name:          repoName,
			Tag:           tag,
			Size:          fmt.Sprint(details.ImageSizeBytes),
			Metadata: model.Metadata{
				"timeCreatedMs": details.TimeCreatedMs,
				"digest":        *digest,
				"last_updated":  timeUploaded,
			},
		}
		imageAndTag = append(imageAndTag, tt)
	}

	return imageAndTag
}

func getImageDetails(tag string, repoTags RepoTagsResp) (*string, *Manifest) {
	for k, manifest := range repoTags.Manifest {
		for _, i := range manifest.Tag {
			if i == tag {
				return &k, &manifest
			}
		}
	}
	return nil, nil
}
