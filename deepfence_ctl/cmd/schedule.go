package cmd

import (
	"context"

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

		var mAddTaskReq deepfence_server_client.ModelAddScheduledTaskRequest
		mAddTaskReq.CronExpr = &cronexpr
		desc := "Test Schedule Scan for:" + scan_type
		mAddTaskReq.Description = &desc
		mAddTaskReq.Filters = deepfence_server_client.ModelScanFilter{}
		mAddTaskReq.NodeIds = append(mAddTaskReq.NodeIds,
			deepfence_server_client.ModelNodeIdentifier{
				NodeType: node_type,
			},
		)

		var err error
		action := ""
		switch scan_type {
		case "secret":
			action = "SecretScan"
		case "malware":
			action = "MalwareScan"
		case "vulnerability":
			action = "VulnerabilityScan"
		case "compliance":
			action = "ComplianceScan"
		default:
			log.Fatal().Msg("Unsupported")
		}

		mAddTaskReq.Action = action
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
