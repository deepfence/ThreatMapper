// Package procspy lists TCP connections, and optionally tries to find the
// owning processes. Works on Linux (via /proc) and Darwin (via `lsof -i` and
// `netstat`). You'll need root to use Processes().
package procspy

import (
	"net"
)

/*
tcpStates
---------------------
TCPF_ESTABLISHED = 1,
TCPF_SYN_SENT	 = 2,
TCPF_SYN_RECV	 = 3,
TCPF_FIN_WAIT1	 = 4,
TCPF_FIN_WAIT2	 = 5,
TCPF_TIME_WAIT	 = 6,
TCPF_CLOSE	     = 7,
TCPF_CLOSE_WAIT	 = 8,
TCPF_LAST_ACK	 = 9,
TCPF_LISTEN	     = 10,
TCPF_CLOSING	 = 11,
TCPF_NEW_SYN_RECV = 12,
*/
var (
	tcpStates []uint // according to /include/net/tcp_states.h
	localIps  []string
)

// Connection is a (TCP) connection. The Proc struct might not be filled in.
type Connection struct {
	Transport      string
	InOutBoundType string
	LocalAddress   net.IP
	LocalPort      uint16
	RemoteAddress  net.IP
	RemotePort     uint16
	inode          uint64
	Proc
}

// Proc is a single process with PID and process name.
type Proc struct {
	PID  uint
	Name string
}

// ConnIter is returned by Connections().
type ConnIter interface {
	Next() *Connection
}

// Connections returns all established (TCP) connections.  If processes is
// false we'll just list all TCP connections, and there is no need to be root.
// If processes is true it'll additionally try to lookup the process owning the
// connection, filling in the Proc field. You will need to run this as root to
// find all processes.
func Connections(processes bool, tcpStatesSlice []uint, localIpList []string) (ConnIter, error) {
	tcpStates = tcpStatesSlice
	localIps = localIpList
	return cbConnections(processes)
}
