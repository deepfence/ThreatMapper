package cmd

import (
	"context"
	"strings"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_ctl/output"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
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

		scan_node_id, _ := cmd.Flags().GetString("node-ids")
		if scan_node_id == "" {
			log.Fatal().Msg("Please provide a node-ids")
		}
		scan_node_ids := strings.Split(scan_node_id, ",")

		resource_type, _ := cmd.Flags().GetString("node-type")
		res_type := ctl.StringToResourceType(resource_type)
		if res_type == -1 {
			log.Fatal().Msg("Please provide a valid resource-type")
		}

		identifiers := []deepfence_server_client.ModelNodeIdentifier{}
		for i := range scan_node_ids {
			identifiers = append(identifiers, deepfence_server_client.ModelNodeIdentifier{
				NodeId:   scan_node_ids[i],
				NodeType: resource_type,
			})
		}

		var err error
		var res *deepfence_server_client.ModelScanTriggerResp
		switch scan_type {
		case "secret":
			req := http.Client().SecretScanAPI.StartSecretScan(context.Background())
			req = req.ModelSecretScanTriggerReq(
				*deepfence_server_client.NewModelSecretScanTriggerReq(
					*deepfence_server_client.NewModelScanFilterWithDefaults(),
					identifiers,
				))
			res, _, err = http.Client().SecretScanAPI.StartSecretScanExecute(req)
		case "malware":
			req := http.Client().MalwareScanAPI.StartMalwareScan(context.Background())
			req = req.ModelMalwareScanTriggerReq(
				*deepfence_server_client.NewModelMalwareScanTriggerReq(
					*deepfence_server_client.NewModelScanFilterWithDefaults(),
					identifiers,
				))
			res, _, err = http.Client().MalwareScanAPI.StartMalwareScanExecute(req)
		case "vulnerability":
			vuln_scan_type, _ := cmd.Flags().GetString("scan-config")
			req := http.Client().VulnerabilityAPI.StartVulnerabilityScan(context.Background())
			req = req.ModelVulnerabilityScanTriggerReq(
				*deepfence_server_client.NewModelVulnerabilityScanTriggerReq(
					*deepfence_server_client.NewModelScanFilterWithDefaults(),
					identifiers,
					[]deepfence_server_client.ModelVulnerabilityScanConfigLanguage{*deepfence_server_client.NewModelVulnerabilityScanConfigLanguage(vuln_scan_type)},
				))
			res, _, err = http.Client().VulnerabilityAPI.StartVulnerabilityScanExecute(req)
		case "compliance":
			scan_config, _ := cmd.Flags().GetString("scan-config")
			req := http.Client().ComplianceAPI.StartComplianceScan(context.Background())
			req = req.ModelComplianceScanTriggerReq(
				*deepfence_server_client.NewModelComplianceScanTriggerReq(
					strings.Split(scan_config, ","),
					*deepfence_server_client.NewModelScanFilterWithDefaults(),
					[]deepfence_server_client.ModelNodeIdentifier{
						{
							NodeId:   scan_node_id,
							NodeType: resource_type,
						},
					},
				))
			res, _, err = http.Client().ComplianceAPI.StartComplianceScanExecute(req)
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
		var res2 *deepfence_server_client.ModelComplianceScanStatusResp
		switch scan_type {
		case "secret":
			req := http.Client().SecretScanAPI.StatusSecretScan(context.Background())
			req = req.ModelScanStatusReq(*deepfence_server_client.NewModelScanStatusReq(
				scan_id,
				[]string{},
			))
			res, _, err = http.Client().SecretScanAPI.StatusSecretScanExecute(req)
		case "vulnerability":
			req := http.Client().VulnerabilityAPI.StatusVulnerabilityScan(context.Background())
			req = req.ModelScanStatusReq(*deepfence_server_client.NewModelScanStatusReq(
				scan_id,
				[]string{},
			))
			res, _, err = http.Client().VulnerabilityAPI.StatusVulnerabilityScanExecute(req)
		case "malware":
			req := http.Client().MalwareScanAPI.StatusMalwareScan(context.Background())
			req = req.ModelScanStatusReq(*deepfence_server_client.NewModelScanStatusReq(
				scan_id,
				[]string{},
			))
			res, _, err = http.Client().MalwareScanAPI.StatusMalwareScanExecute(req)
		case "compliance":
			req := http.Client().CloudScannerAPI.StatusCloudComplianceScan(context.Background())
			req = req.ModelScanStatusReq(*deepfence_server_client.NewModelScanStatusReq(
				scan_id,
				[]string{},
			))
			res2, _, err = http.Client().CloudScannerAPI.StatusCloudComplianceScanExecute(req)
		default:
			log.Fatal().Msg("Unsupported")
		}

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
		if res != nil {
			output.Out(res)
		} else {
			output.Out(res2)
		}
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
			req := http.Client().SecretScanAPI.ListSecretScan(context.Background())
			req = req.ModelScanListReq(deepfence_server_client.ModelScanListReq{
				NodeIds: []deepfence_server_client.ModelNodeIdentifier{{NodeId: node_id, NodeType: node_type}},
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().SecretScanAPI.ListSecretScanExecute(req)
		case "vulnerability":
			req := http.Client().VulnerabilityAPI.ListVulnerabilityScans(context.Background())
			req = req.ModelScanListReq(deepfence_server_client.ModelScanListReq{
				NodeIds: []deepfence_server_client.ModelNodeIdentifier{{NodeId: node_id, NodeType: node_type}},
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().VulnerabilityAPI.ListVulnerabilityScansExecute(req)
		default:
			log.Fatal().Msg("Unsupported")
		}

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
		output.Out(res)
	},
}

var scanSearchSubCmd = &cobra.Command{
	Use:   "search",
	Short: "Search scan list",
	Long:  `This subcommand retrieve a scan list`,
	Run: func(cmd *cobra.Command, args []string) {
		scan_type, _ := cmd.Flags().GetString("type")
		if scan_type == "" {
			log.Fatal().Msg("Please provide an type")
		}

		scan_filter, _ := cmd.Flags().GetString("scan-filter")
		scan_filters := deepfence_server_client.SearchSearchFilter{}
		if scan_filter != "" {
			orderFilter := deepfence_server_client.ReportersOrderFilter{}

			sfields := map[string][]interface{}{}
			filters := strings.Split(scan_filter, ",")
			for i := range filters {
				field_value := strings.Split(filters[i], "=")
				if len(field_value) != 2 {
					continue
				}
				sfields[field_value[0]] = append(sfields[field_value[0]], field_value[1])

			}

			scan_filters = deepfence_server_client.SearchSearchFilter{
				InFieldFilter: []string{},
				Filters: deepfence_server_client.ReportersFieldsFilters{
					ContainsFilter: deepfence_server_client.ReportersContainsFilter{
						FilterIn: sfields,
					},
					MatchFilter: deepfence_server_client.ReportersMatchFilter{
						FilterIn: map[string][]interface{}{},
					},
					OrderFilter: orderFilter,
				},
			}
		}

		node_filter, _ := cmd.Flags().GetString("node-filter")
		node_filters := deepfence_server_client.SearchSearchFilter{}
		if node_filter != "" {
			orderFilter := deepfence_server_client.ReportersOrderFilter{}

			sfields := map[string][]interface{}{}
			filters := strings.Split(node_filter, ",")
			for i := range filters {
				field_value := strings.Split(filters[i], "=")
				if len(field_value) != 2 {
					continue
				}
				sfields[field_value[0]] = append(sfields[field_value[0]], field_value[1])

			}

			node_filters = deepfence_server_client.SearchSearchFilter{
				InFieldFilter: []string{},
				Filters: deepfence_server_client.ReportersFieldsFilters{
					ContainsFilter: deepfence_server_client.ReportersContainsFilter{
						FilterIn: sfields,
					},
					OrderFilter: orderFilter,
				},
			}
		}

		var err error
		var res []deepfence_server_client.ModelScanInfo
		switch scan_type {
		case "secret":
			req := http.Client().SearchAPI.SearchSecretsScans(context.Background())
			req = req.SearchSearchScanReq(deepfence_server_client.SearchSearchScanReq{
				ScanFilters: scan_filters,
				NodeFilters: node_filters,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().SearchAPI.SearchSecretsScansExecute(req)
		case "vulnerability":
			req := http.Client().SearchAPI.SearchVulnerabilityScans(context.Background())
			req = req.SearchSearchScanReq(deepfence_server_client.SearchSearchScanReq{
				ScanFilters: scan_filters,
				NodeFilters: node_filters,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().SearchAPI.SearchVulnerabilityScansExecute(req)
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
			log.Fatal().Msg("Please provide a node-ids")
		}

		var err error
		var res interface{}
		switch scan_type {
		case "secret":
			req := http.Client().SecretScanAPI.ResultsSecretScan(context.Background())
			req = req.ModelScanResultsReq(deepfence_server_client.ModelScanResultsReq{
				ScanId: scan_id,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().SecretScanAPI.ResultsSecretScanExecute(req)
		case "vulnerability":
			req := http.Client().VulnerabilityAPI.ResultsVulnerabilityScans(context.Background())
			req = req.ModelScanResultsReq(deepfence_server_client.ModelScanResultsReq{
				ScanId: scan_id,
				FieldsFilter: deepfence_server_client.ReportersFieldsFilters{
					ContainsFilter: deepfence_server_client.ReportersContainsFilter{
						FilterIn: map[string][]interface{}{"masked": {false}},
					},
				},
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().VulnerabilityAPI.ResultsVulnerabilityScansExecute(req)
		case "malware":
			req := http.Client().MalwareScanAPI.ResultsMalwareScan(context.Background())
			req = req.ModelScanResultsReq(deepfence_server_client.ModelScanResultsReq{
				ScanId: scan_id,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().MalwareScanAPI.ResultsMalwareScanExecute(req)
		case "compliance":
			req := http.Client().CloudScannerAPI.ResultsCloudComplianceScan(context.Background())
			req = req.ModelScanResultsReq(deepfence_server_client.ModelScanResultsReq{
				ScanId: scan_id,
				Window: deepfence_server_client.ModelFetchWindow{
					Offset: 0,
					Size:   20,
				},
			})
			res, _, err = http.Client().CloudScannerAPI.ResultsCloudComplianceScanExecute(req)
		default:
			log.Fatal().Msg("Unsupported")
		}

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
		output.Out(res)
	},
}

var scanStopSubCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stop Scan",
	Long:  `This subcommand stops a scan`,
	Run: func(cmd *cobra.Command, args []string) {

		log.Info().Msgf("Command: %v", *cmd)
		scan_type, _ := cmd.Flags().GetString("type")
		if scan_type == "" {
			log.Fatal().Msg("Please provide an type")
		}

		scan_id, _ := cmd.Flags().GetString("scan-id")
		if scan_id == "" {
			log.Fatal().Msg("Please provide a scan id")
		}

		scan_ids := strings.Split(scan_id, ",")
		stopReq := deepfence_server_client.ModelStopScanRequest{
			ScanIds: scan_ids,
		}

		var err error
		var res interface{}
		switch scan_type {
		case "secret":
			req := http.Client().SecretScanAPI.StopSecretScan(context.Background())
			stopReq.ScanType = "SecretScan"
			req = req.ModelStopScanRequest(stopReq)
			res, err = http.Client().SecretScanAPI.StopSecretScanExecute(req)
		case "malware":
			req := http.Client().MalwareScanAPI.StopMalwareScan(context.Background())
			stopReq.ScanType = "MalwareScan"
			req = req.ModelStopScanRequest(stopReq)
			res, err = http.Client().MalwareScanAPI.StopMalwareScanExecute(req)
		case "vulnerability":
			req := http.Client().VulnerabilityAPI.StopVulnerabilityScan(context.Background())
			stopReq.ScanType = "VulnerabilityScan"
			req = req.ModelStopScanRequest(stopReq)
			res, err = http.Client().VulnerabilityAPI.StopVulnerabilityScanExecute(req)
		case "compliance":
			req := http.Client().ComplianceAPI.StopComplianceScan(context.Background())
			stopReq.ScanType = "ComplianceScan"
			req = req.ModelStopScanRequest(stopReq)
			res, err = http.Client().ComplianceAPI.StopComplianceScanExecute(req)
		case "cloudcompliance":
			req := http.Client().ComplianceAPI.StopComplianceScan(context.Background())
			stopReq.ScanType = "CloudComplianceScan"
			req = req.ModelStopScanRequest(stopReq)
			res, err = http.Client().ComplianceAPI.StopComplianceScanExecute(req)
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
	scanCmd.AddCommand(scanSearchSubCmd)
	scanCmd.AddCommand(scanStopSubCmd)

	scanCmd.PersistentFlags().String("type", "", "Scan type")

	scanStartSubCmd.PersistentFlags().String("node-ids", "", "Node id")
	scanStartSubCmd.PersistentFlags().String("node-type", "", "Resource type (host, container, image)")
	scanStartSubCmd.PersistentFlags().String("scan-config", "all", "vulnerability scan type (all,base,ruby,python,javascript,php,golang,golang-binary,java,rust,rust-binary,dotnet)")

	scanStatusSubCmd.PersistentFlags().String("scan-id", "", "Scan id")

	scanListSubCmd.PersistentFlags().String("node-id", "", "Node id")
	scanListSubCmd.PersistentFlags().String("node-type", "", "Resource type (host, container, image)")

	scanSearchSubCmd.PersistentFlags().String("scan-filter", "", "Scan filter")
	scanSearchSubCmd.PersistentFlags().String("node-filter", "", "Node filter")

	scanResultsSubCmd.PersistentFlags().String("scan-id", "", "Scan id")

	scanStopSubCmd.PersistentFlags().String("scan-id", "", "Scan id")

}
