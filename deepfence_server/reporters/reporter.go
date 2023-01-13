package reporters

import "context"

type TopologyReporter interface {
	Graph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	HostGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	KubernetesGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	ContainerGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
	PodGraph(ctx context.Context, filters TopologyFilters) (RenderedGraph, error)
}
