package cmd

import (
	"context"
	"strings"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_ctl/output"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
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

		resource_type, _ := cmd.Flags().GetString("node-type")
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
					NodeId:   scan_node_id,
					NodeType: resource_type,
				})
			res, _, err = http.Client().SecretScanApi.StartSecretScanExecute(req)
		case "malware":
			req := http.Client().MalwareScanApi.StartMalwareScan(context.Background())
			req = req.ModelScanTriggerReq(
				deepfence_server_client.ModelScanTriggerReq{
					NodeId:   scan_node_id,
					NodeType: resource_type,
				})
			res, _, err = http.Client().MalwareScanApi.StartMalwareScanExecute(req)
		case "vulnerability":
			vuln_scan_type, _ := cmd.Flags().GetString("scan-config")
			req := http.Client().VulnerabilityApi.StartVulnerabilityScan(context.Background())
			req = req.ModelVulnerabilityScanTriggerReq(
				deepfence_server_client.ModelVulnerabilityScanTriggerReq{
					NodeId:     scan_node_id,
					NodeType:   resource_type,
					ScanConfig: vuln_scan_type,
				})
			res, _, err = http.Client().VulnerabilityApi.StartVulnerabilityScanExecute(req)
		default:
			log.Fatal().Msg("Unsupported")
		}

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
		output.Out(res)
	},
}

var scanBulkStartSubCmd = &cobra.Command{
	Use:   "bulk",
	Short: "Bulk start scan",
	Long:  `This subcommand triggers multiple scans`,
	Run: func(cmd *cobra.Command, args []string) {
		scan_type, _ := cmd.Flags().GetString("type")
		if scan_type == "" {
			log.Fatal().Msg("Please provide an type")
		}

		scan_node_id_str, _ := cmd.Flags().GetString("node-ids")
		if scan_node_id_str == "" {
			log.Fatal().Msg("Please provide a node-ids")
		}
		scan_node_ids := strings.Split(scan_node_id_str, ",")

		resource_type_str, _ := cmd.Flags().GetString("node-types")
		if resource_type_str == "" {
			log.Fatal().Msg("Please provide a node-types")
		}
		scan_node_types := strings.Split(resource_type_str, ",")
		if len(scan_node_types) != len(scan_node_ids) {
			log.Fatal().Msg("Please provide save number of scan type and id")
		}
		types := []ctl.ScanResource{}
		for i := range scan_node_types {
			res_type := ctl.StringToResourceType(scan_node_types[i])
			if res_type == -1 {
				log.Fatal().Msg("Please provide valid type")
			}
			types = append(types, res_type)
		}

		var err error
		var res *deepfence_server_client.ModelBulkScanTriggerResp
		switch scan_type {
		case "vulnerability":

			requests := []deepfence_server_client.ModelScanTriggerReq{}
			for i := range scan_node_ids {
				requests = append(requests, deepfence_server_client.ModelScanTriggerReq{
					NodeId:   scan_node_ids[i],
					NodeType: ctl.ResourceTypeToString(types[i]),
				})
			}
			vuln_scan_type, _ := cmd.Flags().GetString("scan-config")
			req := http.Client().VulnerabilityApi.StartBulkVulnerabilityScan(context.Background())
			req = req.ModelBulkVulnerabilityScanTriggerReq(
				deepfence_server_client.ModelBulkVulnerabilityScanTriggerReq{
					ScanRequests: requests,
					ScanConfig:   vuln_scan_type,
				})
			res, _, err = http.Client().VulnerabilityApi.StartBulkVulnerabilityScanExecute(req)
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
		case "vulnerability":
			req := http.Client().VulnerabilityApi.StatusVulnerabilityScan(context.Background())
			req = req.ScanId(scan_id)
			res, _, err = http.Client().VulnerabilityApi.StatusVulnerabilityScanExecute(req)
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

		node_type, _ := cmd.Flags().GetString("node-type")
		if node_type == "" {
			log.Fatal().Msg("Please provide a node-type")
		}

		var err error
		var res *deepfence_server_client.ModelScanListResp
		switch scan_type {
		case "secret":
			req := http.Client().SecretScanApi.ListSecretScan(context.Background())
			req = req.ModelScanListReq(deepfence_server_client.ModelScanListReq{
				NodeId:   node_id,
				NodeType: node_type,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().SecretScanApi.ListSecretScanExecute(req)
		case "vulnerability":
			req := http.Client().VulnerabilityApi.ListVulnerabilityScans(context.Background())
			req = req.ModelScanListReq(deepfence_server_client.ModelScanListReq{
				NodeId:   node_id,
				NodeType: node_type,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().VulnerabilityApi.ListVulnerabilityScansExecute(req)
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
		case "vulnerability":
			req := http.Client().VulnerabilityApi.ResultsVulnerabilityScans(context.Background())
			req = req.ModelScanResultsReq(deepfence_server_client.ModelScanResultsReq{
				ScanId: scan_id,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().VulnerabilityApi.ResultsVulnerabilityScansExecute(req)
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

	scanCmd.AddCommand(scanBulkStartSubCmd)

	scanCmd.PersistentFlags().String("type", "", "Scan type")

	scanStartSubCmd.PersistentFlags().String("node-id", "", "Node id")
	scanStartSubCmd.PersistentFlags().String("node-type", "", "Resource type (host, container, image)")
	scanStartSubCmd.PersistentFlags().String("scan-config", "all", "vulnerability scan type (all,base,ruby,python,javascript,php,golang,java,rust,dotnet)")

	scanStatusSubCmd.PersistentFlags().String("scan-id", "", "Scan id")

	scanListSubCmd.PersistentFlags().String("node-id", "", "Node id")
	scanListSubCmd.PersistentFlags().String("node-type", "", "Resource type (host, container, image)")

	scanResultsSubCmd.PersistentFlags().String("scan-id", "", "Scan id")

	scanBulkStartSubCmd.PersistentFlags().String("node-ids", "", "Node id")
	scanBulkStartSubCmd.PersistentFlags().String("node-types", "", "Resource type (host, container, image)")
}
