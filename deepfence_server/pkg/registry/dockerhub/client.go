package dockerhub

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var client = &http.Client{Timeout: 10 * time.Second}

func getImagesList(u, p, ns string) ([]model.IngestedContainerImage, error) {
	token, cookies, err := getAuthTokenAndCookies(u, p)
	if err != nil {
		return nil, err
	}

	var allRepoWithTags []model.IngestedContainerImage
	pageSize := 100
	page := 1

	for {
		url := dockerHubURL + "/repositories/" + ns + "/?page_size=" + strconv.Itoa(pageSize) + "&page=" + strconv.Itoa(page)
		req, err := http.NewRequest("GET", url, nil)
		if err != nil {
			return nil, err
		}

		for _, v := range cookies {
			req.AddCookie(v)
		}

		req.Header.Add("Authorization", "JWT "+token)

		resp, err := client.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode != 200 {
			err = errors.New(url +
				"\nresp.StatusCode: " + strconv.Itoa(resp.StatusCode))
			return nil, err
		}

		repo, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, err
		}
		repoWithTags, err := getRepoTags(repo, ns, token, cookies)
		if err != nil {
			return nil, err
		}

		allRepoWithTags = append(allRepoWithTags, repoWithTags...)

		// Check if there are more pages to fetch
		if !hasNextPage(repo) {
			break
		}

		page++
	}

	return allRepoWithTags, nil
}

// Function to check if there is a "next" page in the Link header
func hasNextPage(repoB []byte) bool {
	var repo model.RegistryImages
	err := json.Unmarshal(repoB, &repo)
	if err != nil {
		return false
	}
	return repo.Next != ""
}

func getAuthTokenAndCookies(u, p string) (string, []*http.Cookie, error) {
	jsonData := map[string]string{"username": u, "password": p}
	url := dockerHubURL + "/users/login/"
	jsonValue, err := json.Marshal(jsonData)
	if err != nil {
		return "", nil, err
	}

	req, err := http.NewRequest("POST", url, bytes.NewBuffer(jsonValue))
	if err != nil {
		return "", nil, err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return "", nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		err = errors.New(url +
			"\nresp.StatusCode: " + strconv.Itoa(resp.StatusCode))
		return "", nil, err
	}

	// read json http response
	jsonDataFromHttp, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", nil, err
	}

	var dAuth map[string]string

	err = json.Unmarshal([]byte(jsonDataFromHttp), &dAuth)
	if err != nil {
		return "", nil, err
	}

	return dAuth["token"], resp.Cookies(), nil
}

func getRepoTags(repoB []byte, ns, token string, cookies []*http.Cookie) ([]model.IngestedContainerImage, error) {
	var imagesWithTag []model.IngestedContainerImage
	var repo model.RegistryImages
	err := json.Unmarshal(repoB, &repo)
	if err != nil {
		return []model.IngestedContainerImage{}, err
	}
	for _, r := range repo.Results {
		imgTag, err := getRepoTag(r.Name, ns, token, cookies)
		if err != nil {
			log.Warn().Msgf("unable to fetch image tag for %s: Error: %v", r.Name, err)
			continue
		}
		imagesWithTag = append(imagesWithTag, getImageWithTags(r.Name, imgTag)...)
	}

	return imagesWithTag, nil
}

func getRepoTag(repoName, ns, token string, cookies []*http.Cookie) (ImageTag, error) {
	url := dockerHubURL + "/namespaces/" + ns + "/repositories/" + repoName + "/tags/?page_size=100"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return ImageTag{}, err
	}

	for _, c := range cookies {
		req.AddCookie(c)
	}

	req.Header.Add("Authorization", "JWT "+token)

	resp, err := client.Do(req)
	if err != nil {
		return ImageTag{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != 200 {
		err = errors.New(url +
			"\nresp.StatusCode: " + strconv.Itoa(resp.StatusCode))
		return ImageTag{}, err
	}

	repo, err := io.ReadAll(resp.Body)
	if err != nil {
		return ImageTag{}, err
	}
	var imgTag ImageTag
	err = json.Unmarshal(repo, &imgTag)
	if err != nil {
		return ImageTag{}, err
	}

	return imgTag, nil
}

func getImageWithTags(imageName string, tag ImageTag) []model.IngestedContainerImage {
	var imageAndTag []model.IngestedContainerImage
	for _, tr := range tag.Results {
		for _, i := range tr.Images {
			imageID, shortImageID := model.DigestToID(i.Digest)
			tt := model.IngestedContainerImage{
				ID:            imageID,
				DockerImageID: imageID,
				ShortImageID:  shortImageID,
				Name:          imageName,
				Tag:           tr.Name,
				Size:          fmt.Sprint(i.Size),
				Metadata: model.Metadata{
					"status":       i.Status,
					"last_pushed":  i.LastPushed.Unix(),
					"digest":       i.Digest,
					"last_updated": tr.LastUpdated.Unix(),
				},
			}
			imageAndTag = append(imageAndTag, tt)
		}
	}
	return imageAndTag
}
