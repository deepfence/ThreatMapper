package process

import (
	"fmt"
	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"
	"os/exec"
)

const (
	ssEbpfExePath = "/home/deepfence/bin/SecretScanner"
)

type SecretScanner struct {
	conn    *grpc.ClientConn
	client  pb.SecretScannerClient
	command *exec.Cmd
}

func NewSecretScanner() (*SecretScanner, error) {
	ebpfSocket := generateSocketString()
	command := exec.Command("prlimit", mem_lock_size, ssEbpfExePath, fmt.Sprintf(ebpf_opt_format, ebpfSocket))
	err := command.Start()
	if err != nil {
		return nil, err
	}

	conn, err := grpc.Dial("unix://"+ebpfSocket, grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		command.Process.Kill()
		return nil, err
	}
	client := pb.NewSecretScannerClient(conn)
	return &SecretScanner{
		conn:    conn,
		client:  client,
		command: command,
	}, nil
}

func (it *SecretScanner) Stop() {
	it.command.Process.Kill()
	it.conn.Close()
}
