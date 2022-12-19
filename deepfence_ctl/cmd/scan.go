package cmd

import (
	"context"
	"log"

	"github.com/spf13/cobra"

	"github.com/deepfence/ThreatMapper/deepfence_server_client"
	oahttp "github.com/deepfence/ThreatMapper/deepfence_utils/http"
)

var scanCmd = &cobra.Command{
	Use:   "scan",
	Short: "Scan control",
	Long:  `This subcommand controls scan with remote server`,
	Run: func(cmd *cobra.Command, args []string) {
		scan_type, _ := cmd.Flags().GetString("type")
		if scan_type == "" {
			log.Fatal("Please provide an type")
		}

		switch scan_type {
		case "secret":
		default:
			log.Fatalln("Unsupported")
		}

		scan_action, _ := cmd.Flags().GetString("action")
		if scan_action == "" {
			log.Fatal("Please provide an action")
		}

		switch scan_action {
		case "start":
		default:
			log.Fatalln("Unsupported")
		}

		scan_node_id, _ := cmd.Flags().GetString("node-id")
		if scan_node_id == "" {
			log.Fatal("Please provide a node-id")
		}

		https_client := oahttp.NewHttpsConsoleClient(console_ip, "443")
		err := inject_tokens(https_client)
		if err != nil {
			log.Fatalf("Client not authenticated: %v\n", err)
		}
		req := https_client.Client().SecretScanApi.StartSecretScan(context.Background())
		req = req.ModelScanTrigger(
			deepfence_server_client.ModelScanTrigger{
				NodeId:       scan_node_id,
				ResourceId:   "/home",
				ResourceType: 2,
			})
		res, _, err := https_client.Client().SecretScanApi.StartSecretScanExecute(req)
		if err != nil {
			log.Fatalf("Fail to execute: %v", err)
		}
		log.Printf("Scan Id: %s", res.ScanId)
	},
}

func init() {
	rootCmd.AddCommand(scanCmd)

	scanCmd.PersistentFlags().String("type", "", "Scan type")
	scanCmd.PersistentFlags().String("action", "", "Start a scan")
	scanCmd.PersistentFlags().String("node-id", "", "Node id")
}
