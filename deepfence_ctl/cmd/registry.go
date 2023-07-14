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

var registryCmd = &cobra.Command{
	Use:   "registry",
	Short: "Registry control",
	Long:  `This subcommand accesses registry data with remote server`,
}

var imagesSubCmd = &cobra.Command{
	Use:   "tags",
	Short: "Get Images tags",
	Long:  `This subcommand retrieve the tags associated with images`,
	Run: func(cmd *cobra.Command, args []string) {

		var err error
		name_filter, _ := cmd.Flags().GetString("name-filter")
		if name_filter == "" {
			log.Fatal().Msg("Missing name-filter")
		}
		name_entries := strings.Split(name_filter, ",")

		registry_id, _ := cmd.Flags().GetString("registry-id")
		if registry_id == "" {
			log.Fatal().Msg("Missing registry-id")
		}

		name_entries_interface := []interface{}{}
		for i := range name_entries {
			name_entries_interface = append(name_entries_interface, name_entries[i])
		}

		filters := deepfence_server_client.ReportersContainsFilter{
			FilterIn: map[string][]interface{}{
				"docker_image_name": name_entries_interface,
			},
		}

		req := http.Client().RegistryAPI.ListImageStubs(context.Background())
		req = req.ModelRegistryImageStubsReq(
			deepfence_server_client.ModelRegistryImageStubsReq{
				ImageFilter: deepfence_server_client.ReportersFieldsFilters{ContainsFilter: filters},
				RegistryId:  registry_id,
				Window:      deepfence_server_client.ModelFetchWindow{},
			},
		)
		res, rh, err := http.Client().RegistryAPI.ListImageStubsExecute(req)

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v: %v", err, rh)
		}
		output.Out(res)
	},
}

func init() {
	rootCmd.AddCommand(registryCmd)
	registryCmd.AddCommand(imagesSubCmd)

	registryCmd.PersistentFlags().String("registry-id", "", "Registry ID")

	imagesSubCmd.PersistentFlags().String("name-filter", "", "Name filter")
}
