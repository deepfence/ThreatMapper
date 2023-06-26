package cmd

import (
	"context"
	"strings"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_ctl/output"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
)

var lookupCmd = &cobra.Command{
	Use:   "lookup",
	Short: "Graph Node lookup",
	Long:  `This subcommand fetch details for graph nodes`,
	Run: func(cmd *cobra.Command, args []string) {
		lookup_type, _ := cmd.Flags().GetString("type")

		lookup_ids, _ := cmd.Flags().GetString("ids")
		ids := strings.Split(lookup_ids, ",")

		lookup_fields, _ := cmd.Flags().GetString("fields")
		fields := []string{}
		if len(lookup_fields) != 0 {
			fields = strings.Split(lookup_fields, ",")
		}

		filters := deepfence_server_client.LookupLookupFilter{
			InFieldFilter: fields,
			NodeIds:       ids,
		}

		root, _ := cmd.Flags().GetString("root")

		switch lookup_type {
		case "host":
			req := http.Client().LookupAPI.GetHosts(context.Background())
			req = req.LookupLookupFilter(filters)
			res, rh, err := http.Client().LookupAPI.GetHostsExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "container":
			req := http.Client().LookupAPI.GetContainers(context.Background())
			req = req.LookupLookupFilter(filters)
			res, rh, err := http.Client().LookupAPI.GetContainersExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "process":
			req := http.Client().LookupAPI.GetProcesses(context.Background())
			req = req.LookupLookupFilter(filters)
			res, rh, err := http.Client().LookupAPI.GetProcessesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "pod":
			req := http.Client().LookupAPI.GetPods(context.Background())
			req = req.LookupLookupFilter(filters)
			res, rh, err := http.Client().LookupAPI.GetPodsExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "cluster":
			req := http.Client().LookupAPI.GetKubernetesClusters(context.Background())
			req = req.LookupLookupFilter(filters)
			res, rh, err := http.Client().LookupAPI.GetKubernetesClustersExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "image":
			req := http.Client().LookupAPI.GetContainerImages(context.Background())
			req = req.LookupLookupFilter(filters)
			res, rh, err := http.Client().LookupAPI.GetContainerImagesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		case "cloud-resource":
			req := http.Client().LookupAPI.GetCloudResources(context.Background())
			req = req.LookupLookupFilter(filters)
			res, rh, err := http.Client().LookupAPI.GetCloudResourcesExecute(req)
			if err != nil {
				log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
			}
			output.Out(res)
		default:
			log.Fatal().Msgf("Unsupported type:%s", root)
		}

	},
}

func init() {
	rootCmd.AddCommand(lookupCmd)

	lookupCmd.PersistentFlags().String("type", "", "host/container/process")
	lookupCmd.PersistentFlags().String("ids", "", "CSV ids to lookup")
	lookupCmd.PersistentFlags().String("fields", "", "CSV fields to lookup")

	graphCmd.AddCommand(graphThreatSubCmd)
}
