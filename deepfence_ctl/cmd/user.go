package cmd

import (
	"context"
	"encoding/json"
	"fmt"
	"os"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_ctl/output"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
	oahttp "github.com/deepfence/golang_deepfence_sdk/utils/http"
)

var userCmd = &cobra.Command{
	Use:   "user",
	Short: "User control",
	Long:  `This subcommand controls user with remote server`,
}

var userRegisterSubCmd = &cobra.Command{
	Use:   "register",
	Short: "User register",
	Long:  `This subcommand registers new user with remote server`,
	Run: func(cmd *cobra.Command, args []string) {
		first_name, _ := cmd.Flags().GetString("first-name")
		if first_name == "" {
			log.Fatal().Msg("Please provide a first-name")
		}

		last_name, _ := cmd.Flags().GetString("last-name")
		if last_name == "" {
			log.Fatal().Msg("Please provide a last-name")
		}

		email, _ := cmd.Flags().GetString("email")
		if email == "" {
			log.Fatal().Msg("Please provide an email")
		}

		password, _ := cmd.Flags().GetString("password")
		if password == "" {
			log.Fatal().Msg("Please provide a password")
		}

		company, _ := cmd.Flags().GetString("company")
		if company == "" {
			log.Fatal().Msg("Please provide a company")
		}

		empty := false
		consoleUrl := "https://" + console_ip
		https_client := oahttp.NewHttpsConsoleClient(console_ip, "443")
		req := https_client.Client().UserAPI.RegisterUser(context.Background())
		req = req.ModelUserRegisterRequest(deepfence_server_client.ModelUserRegisterRequest{
			Company:             company,
			ConsoleUrl:          consoleUrl,
			Email:               email,
			FirstName:           first_name,
			IsTemporaryPassword: &empty,
			LastName:            last_name,
			Password:            password,
		})

		res, hr, err := https_client.Client().UserAPI.RegisterUserExecute(req)
		if err != nil {
			log.Fatal().Msgf("Failed to register %v: %v\n", err, hr)
		}

		tokens := http.AuthTokens{
			AccessToken:  res.AccessToken,
			RefreshToken: res.RefreshToken,
		}

		b, err := json.Marshal(tokens)
		if err != nil {
			log.Fatal().Msgf("Failed to marshal register tokens %v\n", err)
		}

		err = os.WriteFile(fmt.Sprintf("%s/%s", os.TempDir(), http.TokensFilename), b, 0600)
		if err != nil {
			log.Fatal().Msgf("Failed to save register tokens %v\n", err)
		}

		output.Out(map[string]string{"status": "success"})
	},
}

var userApiKeySubCmd = &cobra.Command{
	Use:   "apikey",
	Short: "User apikey",
	Long:  `This subcommand retrieve a new user apikey`,
	Run: func(cmd *cobra.Command, args []string) {
		req := http.Client().UserAPI.GetApiTokens(context.Background())
		res, rh, err := http.Client().UserAPI.GetApiTokensExecute(req)
		if err != nil {
			log.Fatal().Msgf("Failed to retrieve apikey %v: %v\n", err, rh)
		}
		output.Out(res)
	},
}

func init() {
	rootCmd.AddCommand(userCmd)
	userCmd.AddCommand(userRegisterSubCmd)
	userCmd.AddCommand(userApiKeySubCmd)

	userRegisterSubCmd.PersistentFlags().String("email", "", "User email")
	userRegisterSubCmd.PersistentFlags().String("first-name", "", "User's first name")
	userRegisterSubCmd.PersistentFlags().String("last-name", "", "User's last name")
	userRegisterSubCmd.PersistentFlags().String("password", "", "User's password")
	userRegisterSubCmd.PersistentFlags().String("company", "", "User's company")
}
