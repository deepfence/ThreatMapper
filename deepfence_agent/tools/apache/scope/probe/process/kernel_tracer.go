package process

import (
	"context"
	"io"
	"os/exec"
	"time"

	"github.com/sirupsen/logrus"
	pb "github.com/weaveworks/scope/probe/proto"
	"google.golang.org/grpc"
)

type InfoTracer struct {
	conn    *grpc.ClientConn
	client  pb.KernelTracerClient
	command *exec.Cmd
}

const (
	ebpf_socket   = "/tmp/ss.sock"
	ebpf_exe_path = "/home/deepfence/bin/open_tracer"
	ebpf_port     = "--socket-path=" + ebpf_socket
	mem_lock_size = "--memlock=8388608"
)

func NewInfoTracer() (*InfoTracer, error) {
	command := exec.Command("prlimit", mem_lock_size, ebpf_exe_path, ebpf_port)
	err := command.Start()
	if err != nil {
		return nil, err
	}

	conn, err := grpc.Dial("unix://"+ebpf_socket, grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		command.Process.Kill()
		return nil, err
	}
	client := pb.NewKernelTracerClient(conn)
	return &InfoTracer{
		conn:    conn,
		client:  client,
		command: command,
	}, nil
}

func (it *InfoTracer) Stop() {
	it.command.Process.Kill()
	it.conn.Close()
}

func (it *InfoTracer) GetOpenFileList(pidstr string) ([]string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()
	stream, err := it.client.GetPIDTraceInfo(ctx, &pb.PIDTraceInfoRequest{Pid: pidstr})
	if err != nil {
		return nil, err
	}
	stream.CloseSend()
	res := make([]string, 0)
	for {
		in, err := stream.Recv()
		if err == io.EOF {
			// read done.
			break
		}
		if err != nil {
			logrus.Errorf("Failed to receive a note : %v", err)
		}

		res = append(res, in.GetPath())
	}
	return res, nil
}
