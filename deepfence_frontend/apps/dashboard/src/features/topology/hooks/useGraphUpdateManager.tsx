import { useRef } from 'react';

import { useGraphLayoutManager } from '@/features/topology/hooks/useGraphLayoutManager';
import {
  EnhancedDiff,
  G6Graph,
  InputLayoutOptions,
} from '@/features/topology/types/graph';
import {
  isItemExpanded,
  isItemExpanding,
} from '@/features/topology/utils/expand-collapse';
import {
  updateGraphEdges,
  updateGraphNode,
  updateGraphRootNodes,
} from '@/features/topology/utils/updates';

export function useGraphUpdateManager(
  graph: G6Graph | null,
  layout?: ReturnType<typeof useGraphLayoutManager>['layout'],
) {
  const pausedRef = useRef(false);
  const updatesRef = useRef<
    Array<
      | { root: { diff: EnhancedDiff['nodesDiff'] } }
      | { node: { nodeId: string; diff: EnhancedDiff['nodesDiff'] } }
      | { edges: { diff: EnhancedDiff['edgesDiff'] } }
    >
  >([]);

  const layoutsRef = useRef<
    Array<{
      nodeId: string;
      options?: InputLayoutOptions;
    }>
  >([]);

  const maybeProcess = () => {
    if (!pausedRef.current) {
      processUpdates();
    }
  };

  const updateRootNodes = (diff: EnhancedDiff['nodesDiff']) => {
    updatesRef.current.push({ root: { diff } });
    maybeProcess();
  };

  const updateEdges = (diff: EnhancedDiff['edgesDiff']) => {
    updatesRef.current.push({ edges: { diff } });
    maybeProcess();
  };

  const updateNode = (nodeId: string, diff: EnhancedDiff['nodesDiff']) => {
    updatesRef.current.push({ node: { nodeId, diff } });
    maybeProcess();
  };

  const resume = () => {
    pausedRef.current = false;
    maybeProcess();
  };

  const pause = () => {
    pausedRef.current = true;
  };

  const processLayouts = () => {
    for (const { nodeId, options } of layoutsRef.current) {
      layout?.(nodeId, options);
    }
    // after every update it will reset the layouts list
    layoutsRef.current = [];
  };

  function queueLayout(nodeId: string, options?: InputLayoutOptions) {
    layoutsRef.current.push({ nodeId, options });
  }

  function processRootUpdate(diff: EnhancedDiff['nodesDiff']) {
    updateGraphRootNodes(graph!, diff);
    queueLayout('root');
  }

  function processNodeUpdate(nodeId: string, diff: EnhancedDiff['nodesDiff']) {
    const item = graph?.findById(nodeId);
    if (item === undefined) {
      console.error("received update for a node that doesn't exist", nodeId, diff);
      return;
    }

    if (!isItemExpanded(item)) {
      // this can happen if we get an update before the backend has received
      // our message where we told it the node was collapsed
      console.warn('ignoring node update as the node is not expanded', nodeId, diff);
      return;
    }

    const expanding = isItemExpanding(item);
    updateGraphNode(graph!, item, diff);

    let size = 0;
    if (!diff) {
      return;
    }

    if (diff.add) {
      size = diff.add.length;
    }
    if (diff.remove) {
      size += diff.remove.length;
    }

    // TODO: Explain me size concept used here, 30 threshold seems quite high
    if (size > 0) {
      queueLayout(nodeId, {
        expanding,
        refreshOnTick: expanding || size > 30,
      });
    }
  }

  function processEdgesUpdate(delta: EnhancedDiff['edgesDiff']) {
    updateGraphEdges(graph!, delta);
  }

  function processUpdates() {
    for (const up of updatesRef.current) {
      if ('root' in up) {
        try {
          processRootUpdate(up.root.diff);
        } catch (e) {
          console.error('Error on processUpdates', e);
        }
      } else if ('node' in up) {
        const { nodeId, diff } = up.node;
        try {
          processNodeUpdate(nodeId, diff);
        } catch (e) {
          console.error('node update failed', nodeId, e);
        }
      } else if ('edges' in up) {
        processEdgesUpdate(up.edges.diff);
      }
    }
    // after every update it will reset the updates list
    updatesRef.current = [];
  }

  if (!graph) return {};

  return {
    pause,
    resume,
    updateRootNodes,
    updateNode,
    updateEdges,
    processLayouts,
  };
}
