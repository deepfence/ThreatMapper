package procspy

// /proc-based implementation.

import (
	"bytes"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"syscall"
)

var (
	procRoot = "/proc"
)

// SetProcRoot sets the location of the proc filesystem.
func SetProcRoot(root string) {
	procRoot = root
}

// walkProcPid walks over all numerical (PID) /proc entries, and sees if their
// ./fd/* files are symlink to sockets. Returns a map from socket ID (inode)
// to PID. Will return an error if /proc isn't there.
func walkProcPid(buf *bytes.Buffer) (map[uint64]Proc, error) {
	fh, err := os.Open(procRoot)
	if err != nil {
		return nil, err
	}

	dirNames, err := fh.Readdirnames(-1)
	fh.Close()
	if err != nil {
		return nil, err
	}

	var (
		res        = map[uint64]Proc{}
		namespaces = map[uint64]struct{}{}
		stat       syscall.Stat_t
	)
	for _, dirName := range dirNames {
		pid, err := strconv.ParseUint(dirName, 10, 0)
		if err != nil {
			// Not a number, so not a PID subdir.
			continue
		}

		fdBase := filepath.Join(procRoot, dirName, "fd")
		dfh, err := os.Open(fdBase)
		if err != nil {
			// Process is be gone by now, or we don't have access.
			continue
		}

		fdNames, err := dfh.Readdirnames(-1)
		dfh.Close()
		if err != nil {
			continue
		}

		// Read network namespace, and if we haven't seen it before,
		// read /proc/<pid>/net/tcp
		err = syscall.Lstat(filepath.Join(procRoot, dirName, "/ns/net"), &stat)
		if err != nil {
			continue
		}

		if _, ok := namespaces[stat.Ino]; !ok {
			namespaces[stat.Ino] = struct{}{}
			readFile(filepath.Join(procRoot, dirName, "/net/tcp"), buf)
			readFile(filepath.Join(procRoot, dirName, "/net/tcp6"), buf)
		}

		var name string
		for _, fdName := range fdNames {
			// Direct use of syscall.Stat() to save garbage.
			err = syscall.Stat(filepath.Join(fdBase, fdName), &stat)
			if err != nil {
				continue
			}

			// We want sockets only.
			if stat.Mode&syscall.S_IFMT != syscall.S_IFSOCK {
				continue
			}

			if name == "" {
				name = procName(filepath.Join(procRoot, dirName))
				if name == "" {
					break
				}
				if len(name) >= 15 {
					name = procCmdname(filepath.Join(procRoot, dirName))
					if name == "" {
						break
					}
				}
			}

			res[stat.Ino] = Proc{
				PID:  uint(pid),
				Name: name,
			}
		}
	}

	return res, nil
}

// procCmdname does a pid->cmdname(binary/app) lookup.
func procCmdname(base string) string {
	cmdline, err := os.ReadFile(filepath.Join(base, "/cmdline"))
	if err != nil {
		return ""
	}
	ret := strings.FieldsFunc(string(cmdline), func(r rune) bool {
		if r == '\u0000' {
			return true
		}
		return false
	})
	return ret[0]
}

// procName does a pid->name lookup.
func procName(base string) string {
	fh, err := os.Open(filepath.Join(base, "/comm"))
	if err != nil {
		return ""
	}

	name := make([]byte, 64)
	l, err := fh.Read(name)
	fh.Close()
	if err != nil {
		return ""
	}

	if l < 2 {
		return ""
	}

	// drop trailing "\n"
	return string(name[:l-1])
}

// readFile reads an arbitrary file into a buffer. It's a variable so it can
// be overwritten for benchmarks. That's bad practice and we should change it
// to be a dependency.
var readFile = func(filename string, buf *bytes.Buffer) error {
	f, err := os.Open(filename)
	if err != nil {
		return err
	}
	_, err = buf.ReadFrom(f)
	f.Close()
	return err
}
