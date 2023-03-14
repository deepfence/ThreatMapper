import { useRef } from 'react';

import { useGraphLayoutManager } from '@/features/topology/hooks/useGraphLayoutManager';
import { useGraphUpdateManager } from '@/features/topology/hooks/useGraphUpdateManager';
import { ApiDiff, G6Graph } from '@/features/topology/types/graph';
import {
  convertApiEdgesDiffToModelEdgesDiff,
  convertApiNodesDiffToModelNodesDiff,
} from '@/features/topology/utils/g6ModelTransforms';
/**
 * what does this do?
 * exposes a singular layout function, whose job is to
 * update the graph with delta and queue the layouts.
 */
export function useTopology(
  graph: G6Graph | null,
  options: {
    tick: () => void;
  },
) {
  const updateManagerRef =
    useRef<
      Pick<
        ReturnType<typeof useGraphUpdateManager>,
        'pause' | 'resume' | 'processLayouts'
      >
    >();
  const layoutManagerRef =
    useRef<Pick<ReturnType<typeof useGraphLayoutManager>, 'layout'>>();

  const { layout } = useGraphLayoutManager(graph, {
    tick: options.tick,
    onLayoutStart: () => {
      updateManagerRef.current?.pause?.();
    },
    onLayoutEnd: () => {
      updateManagerRef.current?.resume?.();
    },
  });

  const { updateRootNodes, updateEdges, updateNode, processLayouts, pause, resume } =
    useGraphUpdateManager(graph, layoutManagerRef.current?.layout);
  updateManagerRef.current = {
    pause,
    resume,
    processLayouts,
  };
  layoutManagerRef.current = {
    layout,
  };

  const update = (apiDiff: ApiDiff): void => {
    if (!graph) return;
    const modelNodesDiff = convertApiNodesDiffToModelNodesDiff(graph, apiDiff.nodesDiff);
    const modelEdgesDiff = convertApiEdgesDiffToModelEdgesDiff(apiDiff.edgesDiff);

    if (modelEdgesDiff.remove.length) {
      updateEdges?.({
        add: [],
        update: [],
        remove: modelEdgesDiff.remove,
      });
    }

    if (Object.keys(modelNodesDiff).length) {
      for (const parentId of Object.keys(modelNodesDiff)) {
        if (parentId === 'root') {
          updateRootNodes?.({
            ...modelNodesDiff[parentId],
          });
        } else {
          updateNode?.(parentId, {
            ...modelNodesDiff[parentId],
          });
        }
      }
    }

    if (modelEdgesDiff.add.length) {
      updateEdges?.({
        add: modelEdgesDiff.add,
        update: [],
        remove: [],
      });
    }

    updateManagerRef.current?.processLayouts?.();
  };

  return { update };
}
