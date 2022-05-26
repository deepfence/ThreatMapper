package main

import (
	"C"
	"crypto/x509"
	"unsafe"

	"github.com/fluent/fluent-bit-go/output"
)
import (
	"bytes"
	"crypto/tls"
	"encoding/json"
	"io/ioutil"
	"log"
	"net"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

	rhttp "github.com/hashicorp/go-retryablehttp"
)

var (
	cfg      map[string]Config
	client       = rhttp.NewClient()
	instance int = 0
)

type Config struct {
	URL string
	Key string
}

func getURL(schema, host, port, path, topic string) string {
	u := &url.URL{
		Scheme: schema,
		Host:   net.JoinHostPort(host, port),
		Path:   path + "/topics/" + topic,
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

// data needs to be in this format
// {"records":[{"value":<record1>},{"value":record2}]}
func toKafkaRestFormat(data []map[string]interface{}) *bytes.Buffer {
	values := make([]string, len(data))
	for i, u := range data {
		encoded, err := json.Marshal(u)
		if err != nil {
			log.Printf("[deepfence] error marshal doc %s\ndoc:%s", err, u)
			continue
		}
		values[i] = "{\"value\":" + string(encoded) + "}"
	}
	result := strings.Join(values, ",")
	return bytes.NewBuffer([]byte("{\"records\":[" + result + "]}"))
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

	host := output.FLBPluginConfigKey(plugin, "dfhost")
	port := output.FLBPluginConfigKey(plugin, "dfport")
	path := output.FLBPluginConfigKey(plugin, "dfpath")
	topic := output.FLBPluginConfigKey(plugin, "dftopic")
	schema := output.FLBPluginConfigKey(plugin, "dfschema")
	key := output.FLBPluginConfigKey(plugin, "dfkey")
	certPath := output.FLBPluginConfigKey(plugin, "dfcertpath")
	certKey := output.FLBPluginConfigKey(plugin, "dfcertkey")
	log.Printf("[deepfence] schema=%s host=%s port=%s path=%s topic=%s plugin=%s",
		schema, host, port, path, topic, certPath)

	// setup http client
	tlsConfig := &tls.Config{RootCAs: x509.NewCertPool(), InsecureSkipVerify: true}
	client.HTTPClient.Timeout = 10 * time.Second
	client.RetryMax = 3
	client.RetryWaitMin = 1 * time.Second
	client.RetryWaitMax = 10 * time.Second
	client.Logger = nil
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
		client.HTTPClient = &http.Client{Transport: tr}
	}

	id := topic + "." + strconv.Itoa(instance)
	cfg[id] = Config{
		URL: getURL(schema, host, port, path, topic),
		Key: key,
	}
	log.Printf("[deepfence] deepfence key set %t for id %s", key != "", id)
	log.Printf("[deepfence] push to url %s", cfg[id].URL)
	output.FLBPluginSetContext(plugin, id)

	instance = instance + 1
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

	// fluentbit decoder
	dec := output.NewDecoder(data, int(length))

	records := make([]map[string]interface{}, 0)

	for {
		ret, _, record := output.GetRecord(dec)
		if ret != 0 {
			break
		}
		records = append(records, toMapStringInterface(record))
	}

	req, err := rhttp.NewRequest(http.MethodPost, idCfg.URL, toKafkaRestFormat(records))
	if err != nil {
		log.Printf("[deepfence] error creating request %s", err)
		return output.FLB_ERROR
	}
	if idCfg.Key != "" {
		req.Header.Add("deepfence-key", idCfg.Key)
	}
	req.Header.Add("Content-Type", "application/vnd.kafka.json.v2+json")

	resp, err := client.Do(req)
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

	_, err = ioutil.ReadAll(resp.Body)
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

func main() {
}
