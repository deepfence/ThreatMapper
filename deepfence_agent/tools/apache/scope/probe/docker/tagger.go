package docker

import (
	"github.com/weaveworks/scope/probe/process"
	"github.com/weaveworks/scope/report"
)

// Node metadata keys.
const (
	ContainerID = report.DockerContainerID
	Name        = report.Name
)

// These vars are exported for testing.
var (
	NewProcessTreeStub = process.NewTree
)

// Tagger is a tagger that tags Docker container information to process
// nodes that have a PID.
type Tagger struct {
	registry   Registry
	procWalker process.Walker
	hostName   string
}

// NewTagger returns a usable Tagger.
func NewTagger(registry Registry, hostID string, procWalker process.Walker) *Tagger {
	return &Tagger{
		registry:   registry,
		hostName:   hostID,
		procWalker: procWalker,
	}
}

// Name of this tagger, for metrics gathering
func (Tagger) Name() string { return "Docker" }

// Tag implements Tagger.
func (t *Tagger) Tag(r report.Report) (report.Report, error) {
	tree, err := NewProcessTreeStub(t.procWalker)
	if err != nil {
		return report.MakeReport(), err
	}
	t.tag(tree, &r.Process)

	return r, nil
}

func (t *Tagger) tag(tree process.Tree, processTopology *report.Topology) {
	for _, node := range *processTopology {
		if node.Metadata.Pid < 0 {
			continue
		}
		var (
			c         Container
			candidate = node.Metadata.Pid
			err       error
		)

		t.registry.LockedPIDLookup(func(lookup func(int) Container) {
			for {
				c = lookup(candidate)
				if c != nil {
					break
				}

				candidate, err = tree.GetParent(candidate)
				if err != nil {
					break
				}
			}
		})

		if c == nil || ContainerIsStopped(c) || c.PID() == 1 {
			continue
		}

		if node.Parents.Host == "" {
			node.Parents.Host = t.hostName
		}
		node.Parents.Container = c.ID()
		if image, ok := t.registry.GetContainerImage(c.Image()); ok {
			node.Parents.ContainerImage = image.ID
		}
	}
}
