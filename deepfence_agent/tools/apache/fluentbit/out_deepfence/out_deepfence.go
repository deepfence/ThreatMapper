package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"
	"unsafe"

	"C"
	"github.com/fluent/fluent-bit-go/output"

	deepfenceUtils "github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	dsc "github.com/deepfence/golang_deepfence_sdk/client"
	dschttp "github.com/deepfence/golang_deepfence_sdk/utils/http"
	rhttp "github.com/hashicorp/go-retryablehttp"
)

var (
	cfg      map[string]Config
	hc       *http.Client
	instance int = 0
)

type Config struct {
	ConsoleURL   string
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
// 			log.Printf("error marshal doc %s\ndoc:%s", err, u)
// 			continue
// 		}
// 		values[i] = "{\"value\":" + string(encoded) + "}"
// 	}
// 	result := strings.Join(values, ",")
// 	return bytes.NewBuffer([]byte("{\"records\":[" + result + "]}"))
// }

func Authenticate(url string, apiToken string) (string, string, error) {
	var (
		accessToken  string
		refreshToken string
	)
	cfg := dsc.NewConfiguration()
	cfg.HTTPClient = hc
	cfg.Servers = dsc.ServerConfigurations{
		{URL: url, Description: "deepfence_server"},
	}

	apiClient := dsc.NewAPIClient(cfg)

	req := apiClient.AuthenticationAPI.AuthToken(context.Background()).
		ModelApiAuthRequest(
			dsc.ModelApiAuthRequest{ApiToken: apiToken},
		)

	resp, _, err := apiClient.AuthenticationAPI.AuthTokenExecute(req)
	if err != nil {
		return "", "", err
	}

	accessToken = resp.GetAccessToken()
	refreshToken = resp.GetRefreshToken()
	if accessToken == "" || refreshToken == "" {
		return "", "", errors.New("auth tokens are nil: failed to authenticate")
	}

	log.Print("authenticated with console successfully")

	return accessToken, refreshToken, nil
}

func RefreshToken(url string, apiToken string) (string, string, error) {
	var (
		accessToken  string
		refreshToken string
	)
	cfg := dsc.NewConfiguration()
	cfg.HTTPClient = hc
	cfg.Servers = dsc.ServerConfigurations{
		{URL: url, Description: "deepfence_server"},
	}

	cfg.AddDefaultHeader("Authorization", "Bearer "+apiToken)

	apiClient := dsc.NewAPIClient(cfg)

	req := apiClient.AuthenticationAPI.AuthTokenRefresh(context.Background())

	resp, _, err := apiClient.AuthenticationAPI.AuthTokenRefreshExecute(req)
	if err != nil {
		return "", "", err
	}

	accessToken = resp.GetAccessToken()
	refreshToken = resp.GetRefreshToken()
	if accessToken == "" || refreshToken == "" {
		return "", "", errors.New("auth tokens are nil: failed to authenticate")
	}

	log.Print("refreshed tokens from console successfully")

	return accessToken, refreshToken, nil
}

func validateTokens(cfg Config) (Config, bool, error) {
	if !deepfenceUtils.IsJWTExpired(cfg.AccessToken) {
		return cfg, false, nil
	} else {
		var (
			access  string
			refresh string
			err     error
		)
		access, refresh, err = RefreshToken(cfg.ConsoleURL, cfg.RefreshToken)
		if err != nil {
			access, refresh, err = Authenticate(cfg.ConsoleURL, cfg.Key)
			if err != nil {
				return cfg, false, err
			}
		}
		cfg.AccessToken = access
		cfg.RefreshToken = refresh
		return cfg, true, nil
	}
}

//export FLBPluginRegister
func FLBPluginRegister(def unsafe.Pointer) int {
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	return output.FLBPluginRegister(def, "deepfence", "deepfence output plugin")
}

//export FLBPluginInit
func FLBPluginInit(plugin unsafe.Pointer) int {
	if cfg == nil {
		cfg = make(map[string]Config)
	}

	id := output.FLBPluginConfigKey(plugin, "id")
	host := output.FLBPluginConfigKey(plugin, "console_host")
	port := output.FLBPluginConfigKey(plugin, "console_port")
	path := output.FLBPluginConfigKey(plugin, "path")
	schema := output.FLBPluginConfigKey(plugin, "schema")
	apiToken := output.FLBPluginConfigKey(plugin, "token")
	certPath := output.FLBPluginConfigKey(plugin, "cert_file")
	certKey := output.FLBPluginConfigKey(plugin, "key_file")
	log.Printf("id=%s schema=%s host=%s port=%s path=%s",
		id, schema, host, port, path)

	// setup http client
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	rhc := rhttp.NewClient()
	rhc.HTTPClient.Timeout = 10 * time.Second
	rhc.RetryMax = 3
	rhc.RetryWaitMin = 1 * time.Second
	rhc.RetryWaitMax = 10 * time.Second
	rhc.CheckRetry = func(ctx context.Context, resp *http.Response, err error) (bool, error) {
		if err != nil || resp == nil {
			return false, err
		}
		if resp.StatusCode == http.StatusServiceUnavailable {
			return false, err
		}
		return rhttp.DefaultRetryPolicy(ctx, resp, err)
	}
	rhc.Logger = log.New(os.Stderr, "", log.LstdFlags|log.Lshortfile)
	if schema == "https" {
		if len(certPath) > 0 && len(certKey) > 0 {
			cer, err := tls.LoadX509KeyPair(certPath, certKey)
			if err != nil {
				log.Printf("error loading certs %s", err)
				return output.FLB_ERROR
			}
			tlsConfig.Certificates = []tls.Certificate{cer}
		}
		tr := &http.Transport{
			TLSClientConfig:   tlsConfig,
			DisableKeepAlives: false,
		}
		rhc.HTTPClient = &http.Client{Transport: tr}
	}

	hc = rhc.StandardClient()

	if dschttp.IsConsoleAgent(host) && strings.Trim(apiToken, "\"") == "" {
		internalURL := os.Getenv("MGMT_CONSOLE_URL_INTERNAL")
		internalPort := os.Getenv("MGMT_CONSOLE_PORT_INTERNAL")
		var err error
		if apiToken, err = dschttp.GetConsoleApiToken(internalURL, internalPort); err != nil {
			log.Panic(err)
		}
	}

	access, refresh, err := Authenticate(getURL(schema, host, port), apiToken)
	if err != nil {
		log.Printf("failed to authenticate %s", err)
	}

	if len(id) == 0 {
		id = "deepfence." + strconv.Itoa(instance)
		instance = instance + 1
	}

	cfg[id] = Config{
		ConsoleURL:   getURL(schema, host, port),
		URL:          getURLWithPath(schema, host, port, path),
		Key:          apiToken,
		AccessToken:  access,
		RefreshToken: refresh,
	}

	log.Printf("api token set %t for id %s", apiToken != "", id)
	log.Printf("push to url %s", cfg[id].URL)

	output.FLBPluginSetContext(plugin, id)

	return output.FLB_OK
}

//export FLBPluginFlush
func FLBPluginFlush(data unsafe.Pointer, length C.int, tag *C.char) int {
	log.Printf("flush called on unknown instance")
	return output.FLB_OK
}

//export FLBPluginFlushCtx
func FLBPluginFlushCtx(ctx, data unsafe.Pointer, length C.int, tag *C.char) int {
	id := output.FLBPluginGetContext(ctx).(string)
	idCfg, ok := cfg[id]
	if !ok {
		log.Printf("push to unknown id topic %s", id)
		return output.FLB_ERROR
	}

	newConfig, changed, err := validateTokens(idCfg)
	if err != nil {
		log.Print(err.Error())
		return output.FLB_ERROR
	}
	if changed {
		idCfg = newConfig
		cfg[id] = newConfig
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

	rawRecords, err := json.Marshal(records)
	if err != nil {
		log.Printf("error marshaling records: %s", err)
		return output.FLB_ERROR
	}

	req, err := http.NewRequest(http.MethodPost, idCfg.URL, bytes.NewReader(rawRecords))
	if err != nil {
		log.Printf("error creating request %s", err)
		return output.FLB_ERROR
	}

	req.Header.Add("Authorization", "Bearer "+idCfg.AccessToken)
	req.Header.Add("Content-Type", "application/json")

	resp, err := hc.Do(req)
	if err != nil {
		if os.IsTimeout(err) {
			// timeout error
			log.Printf(" retry request timeout error: %s", err)
			return output.FLB_RETRY
		}
		log.Printf(" error making request %s", err)
		return output.FLB_ERROR
	}

	defer resp.Body.Close()

	if resp.StatusCode == http.StatusBadGateway ||
		resp.StatusCode == http.StatusServiceUnavailable ||
		resp.StatusCode == http.StatusGatewayTimeout ||
		resp.StatusCode == http.StatusTooManyRequests ||
		resp.StatusCode == http.StatusUnauthorized {
		log.Printf("retry response code %s", resp.Status)
		return output.FLB_RETRY
	} else if resp.StatusCode != http.StatusOK {
		log.Printf("error response code %s", resp.Status)
		return output.FLB_ERROR
	}

	_, err = io.ReadAll(resp.Body)
	if err != nil {
		log.Printf("error reading response %s", err)
		return output.FLB_ERROR
	}

	return output.FLB_OK
}

//export FLBPluginExit
func FLBPluginExit() int {
	log.Printf("exit called on unknown instance")
	return output.FLB_OK
}

//export FLBPluginExitCtx
func FLBPluginExitCtx(ctx unsafe.Pointer) int {
	id := output.FLBPluginGetContext(ctx).(string)
	_, ok := cfg[id]
	if !ok {
		log.Printf("exit called on unknown id topic %s", id)
		return output.FLB_ERROR
	}
	log.Printf("exit called on id topic %s", id)
	return output.FLB_OK
}

//export FLBPluginUnregister
func FLBPluginUnregister(ctx unsafe.Pointer) {
	log.Print("unregister called")
	output.FLBPluginUnregister(ctx)
}

func main() {}
