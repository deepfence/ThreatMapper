package cmd

import (
	"log"
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/spf13/cobra"
)

var (
	console_ip string
)

var (
	rootCmd = &cobra.Command{
		Use:   "deepfencectl",
		Short: "A deepfence controller CLI",
		Long:  `A simple CLI alternative to deepfence UI`,
	}
)

func Execute() {
	err := rootCmd.Execute()
	if err != nil {
		os.Exit(1)
	}
}

func init() {
	console_ip = os.Getenv("DEEPFENCE_URL")
	if console_ip == "" {
		log.Fatal("DEEPFENCE_URL not specified. Please provie Console IP.")
	}
	http.InjectConsoleIp(console_ip)
}
