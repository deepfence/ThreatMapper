package host

import (
	"context"
	"fmt"
	"math/rand"
	"os/exec"
	"time"

	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"
)

type SBOMGen struct {
	conn    *grpc.ClientConn
	client  pb.SyftPluginClient
	command *exec.Cmd
}

const (
	syft_plugin_format     = "/tmp/%d.sock"
	syft_plugin_exe_path   = "/home/deepfence/bin/syft-plugin"
	syft_plugin_opt_format = "--socket-path=%s"
	mem_lock_size          = "--memlock=8388608"
)

func generateSocketString() string {
	rand.Seed(time.Now().UnixNano())
	min := 1000
	max := 9999
	return fmt.Sprintf(syft_plugin_format, rand.Intn(max-min+1)+min)
}

func NewSBOMGen() (*SBOMGen, error) {
	syft_plugin_socket := generateSocketString()
	command := exec.Command("prlimit", mem_lock_size, syft_plugin_exe_path, fmt.Sprintf(syft_plugin_opt_format, syft_plugin_socket))
	err := command.Start()
	if err != nil {
		return nil, err
	}

	conn, err := grpc.Dial("unix://"+syft_plugin_socket, grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		command.Process.Kill()
		return nil, err
	}
	client := pb.NewSyftPluginClient(conn)
	return &SBOMGen{
		conn:    conn,
		client:  client,
		command: command,
	}, nil
}

func (it *SBOMGen) Stop() {
	it.command.Process.Kill()
	it.conn.Close()
}

func (it *SBOMGen) GetSBOM(imageName string) ([]byte, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	res, err := it.client.GetSBOMJSON(ctx, &pb.SBOMRequest{UserInput: imageName})
	if err != nil {
		return nil, err
	}
	return res, nil
}
