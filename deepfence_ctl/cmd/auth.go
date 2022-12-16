package cmd

import (
	"log"

	"github.com/spf13/cobra"
)

var (
	apitoken string
	usrname  string
	passwd   string
)

var authCmd = &cobra.Command{
	Use:   "auth",
	Short: "Authenticate",
	Long:  `This subcommand authenticate with remote server`,
	Run: func(cmd *cobra.Command, args []string) {
		apitoken, _ := cmd.Flags().GetString("api-token")
		if apitoken == "" {
			log.Fatal("Please provide an api-token")
		}
	},
}

func init() {
	rootCmd.AddCommand(authCmd)

	authCmd.PersistentFlags().String("api-token", "", "Deepfence console API token")
}
