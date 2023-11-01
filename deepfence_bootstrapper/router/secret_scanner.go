package router

import (
	"context"
	"fmt"
	"os"

	pb "github.com/deepfence/agent-plugins-grpc/srcgo"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	ctl "github.com/deepfence/ThreatMapper/deepfence_utils/controls"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

var (
	ebpfSocketPath = getDfInstallDir() + "/tmp/secret-scanner.sock"
	scanDir        string
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
