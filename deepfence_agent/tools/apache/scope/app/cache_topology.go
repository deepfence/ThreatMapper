package app

import (
	"context"
	"time"

	redisCache "github.com/weaveworks/scope/cache"
	"github.com/weaveworks/scope/render"
	"github.com/weaveworks/scope/render/detailed"
	"github.com/weaveworks/scope/report"
)

func CacheTopology(reporter Reporter) {
	ctx := context.Background()
	wait := make(chan struct{}, 1)
	reporter.WaitOn(ctx, wait)
	defer reporter.UnWait(ctx, wait)
	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	var rep report.Report
	var err error
	values := make(map[string][]string)

	topologies := map[string]*redisCache.RedisCache{
		hostsID:             redisCache.NewRedisCache(hostsID),
		containersID:        redisCache.NewRedisCache(containersID),
		containersByImageID: redisCache.NewRedisCache(containersByImageID),
		processesID:         redisCache.NewRedisCache(processesID),
		podsID:              redisCache.NewRedisCache(podsID),
		kubeControllersID:   redisCache.NewRedisCache(kubeControllersID),
		servicesID:          redisCache.NewRedisCache(servicesID),
	}

	for {
		select {
		case <-ticker.C:
			rep, err = reporter.Report(ctx, time.Now())
			if err != nil {
				continue
			}
			for topologyID, r := range topologies {
				go func(topologyID string, r *redisCache.RedisCache) {
					renderer, filter, err := topologyRegistry.RendererForTopology(topologyID, values, rep)
					if err != nil {
						return
					}
					rc := RenderContextForReporter(reporter, rep)
					rend := render.Render(ctx, rc.Report, renderer, filter).Nodes
					r.Update(detailed.Summaries(ctx, rc, rend, true))
				}(topologyID, r)
			}
		}
	}
}
