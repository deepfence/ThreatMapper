package main

import (
	"C"
	"crypto/x509"
	"unsafe"

	"github.com/fluent/fluent-bit-go/output"
)
import (
	"context"
	"crypto/tls"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"time"

	deepfenceAPI "github.com/deepfence/ThreatMapper/deepfence_server_client"
	rhttp "github.com/hashicorp/go-retryablehttp"
)

var (
	cfg      map[string]Config
	hc           = rhttp.NewClient()
	instance int = 0
)

type Config struct {
	URL          string
	Key          string
	AccessToken  string
	RefreshToken string
}

func getURLWithPath(schema, host, port, path string) string {
	u := &url.URL{
		Scheme: schema,
		Host:   net.JoinHostPort(host, port),
		Path:   path,
	}
	return u.String()
}

func getURL(schema, host, port string) string {
	u := &url.URL{
		Scheme: schema,
		Host:   net.JoinHostPort(host, port),
	}
	return u.String()
}

func toMapStringInterface(inputRecord map[interface{}]interface{}) map[string]interface{} {
	return parseValue(inputRecord).(map[string]interface{})
}

func parseValue(value interface{}) interface{} {
	switch value := value.(type) {
	case []byte:
		return string(value)
	case map[interface{}]interface{}:
		remapped := make(map[string]interface{})
		for k, v := range value {
			remapped[k.(string)] = parseValue(v)
		}
		return remapped
	case []interface{}:
		remapped := make([]interface{}, len(value))
		for i, v := range value {
			remapped[i] = parseValue(v)
		}
		return remapped
	default:
		return value
	}
}

// // data needs to be in this format
// // {"records":[{"value":<record1>},{"value":record2}]}
// func toKafkaRestFormat(data []map[string]interface{}) *bytes.Buffer {
// 	values := make([]string, len(data))
// 	for i, u := range data {
// 		encoded, err := json.Marshal(u)
// 		if err != nil {
// 			log.Printf("[deepfence] error marshal doc %s\ndoc:%s", err, u)
// 			continue
// 		}
// 		values[i] = "{\"value\":" + string(encoded) + "}"
// 	}
// 	result := strings.Join(values, ",")
// 	return bytes.NewBuffer([]byte("{\"records\":[" + result + "]}"))
// }

func Authenticate(url string, apiToken string) (string, string, error) {
	var (
		accessToken  *string
		refreshToken *string
	)
	cfg := deepfenceAPI.NewConfiguration()
	cfg.Servers = deepfenceAPI.ServerConfigurations{
		{URL: url, Description: "deepfence_server"},
	}

	apiClient := deepfenceAPI.NewAPIClient(cfg)

	req := apiClient.AuthenticationApi.AuthToken(context.Background()).
		ModelApiAuthRequest(
			deepfenceAPI.ModelApiAuthRequest{ApiToken: &apiToken},
		)

	resp, _, err := apiClient.AuthenticationApi.AuthTokenExecute(req)
	if err != nil {
		return "", "", err
	}

	accessToken = resp.GetData().AccessToken
	refreshToken = resp.GetData().RefreshToken
	if accessToken == nil || refreshToken == nil {
		return "", "", errors.New("auth tokens are nil: failed to authenticate")
	}

	return *accessToken, *refreshToken, nil
}

//export FLBPluginRegister
func FLBPluginRegister(def unsafe.Pointer) int {
	return output.FLBPluginRegister(def, "deepfence", "deepfence output plugin")
}

//export FLBPluginInit
func FLBPluginInit(plugin unsafe.Pointer) int {
	if cfg == nil {
		cfg = make(map[string]Config)
	}

	id := output.FLBPluginConfigKey(plugin, "id")
	host := output.FLBPluginConfigKey(plugin, "host")
	port := output.FLBPluginConfigKey(plugin, "port")
	path := output.FLBPluginConfigKey(plugin, "path")
	schema := output.FLBPluginConfigKey(plugin, "schema")
	apiToken := output.FLBPluginConfigKey(plugin, "api_token")
	certPath := output.FLBPluginConfigKey(plugin, "cert_file")
	certKey := output.FLBPluginConfigKey(plugin, "key_file")
	log.Printf("[deepfence] schema=%s host=%s port=%s path=%s",
		schema, host, port, path)

	// setup http client
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	hc.HTTPClient.Timeout = 10 * time.Second
	hc.RetryMax = 3
	hc.RetryWaitMin = 1 * time.Second
	hc.RetryWaitMax = 10 * time.Second
	hc.Logger = nil
	if schema == "https" {
		if len(certPath) > 0 && len(certKey) > 0 {
			cer, err := tls.LoadX509KeyPair(certPath, certKey)
			if err != nil {
				log.Printf("[deepfence] error loading certs %s", err)
				return output.FLB_ERROR
			}
			tlsConfig.Certificates = []tls.Certificate{cer}
		}
		tr := &http.Transport{
			TLSClientConfig:   tlsConfig,
			DisableKeepAlives: false,
		}
		hc.HTTPClient = &http.Client{Transport: tr}
	}

	access, refresh, err := Authenticate(getURL(schema, host, port), apiToken)
	if err != nil {
		log.Printf("[deepfence] failed to authenticate %s", err)
	}

	if len(id) == 0 {
		id = "deepfence." + strconv.Itoa(instance)
		instance = instance + 1
	}

	cfg[id] = Config{
		URL:          getURLWithPath(schema, host, port, path),
		Key:          apiToken,
		AccessToken:  access,
		RefreshToken: refresh,
	}

	log.Printf("[deepfence] api token set %t for id %s", apiToken != "", id)
	log.Printf("[deepfence] push to url %s", cfg[id].URL)

	output.FLBPluginSetContext(plugin, id)

	return output.FLB_OK
}

//export FLBPluginFlush
func FLBPluginFlush(data unsafe.Pointer, length C.int, tag *C.char) int {
	log.Printf("[deepfence] flush called on unknown instance")
	return output.FLB_OK
}

//export FLBPluginFlushCtx
func FLBPluginFlushCtx(ctx, data unsafe.Pointer, length C.int, tag *C.char) int {
	id := output.FLBPluginGetContext(ctx).(string)
	idCfg, ok := cfg[id]
	if !ok {
		log.Printf("[deepfence] push to unknown id topic %s", id)
		return output.FLB_ERROR
	}

	// fluent-bit decoder
	dec := output.NewDecoder(data, int(length))

	records := make([]map[string]interface{}, 0)

	for {
		ret, _, record := output.GetRecord(dec)
		if ret != 0 {
			break
		}
		records = append(records, toMapStringInterface(record))
	}

	req, err := rhttp.NewRequest(http.MethodPost, idCfg.URL, records)
	if err != nil {
		log.Printf("[deepfence] error creating request %s", err)
		return output.FLB_ERROR
	}

	req.Header.Add("Authorization", "Bearer "+idCfg.AccessToken)
	req.Header.Add("Content-Type", "application/json")

	resp, err := hc.Do(req)
	if err != nil {
		if os.IsTimeout(err) {
			// timeout error
			log.Printf("[deepfence] retry request timeout error: %s", err)
			return output.FLB_RETRY
		}
		log.Printf("[deepfence] error making request %s", err)
		return output.FLB_ERROR
	}

	defer resp.Body.Close()

	if resp.StatusCode == http.StatusBadGateway || resp.StatusCode == http.StatusServiceUnavailable ||
		resp.StatusCode == http.StatusGatewayTimeout || resp.StatusCode == http.StatusTooManyRequests {
		log.Printf("[deepfence] retry response code %s", resp.Status)
		return output.FLB_RETRY
	} else if resp.StatusCode != http.StatusOK {
		log.Printf("[deepfence] error response code %s", resp.Status)
		return output.FLB_ERROR
	}

	_, err = io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("[deepfence] error reading response %s", err)
		return output.FLB_ERROR
	}

	return output.FLB_OK
}

//export FLBPluginExit
func FLBPluginExit() int {
	log.Printf("[deepfence] exit called on unknown instance")
	return output.FLB_OK
}

//export FLBPluginExitCtx
func FLBPluginExitCtx(ctx unsafe.Pointer) int {
	id := output.FLBPluginGetContext(ctx).(string)
	_, ok := cfg[id]
	if !ok {
		log.Printf("[deepfence] exit called on unknown id topic %s", id)
		return output.FLB_ERROR
	}
	log.Printf("[deepfence] exit called on id topic %s", id)
	return output.FLB_OK
}

func main() {}
