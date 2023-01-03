package cmd

import (
	"context"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_ctl/output"
	"github.com/deepfence/ThreatMapper/deepfence_server_client"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var scanCmd = &cobra.Command{
	Use:   "scan",
	Short: "Scan control",
	Long:  `This subcommand controls scan with remote server`,
}

var scanStartSubCmd = &cobra.Command{
	Use:   "start",
	Short: "Start scan",
	Long:  `This subcommand triggers a scan remote server`,
	Run: func(cmd *cobra.Command, args []string) {
		scan_type, _ := cmd.Flags().GetString("type")
		if scan_type == "" {
			log.Fatal().Msg("Please provide an type")
		}

		scan_node_id, _ := cmd.Flags().GetString("node-id")
		if scan_node_id == "" {
			log.Fatal().Msg("Please provide a node-id")
		}

		resource_id, _ := cmd.Flags().GetString("resource-id")
		if resource_id == "" {
			log.Fatal().Msg("Please provide a reousrce-id")
		}

		resource_type, _ := cmd.Flags().GetString("resource-type")
		res_type := ctl.StringToResourceType(resource_type)
		if res_type == -1 {
			log.Fatal().Msg("Please provide a valid resource-type")
		}

		var err error
		var res *deepfence_server_client.ModelScanTriggerResp
		switch scan_type {
		case "secret":
			req := http.Client().SecretScanApi.StartSecretScan(context.Background())
			req = req.ModelScanTriggerReq(
				deepfence_server_client.ModelScanTriggerReq{
					NodeId:       scan_node_id,
					ResourceId:   resource_id,
					ResourceType: resource_type,
				})
			res, _, err = http.Client().SecretScanApi.StartSecretScanExecute(req)
		default:
			log.Fatal().Msg("Unsupported")
		}

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
		output.Out(res)
	},
}

var scanStatusSubCmd = &cobra.Command{
	Use:   "status",
	Short: "Get scan status",
	Long:  `This subcommand retrieve a scan status`,
	Run: func(cmd *cobra.Command, args []string) {
		scan_type, _ := cmd.Flags().GetString("type")
		if scan_type == "" {
			log.Fatal().Msg("Please provide an type")
		}

		scan_id, _ := cmd.Flags().GetString("scan-id")
		if scan_id == "" {
			log.Fatal().Msg("Please provide a scan-id")
		}

		var err error
		var res *deepfence_server_client.ModelScanStatusResp
		switch scan_type {
		case "secret":
			req := http.Client().SecretScanApi.StatusSecretScan(context.Background())
			req = req.ScanId(scan_id)
			res, _, err = http.Client().SecretScanApi.StatusSecretScanExecute(req)
		default:
			log.Fatal().Msg("Unsupported")
		}

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
		output.Out(res)
	},
}

var scanListSubCmd = &cobra.Command{
	Use:   "list",
	Short: "Get scan list",
	Long:  `This subcommand retrieve list for a host`,
	Run: func(cmd *cobra.Command, args []string) {
		scan_type, _ := cmd.Flags().GetString("type")
		if scan_type == "" {
			log.Fatal().Msg("Please provide an type")
		}

		node_id, _ := cmd.Flags().GetString("node-id")
		if node_id == "" {
			log.Fatal().Msg("Please provide a node-id")
		}

		var err error
		var res *deepfence_server_client.ModelScanListResp
		switch scan_type {
		case "secret":
			req := http.Client().SecretScanApi.ListSecretScan(context.Background())
			req = req.ModelScanListReq(deepfence_server_client.ModelScanListReq{
				NodeId: node_id,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().SecretScanApi.ListSecretScanExecute(req)
		default:
			log.Fatal().Msg("Unsupported")
		}

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
		output.Out(res)
	},
}

var scanResultsSubCmd = &cobra.Command{
	Use:   "results",
	Short: "Get scan results",
	Long:  `This subcommand retrieve results from a scan`,
	Run: func(cmd *cobra.Command, args []string) {
		scan_type, _ := cmd.Flags().GetString("type")
		if scan_type == "" {
			log.Fatal().Msg("Please provide an type")
		}

		scan_id, _ := cmd.Flags().GetString("scan-id")
		if scan_id == "" {
			log.Fatal().Msg("Please provide a node-id")
		}

		var err error
		var res *deepfence_server_client.ModelScanResultsResp
		switch scan_type {
		case "secret":
			req := http.Client().SecretScanApi.ResultsSecretScan(context.Background())
			req = req.ModelScanResultsReq(deepfence_server_client.ModelScanResultsReq{
				ScanId: scan_id,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().SecretScanApi.ResultsSecretScanExecute(req)
		default:
			log.Fatal().Msg("Unsupported")
		}

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
		output.Out(res)
	},
}

func init() {
	rootCmd.AddCommand(scanCmd)
	scanCmd.AddCommand(scanStartSubCmd)
	scanCmd.AddCommand(scanStatusSubCmd)
	scanCmd.AddCommand(scanListSubCmd)
	scanCmd.AddCommand(scanResultsSubCmd)

	scanCmd.PersistentFlags().String("type", "", "Scan type")

	scanStartSubCmd.PersistentFlags().String("node-id", "", "Node id")
	scanStartSubCmd.PersistentFlags().String("resource-id", "", "Resource id")
	scanStartSubCmd.PersistentFlags().String("resource-type", "", "Resource type (host, container, image)")

	scanStatusSubCmd.PersistentFlags().String("scan-id", "", "Scan id")

	scanListSubCmd.PersistentFlags().String("node-id", "", "Node id")

	scanResultsSubCmd.PersistentFlags().String("scan-id", "", "Scan id")
}
