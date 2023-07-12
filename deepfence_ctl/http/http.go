package http

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
	oahttp "github.com/deepfence/golang_deepfence_sdk/utils/http"
)

const (
	TokensFilename = "tokens"
)

var (
	https_client *oahttp.OpenapiHttpClient
	console_ip   string
)

type AuthTokens struct {
	AccessToken  string
	RefreshToken string
}

// Not thread safe
func Client() *deepfence_server_client.APIClient {
	if https_client == nil {
		init_https_client()
	}
	return https_client.Client()
}

func init_https_client() {
	https_client = oahttp.NewHttpsConsoleClient(console_ip, "443")
	err := inject_tokens(https_client)
	if err != nil {
		log.Fatal().Msgf("Client not authenticated: %v\n", err)
	}
}

func inject_tokens(cl *oahttp.OpenapiHttpClient) error {
	b, err := os.ReadFile(fmt.Sprintf("%s/%s", os.TempDir(), TokensFilename))
	if err != nil {
		return err
	}

	var tokens AuthTokens
	err = json.Unmarshal(b, &tokens)
	if err != nil {
		return err
	}

	cl.SetTokens(tokens.AccessToken, tokens.RefreshToken)
	return nil
}

func InjectConsoleIp(ip string) {
	console_ip = ip
}
