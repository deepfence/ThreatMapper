package router

import (
	"bytes"
	"context"
	"fmt"
	"os"
	"path"

	pb "github.com/deepfence/agent-plugins-grpc/srcgo"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/supervisor"
	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
	"github.com/deepfence/ThreatMapper/deepfence_utils/utils"
	dfUtils "github.com/deepfence/df-utils"
)

var (
	ebpfSocketPath = dfUtils.GetDfInstallDir() + "/tmp/secret-scanner.sock"
	scanDir        string

	// track rule hash
	secretsRuleshash string
)

func init() {
	if os.Getenv("DF_SERVERLESS") == "true" {
		scanDir = "/"
	} else {
		scanDir = HostMountDir
	}
}

func StartSecretsScan(req ctl.StartSecretScanRequest) error {
	log.Info().Msgf("Start secret scan: %v\n", req)
	var greq pb.FindRequest
	switch req.NodeType {
	case ctl.Container:
		greq = pb.FindRequest{
			Input: &pb.FindRequest_Container{
				Container: &pb.Container{Id: req.BinArgs["node_id"]},
			},
			ScanId: req.BinArgs["scan_id"],
		}
	case ctl.Image:
		greq = pb.FindRequest{
			Input: &pb.FindRequest_Image{
				Image: &pb.DockerImage{Id: req.BinArgs["node_id"], Name: req.BinArgs["image_name"]},
			},
			ScanId: req.BinArgs["scan_id"],
		}
	case ctl.Host:
		greq = pb.FindRequest{
			Input:  &pb.FindRequest_Path{Path: scanDir},
			ScanId: req.BinArgs["scan_id"],
		}
	}

	conn, err := grpc.Dial("unix://"+ebpfSocketPath, grpc.WithAuthority("dummy"),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		fmt.Printf("error in creating secret scanner client: %s\n", err.Error())
		return err
	}
	defer conn.Close()

	ssClient := pb.NewSecretScannerClient(conn)
	_, err = ssClient.FindSecretInfo(context.Background(), &greq)

	if err != nil {
		fmt.Println("FindSecretInfo error" + err.Error())
		return err
	}

	fmt.Println("Secret scan start for" + req.BinArgs["scan_id"])
	return nil
}

func GetSecretScannerJobCount() int32 {
	conn, err := grpc.Dial("unix://"+ebpfSocketPath, grpc.WithAuthority("dummy"),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		fmt.Printf("error in creating secret scanner client: %s\n", err.Error())
		return 0
	}
	defer conn.Close()
	client := pb.NewScannersClient(conn)
	jobReport, err := client.ReportJobsStatus(context.Background(), &pb.Empty{})
	if err != nil {
		return 0
	}
	return jobReport.RunningJobs
}

func StopSecretScan(req ctl.StopSecretScanRequest) error {
	fmt.Printf("Stop Secret Scan : %v\n", req)
	conn, err := grpc.Dial("unix://"+ebpfSocketPath, grpc.WithAuthority("dummy"),
		grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		fmt.Printf("error in creating secret scanner client: %s\n", err.Error())
		return err
	}

	defer conn.Close()
	client := pb.NewScannersClient(conn)

	var greq pb.StopScanRequest
	greq.ScanId = req.BinArgs["scan_id"]

	_, err = client.StopScan(context.Background(), &greq)
	if err != nil {
		fmt.Printf("StopSecretScan::error in client.StopScan: %s\n", err.Error())
	}

	return err
}

// download, update rules and restart scanner
func UpdateSecretsRules(req ctl.ThreatIntelInfo) error {
	if req.SecretsRulesHash == secretsRuleshash {
		log.Warn().Msgf("skip secrets rules update already new")
		return nil
	}

	newRules := "new_secret_rules.tar.gz"
	configPath := path.Join(dfUtils.GetDfInstallDir(), "/home/deepfence/bin/secret-scanner/config")

	if err := downloadFile(newRules, req.SecretsRulesURL); err != nil {
		log.Error().Err(err).Msg("failed to downlaod secrets rules")
		return err
	}
	defer os.Remove(newRules)

	log.Info().Msgf("completed downloading rules from url %s", req.SecretsRulesURL)

	// stop secret scanner
	if err := supervisor.StopProcess("secret_scanner"); err != nil {
		log.Error().Err(err).Msg("error on stop secrets scanner")
	}

	// remove old rules
	os.RemoveAll(configPath)

	data, err := os.ReadFile(newRules)
	if err != nil {
		log.Error().Err(err).Msg("failed to open new rules")
		return err
	}

	if err := utils.ExtractTarGz(bytes.NewReader(data), configPath); err != nil {
		log.Error().Err(err).Msg("failed to extract rules")
		return err
	}

	log.Info().Msg("secrets rules updated starting secret scanner")

	// start scanner
	if err := supervisor.StartProcess("secret_scanner"); err != nil {
		log.Error().Err(err).Msg("error on start secrets scanner")
	}

	// set to new hash
	secretsRuleshash = req.SecretsRulesHash

	return nil
}
