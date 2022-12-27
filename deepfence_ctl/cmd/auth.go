package cmd

import (
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	oahttp "github.com/deepfence/ThreatMapper/deepfence_utils/http"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

const (
	tokens_filename = "tokens"
)

var (
	api_token string
)

type AuthTokens struct {
	AccessToken  string
	RefreshToken string
}

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Authenticate",
	Long:  `This subcommand authenticate with remote server`,
	Run: func(cmd *cobra.Command, args []string) {
		api_token, _ := cmd.Flags().GetString("api-token")
		if api_token == "" {
			log.Fatal().Msg("Please provide an api-token")
		}

		https_client := oahttp.NewHttpsConsoleClient(console_ip, "443")
		err := https_client.APITokenAuthenticate(api_token)
		if err != nil {
			log.Fatal().Msgf("Failed to authenticate %v\n", err)
		}

		access, refresh := https_client.DumpTokens()
		tokens := AuthTokens{
			AccessToken:  access,
			RefreshToken: refresh,
		}

		b, err := json.Marshal(tokens)
		if err != nil {
			log.Fatal().Msgf("Failed to authenticate %v\n", err)
		}

		err = os.WriteFile(fmt.Sprintf("%s/%s", os.TempDir(), tokens_filename), b, 0600)
		if err != nil {
			log.Fatal().Msgf("Failed to authenticate %v\n", err)
		}

		log.Info().Msgf("Successful login")
	},
}

func inject_tokens(cl *oahttp.OpenapiHttpClient) error {
	b, err := os.ReadFile(fmt.Sprintf("%s/%s", os.TempDir(), tokens_filename))
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

func init() {
	rootCmd.AddCommand(authCmd)

	authCmd.PersistentFlags().String("api-token", "", "Deepfence console API token")
}
