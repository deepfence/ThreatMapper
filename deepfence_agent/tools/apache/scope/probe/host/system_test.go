package host_test

import (
	"fmt"
	"strings"
	"testing"

	"github.com/weaveworks/scope/probe/host"
)

func TestGetKernelVersion(t *testing.T) {
	release, version, err := host.GetKernelReleaseAndVersion()
	if err != nil {
		t.Fatal(err)
	}
	have := fmt.Sprintf("%s %s", release, version)
	if strings.Contains(have, "unknown") {
		t.Fatal(have)
	}
	t.Log(have)
}

func TestGetUptime(t *testing.T) {
	have, err := host.GetUptime()
	if err != nil {
		t.Fatal(err)
	}
	if have == 0 {
		t.Fatal(have)
	}
	t.Log(have.String())
}
