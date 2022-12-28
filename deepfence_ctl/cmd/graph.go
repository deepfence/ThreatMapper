package cmd

import (
	"context"
	"strings"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_ctl/output"
	"github.com/deepfence/ThreatMapper/deepfence_server_client"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var graphCmd = &cobra.Command{
	Use:   "graph",
	Short: "Graph control",
	Long:  `This subcommand controls graph with remote server`,
}

var graphTopologySubCmd = &cobra.Command{
	Use:   "topology",
	Short: "Get Topology graph",
	Long:  `This subcommand retrieve the topology graph`,
	Run: func(cmd *cobra.Command, args []string) {
		host_filter, _ := cmd.Flags().GetString("host-filter")
		host_entries := strings.Split(host_filter, ",")

		region_filter, _ := cmd.Flags().GetString("region-filter")
		region_entries := strings.Split(region_filter, ",")

		provider_filter, _ := cmd.Flags().GetString("provider-filter")
		provider_entries := strings.Split(provider_filter, ",")

		req := http.Client().TopologyApi.GetTopologyGraph(context.Background())
		req.ReportersTopologyFilters(deepfence_server_client.ReportersTopologyFilters{
			CloudFilter:  provider_entries,
			HostFilter:   host_entries,
			RegionFilter: region_entries,
		})
		res, rh, err := http.Client().TopologyApi.GetTopologyGraphExecute(req)

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
		}
		output.Out(res)
	},
}

var graphThreatSubCmd = &cobra.Command{
	Use:   "threat",
	Short: "Get Threat graph",
	Long:  `This subcommand retrieve the threat graph`,
	Run: func(cmd *cobra.Command, args []string) {
		req := http.Client().ThreatApi.GetThreatGraph(context.Background())
		res, rh, err := http.Client().ThreatApi.GetThreatGraphExecute(req)

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
		}
		output.Out(res)
	},
}

func init() {
	rootCmd.AddCommand(graphCmd)
	graphCmd.AddCommand(graphTopologySubCmd)

	graphTopologySubCmd.PersistentFlags().String("host-filter", "", "CSV host fileter")
	graphTopologySubCmd.PersistentFlags().String("region-filter", "", "CSV host fileter")
	graphTopologySubCmd.PersistentFlags().String("provider-filter", "", "CSV host fileter")

	graphCmd.AddCommand(graphThreatSubCmd)
}
