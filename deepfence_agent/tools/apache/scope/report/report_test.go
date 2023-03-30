package report_test

import (
	"reflect"
	"testing"

	"github.com/weaveworks/scope/report"
)

func newu64(value uint64) *uint64 { return &value }

// Make sure we don't add a topology and miss it in the Topologies method.
func TestReportTopologies(t *testing.T) {
	var (
		reportType   = reflect.TypeOf(report.MakeReport())
		topologyType = reflect.TypeOf(report.MakeTopology())
	)

	var want, have int
	for i := 0; i < reportType.NumField(); i++ {
		if reportType.Field(i).Type == topologyType {
			want++
		}
	}

	r := report.MakeReport()
	r.WalkTopologies(func(_ *report.Topology) {
		have++
	})
	if want != have {
		t.Errorf("want %d, have %d", want, have)
	}
}

func TestReportTopology(t *testing.T) {
	r := report.MakeReport()
	if _, ok := r.Topology(report.Container); !ok {
		t.Errorf("Expected %s topology to be found", report.Container)
	}
	if _, ok := r.Topology("foo"); ok {
		t.Errorf("Expected %s topology not to be found", "foo")
	}
}
