package cmd

import (
	"context"
	"fmt"
	stdhttp "net/http"
	"strings"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_ctl/output"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
)

var graphCmd = &cobra.Command{
	Use:   "graph",
	Short: "Graph control",
	Long:  `This subcommand controls graph with remote server`,
}

func csvs2FieldsFilter(csvs []string) (deepfence_server_client.ReportersFieldsFilters, error) {
	println(len(csvs))
	if len(csvs) == 0 {
		return deepfence_server_client.ReportersFieldsFilters{}, nil
	}

	filters := map[string][]interface{}{}
	for i := range csvs {
		key_value := strings.Split(csvs[i], "=")
		if len(key_value) != 2 {
			return deepfence_server_client.ReportersFieldsFilters{}, fmt.Errorf("Unexpected entry format: %v", csvs[i])
		}
		filters[key_value[0]] = append(filters[key_value[0]], key_value[1])
	}
	return deepfence_server_client.ReportersFieldsFilters{
		ContainsFilter: deepfence_server_client.ReportersContainsFilter{
			FilterIn: filters,
		},
	}, nil
}

var graphTopologySubCmd = &cobra.Command{
	Use:   "topology",
	Short: "Get Topology graph",
	Long:  `This subcommand retrieve the topology graph`,
	Run: func(cmd *cobra.Command, args []string) {

		var err error
		host_filter, _ := cmd.Flags().GetString("host-filter")
		host_entries := strings.Split(host_filter, ",")

		region_filter, _ := cmd.Flags().GetString("region-filter")
		region_entries := strings.Split(region_filter, ",")

		provider_filter, _ := cmd.Flags().GetString("provider-filter")
		provider_entries := strings.Split(provider_filter, ",")

		k8s_filter, _ := cmd.Flags().GetString("kubernetes-filter")
		k8s_entries := strings.Split(k8s_filter, ",")

		pod_filter, _ := cmd.Flags().GetString("pod-filter")
		pod_entries := strings.Split(pod_filter, ",")

		container_filter, _ := cmd.Flags().GetString("container-filter")
		container_entries := strings.Split(container_filter, ",")

		var field_filters deepfence_server_client.ReportersFieldsFilters
		fields_contains_filter, _ := cmd.Flags().GetString("fields-contain")
		if len(fields_contains_filter) != 0 {
			fields_contains_entries := strings.Split(fields_contains_filter, ",")
			field_filters, err = csvs2FieldsFilter(fields_contains_entries)
		}

		if err != nil {
			log.Fatal().Msgf("Filter parsing err:%v", err)
		}

		filters := deepfence_server_client.GraphTopologyFilters{
			CloudFilter:      provider_entries,
			HostFilter:       host_entries,
			RegionFilter:     region_entries,
			KubernetesFilter: k8s_entries,
			PodFilter:        pod_entries,
			ContainerFilter:  container_entries,
			FieldFilters:     field_filters,
		}

		root, _ := cmd.Flags().GetString("root")

		var res *deepfence_server_client.ModelGraphResult
		var rh *stdhttp.Response
		switch root {
		case "":
			req := http.Client().TopologyAPI.GetTopologyGraph(context.Background())
			req = req.GraphTopologyFilters(filters)
			res, rh, err = http.Client().TopologyAPI.GetTopologyGraphExecute(req)
		case "hosts":
			req := http.Client().TopologyAPI.GetHostsTopologyGraph(context.Background())
			req = req.GraphTopologyFilters(filters)
			res, rh, err = http.Client().TopologyAPI.GetHostsTopologyGraphExecute(req)
		case "containers":
			req := http.Client().TopologyAPI.GetContainersTopologyGraph(context.Background())
			req = req.GraphTopologyFilters(filters)
			res, rh, err = http.Client().TopologyAPI.GetContainersTopologyGraphExecute(req)
		case "pods":
			req := http.Client().TopologyAPI.GetPodsTopologyGraph(context.Background())
			req = req.GraphTopologyFilters(filters)
			res, rh, err = http.Client().TopologyAPI.GetPodsTopologyGraphExecute(req)
		case "kubernetes":
			req := http.Client().TopologyAPI.GetKubernetesTopologyGraph(context.Background())
			req = req.GraphTopologyFilters(filters)
			res, rh, err = http.Client().TopologyAPI.GetKubernetesTopologyGraphExecute(req)
		default:
			log.Fatal().Msgf("Unsupported root:%s", root)
		}

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

		issue_filter, _ := cmd.Flags().GetString("issue-filter")
		if issue_filter == "" {
			issue_filter = "all"
		}

		cloud_filter, _ := cmd.Flags().GetBool("cloud-only")

		req := http.Client().ThreatAPI.GetThreatGraph(context.Background())
		req = req.GraphThreatFilters(deepfence_server_client.GraphThreatFilters{
			Type:              issue_filter,
			CloudResourceOnly: cloud_filter,
		})
		res, rh, err := http.Client().ThreatAPI.GetThreatGraphExecute(req)

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
		}
		output.Out(res)
	},
}

var attackPathsSubCmd = &cobra.Command{
	Use:   "attacks",
	Short: "Get Attack paths graph",
	Long:  `This subcommand retrieve the attack paths graph`,
	Run: func(cmd *cobra.Command, args []string) {

		req := http.Client().ThreatAPI.GetIndividualThreatGraph(context.Background())
		req = req.GraphIndividualThreatGraphRequest(
			deepfence_server_client.GraphIndividualThreatGraphRequest{
				GraphType: "most_vulnerable_attack_paths",
				IssueType: "vulnerability",
			})
		res, rh, err := http.Client().ThreatAPI.GetIndividualThreatGraphExecute(req)

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
		}
		output.Out(res)
	},
}

func init() {
	rootCmd.AddCommand(graphCmd)
	graphCmd.AddCommand(graphTopologySubCmd)

	graphTopologySubCmd.PersistentFlags().String("host-filter", "", "CSV host filter")
	graphTopologySubCmd.PersistentFlags().String("region-filter", "", "CSV region filter")
	graphTopologySubCmd.PersistentFlags().String("provider-filter", "", "CSV provider filter")
	graphTopologySubCmd.PersistentFlags().String("kubernetes-filter", "", "CSV k8s filter")
	graphTopologySubCmd.PersistentFlags().String("pod-filter", "", "CSV pod filter")
	graphTopologySubCmd.PersistentFlags().String("container-filter", "", "CSV container filter")
	graphTopologySubCmd.PersistentFlags().String("fields-contain", "", "CSV fields filter containing values, e.g. (blah=boo,foo=bar)")

	graphTopologySubCmd.PersistentFlags().String("root", "", "Root can be: ''/hosts/containers/pods/kubernetes")

	graphCmd.AddCommand(graphThreatSubCmd)
	graphThreatSubCmd.PersistentFlags().String("issue-filter", "", "vulnerability/malware/secrets/compliance/cloud_complaince/all")
	graphThreatSubCmd.PersistentFlags().Bool("cloud-only", false, "vulnerability/malware/secrets/compliance/cloud_complaince/all")

	graphCmd.AddCommand(attackPathsSubCmd)
}
