package server

import (
	"net"
	"net/rpc"

	"github.com/deepfence/ThreatMapper/deepfence_bootstrapper/supervisor"
	"github.com/deepfence/golang_deepfence_sdk/utils/log"
)

type Server struct{}

type UpgradeArgs struct {
	Name string
	Url  string
}

type Reply struct{}

func (s *Server) Upgrade(args *UpgradeArgs, _ *Reply) error {
	return supervisor.UpgradeProcess(args.Name, args.Url)
}

func (s *Server) Start(args *UpgradeArgs, _ *Reply) error {
	return supervisor.StartProcess(args.Name)
}

func (s *Server) Stop(args *UpgradeArgs, _ *Reply) error {
	return supervisor.StopProcess(args.Name)
}

func StartRPCServer(socket_path string, stop chan struct{}) error {
	rpcServer := rpc.NewServer()
	server := &Server{}
	rpcServer.Register(server)
	la, err := net.Listen("unix", socket_path)
	if err != nil {
		return err
	}
	go func() {
		rpcServer.Accept(la)
		select {
		case <-stop:
		}
		la.Close()
		log.Info().Msgf("Server exited.")
	}()
	return nil
}
