package cmd

import (
	"context"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
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

var agentEnableSubCmd = &cobra.Command{
	Use:   "enable",
	Short: "Enable agent plugin",
	Long:  `This subcommand triggers an enable/upgrade on agent`,
	Run: func(cmd *cobra.Command, args []string) {
		node_ids, _ := cmd.Flags().GetString("node-ids")
		if node_ids == "" {
			log.Fatal().Msg("Please provide some ids")
		}

		version, _ := cmd.Flags().GetString("version")
		if node_ids == "" {
			log.Fatal().Msg("Please provide a version")
		}

		plugin_name, _ := cmd.Flags().GetString("plugin")
		if node_ids == "" {
			log.Fatal().Msg("Please provide a plugin")
		}

		var err error
		req := http.Client().ControlsAPI.EnableAgentPlugin(context.Background())
		req = req.ModelAgentPluginEnable(deepfence_server_client.ModelAgentPluginEnable{
			NodeId:     node_ids,
			Version:    version,
			PluginName: plugin_name,
		})
		_, err = http.Client().ControlsAPI.EnableAgentPluginExecute(req)

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
	},
}

var agentDisableSubCmd = &cobra.Command{
	Use:   "disable",
	Short: "Disable agent plugin",
	Long:  `This subcommand disable a plugin on agent`,
	Run: func(cmd *cobra.Command, args []string) {
		node_ids, _ := cmd.Flags().GetString("node-ids")
		if node_ids == "" {
			log.Fatal().Msg("Please provide some ids")
		}

		plugin_name, _ := cmd.Flags().GetString("plugin")
		if node_ids == "" {
			log.Fatal().Msg("Please provide a plugin")
		}

		var err error
		req := http.Client().ControlsAPI.DisableAgentPlugin(context.Background())
		req = req.ModelAgentPluginDisable(deepfence_server_client.ModelAgentPluginDisable{
			NodeId:     node_ids,
			PluginName: plugin_name,
		})
		_, err = http.Client().ControlsAPI.DisableAgentPluginExecute(req)

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
	},
}

func init() {
	rootCmd.AddCommand(agentCmd)
	agentCmd.AddCommand(agentUpgradeSubCmd)
	agentCmd.AddCommand(agentEnableSubCmd)
	agentCmd.AddCommand(agentDisableSubCmd)

	agentUpgradeSubCmd.PersistentFlags().String("node-ids", "", "Agent IDs")
	agentUpgradeSubCmd.PersistentFlags().String("version", "", "Agent version to upgrade to")

	agentEnableSubCmd.PersistentFlags().String("node-ids", "", "Agent IDs")
	agentEnableSubCmd.PersistentFlags().String("version", "", "Agent version to upgrade to")
	agentEnableSubCmd.PersistentFlags().String("plugin", "", "Agent plugin to enable")

	agentDisableSubCmd.PersistentFlags().String("node-ids", "", "Agent IDs")
	agentDisableSubCmd.PersistentFlags().String("plugin", "", "Agent plugin to disable")

}
