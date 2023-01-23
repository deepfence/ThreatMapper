package dockerhub

import (
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

func getImagesList(u, p, ns string) ([]byte, error) {
	// log.Info().Msgf("creds: %s, %s, %s", u, p, ns)
	token, cookies, err := getAuthTokenAndCookies(u, p)
	if err != nil {
		return nil, err
	}
	// log.Info().Msgf("token: %s", token)

	url := dockerHubURL + "/repositories/" + ns + "/?page_size=100"
	req, err := http.NewRequest("GET", url, nil)
	if err != nil {
		return nil, err
	}

	for _, v := range cookies {
		// log.Info().Msgf("creds: %+v", v)
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

	return io.ReadAll(resp.Body)

}

func getAuthTokenAndCookies(u, p string) (string, []*http.Cookie, error) {
	jsonData := map[string]string{"username": u, "password": p}
	// log.Info().Msgf("getauthtoken creds : %s %s", u, p)
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
