package procspy

import (
	"bytes"
	"sync"
)

var bufPool = sync.Pool{
	New: func() interface{} {
		return bytes.NewBuffer(make([]byte, 0, 5000))
	},
}

type pnConnIter struct {
	pn    *ProcNet
	buf   *bytes.Buffer
	procs map[uint64]Proc
}

func (c *pnConnIter) Next() *Connection {
	n := c.pn.Next()
	if n == nil {
		// Done!
		bufPool.Put(c.buf)
		return nil
	}
	if proc, ok := c.procs[n.inode]; ok {
		n.Proc = proc
	}
	return n
}

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

// cbConnections sets Connections()
var cbConnections = func(processes bool, tcpStates []uint, localIps []string) (ConnIter, error) {
	// buffer for contents of /proc/<pid>/net/tcp
	buf := bufPool.Get().(*bytes.Buffer)
	buf.Reset()

	var procs map[uint64]Proc
	if processes {
		var err error
		if procs, err = walkProcPid(buf); err != nil {
			return nil, err
		}
	}

	if buf.Len() == 0 {
		readFile(procRoot+"/net/tcp", buf)
		readFile(procRoot+"/net/tcp6", buf)
	}

	return &pnConnIter{
		pn:    NewProcNet(buf.Bytes(), tcpStates, localIps),
		buf:   buf,
		procs: procs,
	}, nil
}
