package server

import (
	"context"
	"net"
	"net/rpc"
	"os"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/supervisor"
	"github.com/deepfence/ThreatMapper/deepfence_utils/log"
)

type Server struct{}

type UpgradeArgs struct {
	Name string
	URL  string
}

type Reply struct{}

func (s *Server) Upgrade(args *UpgradeArgs, _ *Reply) error {
	return supervisor.UpgradeProcessFromURL(args.Name, args.URL)
}

func (s *Server) Start(args *UpgradeArgs, _ *Reply) error {
	return supervisor.StartProcess(args.Name)
}

func (s *Server) Stop(args *UpgradeArgs, _ *Reply) error {
	return supervisor.StopProcess(args.Name)
}

func StartRPCServer(ctx context.Context, socketPath string) error {
	rpcServer := rpc.NewServer()
	server := &Server{}
	err := rpcServer.Register(server)
	if err != nil {
		return err
	}
	_ = os.Remove(socketPath)
	la, err := net.Listen("unix", socketPath)
	if err != nil {
		return err
	}
	go func() {
		rpcServer.Accept(la)
		log.Info().Msgf("Server exited.")
	}()

	go func() {
		<-ctx.Done()
		la.Close()
	}()
	return nil
}
