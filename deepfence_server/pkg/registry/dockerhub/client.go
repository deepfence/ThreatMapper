package dockerhub

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_server/model"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

// func getClient(u, p string) (*http.Client, error) {

// }
func getImagesList(u, p, ns string) ([]model.ImageAndTag, error) {
	token, cookies, err := getAuthTokenAndCookies(u, p)
	if err != nil {
		return nil, err
	}

	url := dockerHubURL + "/repositories/" + ns + "/?page_size=100"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	for _, v := range cookies {
		req.AddCookie(v)
	}

	req.Header.Add("Authorization", "JWT "+token)

	client := &http.Client{}
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
	log.Info().Msgf("respo: %+v", resp)

	repo, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}
	repoWithTags, err := getRepoTags(repo, ns, token, cookies)
	if err != nil {
		return nil, err
	}
	return repoWithTags, err

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

	client := &http.Client{}
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
	// log.Info().Msgf("getauthtoken : %s", string(jsonDataFromHttp))

	var dAuth map[string]string

	err = json.Unmarshal([]byte(jsonDataFromHttp), &dAuth)
	if err != nil {
		return "", nil, err
	}

	return dAuth["token"], resp.Cookies(), nil
}

// func getImageWithTags(repoB []byte, ns, token string, cookies []*http.Cookie) {
// 	getRepoTags(repoB, ns, token, cookies)
// }

func getRepoTags(repoB []byte, ns, token string, cookies []*http.Cookie) ([]model.ImageAndTag, error) {
	var imagesWithTag []model.ImageAndTag
	var repo model.RegistryImages
	err := json.Unmarshal(repoB, &repo)
	if err != nil {
		return []model.ImageAndTag{}, err
	}
	for _, r := range repo.Results {
		imgTag, err := getRepoTag(r.Name, ns, token, cookies)
		if err != nil {
			log.Warn().Msgf("unable to fetch image tag for %s: Error: %v", r.Name, err)
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

	client := &http.Client{}
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
	log.Info().Msgf("respo: %+v", resp)

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

func getImageWithTags(imageName string, tag ImageTag) []model.ImageAndTag {
	var imageAndTag []model.ImageAndTag
	for _, tr := range tag.Results {
		for _, i := range tr.Images {
			tt := model.ImageAndTag{
				Name:                imageName,
				Architecture:        i.Architecture,
				Os:                  i.Os,
				Size:                i.Size,
				Status:              i.Status,
				LastPulled:          i.LastPushed,
				LastPushed:          i.LastPushed,
				Digest:              i.Digest,
				Tag:                 tr.Name,
				LastUpdated:         tr.LastUpdated,
				LastUpdaterUsername: tr.LastUpdaterUsername,
				FullSize:            tr.FullSize,
				V2:                  tr.V2,
				TagStatus:           tr.TagStatus,
				TagLastPulled:       tr.TagLastPulled,
				TagLastPushed:       tr.TagLastPushed,
				MediaType:           tr.MediaType,
				ContentType:         tr.ContentType,
			}
			imageAndTag = append(imageAndTag, tt)
		}
	}
	return imageAndTag
}

// image {
// 	name: asda
// 	tag: latest
// }
