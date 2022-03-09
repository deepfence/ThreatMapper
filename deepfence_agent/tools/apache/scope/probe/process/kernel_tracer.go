package process

import (
	"context"
	"io"
	"os/exec"
	"time"
	"fmt"
	"math/rand"

	"github.com/sirupsen/logrus"
	pb "github.com/weaveworks/scope/proto"
	"google.golang.org/grpc"
)

type InfoTracer struct {
	conn    *grpc.ClientConn
	client  pb.KernelOpenTracerClient
	command *exec.Cmd
}

const (
	ebpf_socket_format = "/tmp/%d.sock"
	ebpf_exe_path      = "/home/deepfence/bin/open-tracer"
	ebpf_opt_format    = "--socket-path=%s"
	mem_lock_size      = "--memlock=8388608"
	file_suffixes      = "--match-suffixes=\".so,.jar,.war,.pyc,.whl,.egg,METADATA,PKG-INFO,.gemspec,Rakefile,composer.lock,package.json,.js,.dll,.exe\""
)

func generateSocketString() string {
	rand.Seed(time.Now().UnixNano())
	min := 1000
	max := 9999
	return fmt.Sprintf(ebpf_socket_format, rand.Intn(max - min + 1) + min)
}

func NewInfoTracer() (*InfoTracer, error) {
	ebpf_socket := generateSocketString()
	command := exec.Command("prlimit", mem_lock_size, ebpf_exe_path, fmt.Sprintf(ebpf_opt_format, ebpf_socket), file_suffixes)
	err := command.Start()
	if err != nil {
		return nil, err
	}

	conn, err := grpc.Dial("unix://"+ebpf_socket, grpc.WithAuthority("dummy"), grpc.WithInsecure())
	if err != nil {
		command.Process.Kill()
		return nil, err
	}
	client := pb.NewKernelOpenTracerClient(conn)
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
	stream, err := it.client.GetTraceInfo(ctx, &pb.TraceInfoRequest{Pid: pidstr})
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
