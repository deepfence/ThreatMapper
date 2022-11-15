import {
  IAPIData,
  updateGraphEdges,
  updateGraphNode,
  updateGraphRootNodes,
} from '../../topology/utils';
import { APIDeltaType, IGraph, InputLayoutOptions, UpdateDeltaType } from '../types';
import { itemIsExpanded, itemIsExpanding } from './expand-collapse';
import { LayoutType } from './useLayoutManager';

export type UpdateManagerType = {
  updateRootNodes: (delta: APIDeltaType) => void;
  updateEdges: (delta: APIDeltaType) => void;
  updateNode: (node_id: string, delta: APIDeltaType) => void;
  resume: () => void;
  pause: () => void;
};

export const useGraphUpdateManager = (
  graph: IGraph | null,
  layout?: LayoutType['layout'],
) => {
  if (graph === null) {
    return {};
  }
  let updates: UpdateDeltaType[] = [];
  let layouts: {
    node_id: string;
    options?: InputLayoutOptions;
  }[] = [];

  let paused = false;

  function maybeProcess() {
    if (!paused) {
      processUpdates();
      processLayouts();
    }
  }

  function queueLayout(node_id: string, options?: InputLayoutOptions) {
    layouts.push({ node_id, options });
  }
  function processRootUpdate(delta: APIDeltaType) {
    updateGraphRootNodes(graph!, delta);
    queueLayout('root');
  }
  function processNodeUpdate(node_id: string, delta: IAPIData['nodes']) {
    const item = graph?.findById(node_id);
    if (item === undefined) {
      console.error("received update for a node that doesn't exist", node_id, delta);
      return;
    }

    if (!itemIsExpanded(item)) {
      // this can happen if we get an update before the backend has received
      // our message where we told it the node was collapsed
      console.warn('ignoring node update as the node is not expanded', node_id, delta);
      return;
    }

    const expanding = itemIsExpanding(item);

    updateGraphNode(graph!, item, delta);

    let size = 0;
    if (!delta) {
      return;
    }

    if (delta.add) {
      size = delta.add.length;
    }
    if (delta.remove) {
      size += delta.remove.length;
    }

    if (size > 0) {
      queueLayout(node_id, {
        expanding,
        refreshOnTick: expanding || size > 30,
      });
    }
  }

  function processEdgesUpdate(delta: IAPIData['edges']) {
    updateGraphEdges(graph!, delta);
  }

  function processUpdates() {
    for (const up of updates) {
      if (up.root) {
        try {
          processRootUpdate(up.root.delta);
        } catch (e) {
          console.error('Error on processUpdates', e);
        }
      } else if (up.node) {
        const { node_id, delta } = up.node;
        try {
          processNodeUpdate(node_id, delta);
        } catch (e) {
          console.error('node update failed', node_id, e);
        }
      } else if (up.edges) {
        processEdgesUpdate(up.edges.delta);
      }
    }
    // after every update it will reset the updates list
    updates = [];
  }

  function processLayouts() {
    console.log('layouts:', layouts);
    for (const { node_id, options } of layouts) {
      layout?.(node_id, options);
    }
    // after every update it will reset the layouts list
    layouts = [];
  }

  // following are the export api methods

  const updateRootNodes = (delta: APIDeltaType) => {
    updates.push({ root: { delta } });
    maybeProcess();
  };

  const updateEdges = (delta: IAPIData['edges']) => {
    updates.push({ edges: { delta } });
    maybeProcess();
  };

  const updateNode = (node_id: string, delta: IAPIData['nodes']) => {
    updates.push({ node: { node_id, delta } });
    maybeProcess();
  };

  const resume = () => {
    paused = false;
    maybeProcess();
  };

  const pause = () => {
    paused = true;
  };

  return {
    updateRootNodes,
    updateEdges,
    updateNode,
    resume,
    pause,
  };
};
