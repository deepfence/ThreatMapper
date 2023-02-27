package cmd

import (
	"context"
	"strconv"
	"strings"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_ctl/output"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

func type2field(t string) string {
	switch t {
	case "vulnerability":
		return "vulnerabilities_count"
	case "secret":
		return "secrets_count"
	case "compliance":
		return "compliances_count"
	case "cloudcompliance":
		return "cloudcompliances_count"
	case "malware":
		return "malwares_count"
	}
	return ""
}

var topCmd = &cobra.Command{
	Use:   "top",
	Short: "Graph Node search",
	Long:  `This subcommand fetch details for graph nodes`,
	Run: func(cmd *cobra.Command, args []string) {
		search_type, _ := cmd.Flags().GetString("toptype")
		target_type, _ := cmd.Flags().GetString("type")

		search_fields, _ := cmd.Flags().GetString("fields")
		fields := []string{}
		if len(search_fields) != 0 {
			fields = strings.Split(search_fields, ",")
		}

		rank, _ := cmd.Flags().GetString("num")
		num, err := strconv.Atoi(rank)
		if err != nil {
			log.Fatal().Msgf("%v", err)
		}

		orderFilter := deepfence_server_client.ReportersOrderFilter{
			OrderField: type2field(search_type),
		}

		filtreq := deepfence_server_client.SearchSearchNodeReq{
			NodeFilter: deepfence_server_client.SearchSearchFilter{
				InFieldFilter: fields,
				Filters: deepfence_server_client.ReportersFieldsFilters{
					ContainsFilter: deepfence_server_client.ReportersContainsFilter{},
					OrderFilter:    orderFilter,
				},
			},
			Window: deepfence_server_client.ModelFetchWindow{Offset: 0, Size: int32(num)},
		}

		switch target_type {
		case "host":
			req := http.Client().SearchApi.SearchHosts(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.SearchHostsExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "container":
			req := http.Client().SearchApi.SearchContainers(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.SearchContainersExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "image":
			req := http.Client().SearchApi.SearchContainerImages(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.SearchContainerImagesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			log.Info().Msgf("%v", res)
			output.Out(res)
		default:
			log.Fatal().Msgf("Unsupported type:%s", target_type)
		}

	},
}

var issuesCmd = &cobra.Command{
	Use:   "issues",
	Short: "Issues search",
	Long:  `This subcommand fetch details for issues`,
	Run: func(cmd *cobra.Command, args []string) {
		issue_type, _ := cmd.Flags().GetString("type")

		search_fields, _ := cmd.Flags().GetString("fields")
		fields := []string{}
		if len(search_fields) != 0 {
			fields = strings.Split(search_fields, ",")
		}

		orderFilter := deepfence_server_client.ReportersOrderFilter{}

		filtreq := deepfence_server_client.SearchSearchNodeReq{
			NodeFilter: deepfence_server_client.SearchSearchFilter{
				InFieldFilter: fields,
				Filters: deepfence_server_client.ReportersFieldsFilters{
					ContainsFilter: deepfence_server_client.ReportersContainsFilter{},
					OrderFilter:    orderFilter,
				},
			},
			Window: deepfence_server_client.ModelFetchWindow{Offset: 0, Size: 0},
		}

		switch issue_type {
		case "vulnerability":
			req := http.Client().SearchApi.SearchVulnerabilities(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.SearchVulnerabilitiesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "secret":
			req := http.Client().SearchApi.SearchSecrets(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.SearchSecretsExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "malware":
			req := http.Client().SearchApi.SearchMalwares(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.SearchMalwaresExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "compliance":
			req := http.Client().SearchApi.SearchCompliances(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.SearchCompliancesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "cloud-compliance":
			req := http.Client().SearchApi.SearchCloudCompliances(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.SearchCloudCompliancesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		default:
			log.Fatal().Msgf("Unsupported type:%s", issue_type)
		}
	},
}

var countCmd = &cobra.Command{
	Use:   "count",
	Short: "Count issues search",
	Long:  `This subcommand counts issues`,
	Run: func(cmd *cobra.Command, args []string) {
		issue_type, _ := cmd.Flags().GetString("type")

		search_fields, _ := cmd.Flags().GetString("fields")
		fields := []string{}
		if len(search_fields) != 0 {
			fields = strings.Split(search_fields, ",")
		}

		orderFilter := deepfence_server_client.ReportersOrderFilter{}

		filtreq := deepfence_server_client.SearchSearchNodeReq{
			NodeFilter: deepfence_server_client.SearchSearchFilter{
				InFieldFilter: fields,
				Filters: deepfence_server_client.ReportersFieldsFilters{
					ContainsFilter: deepfence_server_client.ReportersContainsFilter{},
					OrderFilter:    orderFilter,
				},
			},
			Window: deepfence_server_client.ModelFetchWindow{Offset: 0, Size: 0},
		}

		switch issue_type {
		case "vulnerability":
			req := http.Client().SearchApi.CountVulnerabilities(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.CountVulnerabilitiesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "secret":
			req := http.Client().SearchApi.CountSecrets(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.CountSecretsExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "malware":
			req := http.Client().SearchApi.CountMalwares(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.CountMalwaresExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "compliance":
			req := http.Client().SearchApi.CountCompliances(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.CountCompliancesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "cloud-compliance":
			req := http.Client().SearchApi.CountCloudCompliances(context.Background())
			req = req.SearchSearchNodeReq(filtreq)
			res, rh, err := http.Client().SearchApi.CountCloudCompliancesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		default:
			log.Fatal().Msgf("Unsupported type:%s", issue_type)
		}
	},
}

func init() {
	rootCmd.AddCommand(topCmd)
	rootCmd.AddCommand(issuesCmd)
	rootCmd.AddCommand(countCmd)

	topCmd.PersistentFlags().String("type", "", "host/container/process")
	topCmd.PersistentFlags().String("toptype", "", "host/container/process")
	topCmd.PersistentFlags().String("num", "", "Number of top")
	topCmd.PersistentFlags().String("fields", "", "CSV fields to search")

	issuesCmd.PersistentFlags().String("type", "", "vulnerability/secret/malware/compliance/cloud-compliance")
	issuesCmd.PersistentFlags().String("fields", "", "CSV fields to search")

	countCmd.PersistentFlags().String("type", "", "vulnerability/secret/malware/compliance/cloud-compliance")
	countCmd.PersistentFlags().String("fields", "", "CSV fields to search")
}
