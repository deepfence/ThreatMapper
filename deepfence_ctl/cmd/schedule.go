package cmd

import (
	"context"
	"encoding/json"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_ctl/http"
	"github.com/deepfence/ThreatMapper/deepfence_ctl/output"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	deepfence_server_client "github.com/deepfence/golang_deepfence_sdk/client"
)

var scheduleTaskCmd = &cobra.Command{
	Use:   "schedule",
	Short: "Schedule Task",
	Long:  `This subcommand controls scheduling of cron tasks`,
}

var scheduleTaskAddSubCmd = &cobra.Command{
	Use:   "add",
	Short: "Add Schedule Task",
	Long:  `This subcommand add a scheduled task`,
	Run: func(cmd *cobra.Command, args []string) {
		scan_type, _ := cmd.Flags().GetString("type")
		if scan_type == "" {
			log.Fatal().Msg("Please provide an type")
		}

		node_type, _ := cmd.Flags().GetString("nodetype")
		if node_type == "" {
			log.Fatal().Msg("Please provide a node type")
		}

		cronexpr := `0 */5 * * * *`

		filters := deepfence_server_client.SearchSearchFilter{}
		filters.InFieldFilter = []string{"node_id"}

		name_entries := []string{"Name=varun-test-host"}
		name_entries_interface := []interface{}{}
		for i := range name_entries {
			name_entries_interface = append(name_entries_interface, name_entries[i])
		}

		cFilters := deepfence_server_client.ReportersContainsFilter{
			FilterIn: map[string][]interface{}{
				"tags": name_entries_interface,
			},
		}
		filters.Filters.ContainsInArrayFilter = &cFilters
		out, _ := json.Marshal(&filters)

		/*{
			"in_field": ["node_id"],
			"filters": {
				"contains_in_array_filter":
			}
		}*/

		var mAddTaskReq deepfence_server_client.ModelAddScheduledTaskRequest
		mAddTaskReq.CronExpr = &cronexpr
		mAddTaskReq.NodeType = &node_type
		desc := "Test Schedule Scan for:" + scan_type
		mAddTaskReq.Description = &desc
		str := string(out)
		mAddTaskReq.Filters = &str

		var err error
		action := ""
		switch scan_type {
		case "secret":
			action = "secret-scan"
		case "malware":
			action = "malware-scan"
		case "vulnerability":
			action = "vulnerability-scan"
		case "compliance":
			action = "compliance-scan"
		default:
			log.Fatal().Msg("Unsupported")
		}

		mAddTaskReq.Action = &action
		req := http.Client().SettingsAPI.AddScheduledTask(context.Background())
		req = req.ModelAddScheduledTaskRequest(mAddTaskReq)
		res, err := http.Client().SettingsAPI.AddScheduledTaskExecute(req)

		if err != nil {
			log.Fatal().Msgf("Fail to execute: %v", err)
		}
		output.Out(res)
	},
}

func init() {
	rootCmd.AddCommand(scheduleTaskCmd)
	scheduleTaskCmd.AddCommand(scheduleTaskAddSubCmd)

	scheduleTaskCmd.PersistentFlags().String("type", "", "Scan type")
	scheduleTaskCmd.PersistentFlags().String("nodetype", "", "Node type")
}
