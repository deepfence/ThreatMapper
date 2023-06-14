package router

import (
	"context"
	"fmt"
	"os"

	"github.com/Jeffail/tunny"
	pb "github.com/deepfence/agent-plugins-grpc/proto"
	"google.golang.org/grpc"

	ctl "github.com/deepfence/golang_deepfence_sdk/utils/controls"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

const (
	ebpfSocketPath         = "/tmp/secret-scanner.sock"
	ssEbpfLogPath          = "/var/log/fenced/secretScanner.log"
	defaultScanConcurrency = 1
)

var certPath = "/etc/filebeat/filebeat.crt"

var (
	scanConcurrency    int
	grpcScanWorkerPool *tunny.Pool
	mgmtConsoleUrl     string
	deepfenceKey       string
	scanDir            string
)

type secretScanParameters struct {
	client      pb.SecretScannerClient
	req         *pb.FindRequest
	controlArgs map[string]string
	hostName    string
}

func init() {
	mgmtConsoleUrl = os.Getenv("MGMT_CONSOLE_URL")
	consolePort := os.Getenv("MGMT_CONSOLE_PORT")
	if consolePort != "" && consolePort != "443" {
		mgmtConsoleUrl += ":" + consolePort
	}
	deepfenceKey = os.Getenv("DEEPFENCE_KEY")
	if os.Getenv("DF_SERVERLESS") == "true" {
		certPath = "/deepfence/etc/filebeat/filebeat.crt"
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
			Input:  &pb.FindRequest_Path{Path: "/fenced/mnt/host"},
			ScanId: req.BinArgs["scan_id"],
		}
	}

	conn, err := grpc.Dial("unix://"+ebpfSocketPath, grpc.WithAuthority("dummy"),
		grpc.WithInsecure())
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
		grpc.WithInsecure())
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
