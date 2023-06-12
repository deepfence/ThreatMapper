package cmd

import (
	"context"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

var agentCmd = &cobra.Command{
	Use:   "agent",
	Short: "agent control",
	Long:  `This subcommand controls agent`,
}

var agentUpgradeSubCmd = &cobra.Command{
	Use:   "upgrade",
	Short: "Upgrade agent",
	Long:  `This subcommand triggers an upgrade on agent`,
	Run: func(cmd *cobra.Command, args []string) {
		node_ids, _ := cmd.Flags().GetString("node-ids")
		if node_ids == "" {
			log.Fatal().Msg("Please provide some ids")
		}

		version, _ := cmd.Flags().GetString("version")
		if node_ids == "" {
			log.Fatal().Msg("Please provide a version")
		}

		var err error
		req := http.Client().ControlsAPI.UpgradeAgentVersion(context.Background())
		req = req.ModelAgentUpgrade(deepfence_server_client.ModelAgentUpgrade{
			NodeId:  node_ids,
			Version: version,
		})
		_, err = http.Client().ControlsAPI.UpgradeAgentVersionExecute(req)

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
	},
}

func init() {
	rootCmd.AddCommand(agentCmd)
	agentCmd.AddCommand(agentUpgradeSubCmd)

	agentUpgradeSubCmd.PersistentFlags().String("node-ids", "", "Agent IDs")
	agentUpgradeSubCmd.PersistentFlags().String("version", "", "Agent version to upgrade to")
}
