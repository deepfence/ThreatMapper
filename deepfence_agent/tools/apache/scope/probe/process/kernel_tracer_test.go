package process_test

import (
	"strings"
	"testing"

	"github.com/weaveworks/scope/probe/process"
)

func TestTracer(t *testing.T) {
	pidstr := "1234"
	pathstr := "path"
	r := strings.NewReader("hello\ncomm," + pidstr + "," + pathstr)
	process.TraceOpenFiles(r)
	path := process.GetOpenFileList("1234")

	if path != pathstr {
		t.Errorf("Value not retrieved properly")
	}
}
