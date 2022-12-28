import { useRef } from 'react';

import { UpdateManagerType, useGraphUpdateManager } from '../graphManager/updateManager';
import { LayoutType, useLayoutManager } from '../graphManager/useLayoutManager';
import { IGraph } from '../types';
import { topologyEdgesToDelta, topologyNodesToDelta } from './transform';
import { IAPIData } from './utils';

export const useToplogy = (
  graph: IGraph | null,
  options: {
    tick: () => void;
  },
) => {
  const updateManagerRef = useRef<Partial<UpdateManagerType>>({});
  const layoutManagerRef = useRef<LayoutType>({});

  // create layout manager
  const { layout } = useLayoutManager(graph, {
    tick: options.tick,
    onLayoutStart: () => {
      updateManagerRef.current?.pause?.();
    },
    onLayoutEnd: () => {
      updateManagerRef.current?.resume?.();
    },
  });

  // create graph update manager

  const { updateRootNodes, updateEdges, updateNode, processLayouts, pause, resume } =
    useGraphUpdateManager(graph, layoutManagerRef.current?.layout);

  updateManagerRef.current = {
    processLayouts,
    pause,
    resume,
  };

  layoutManagerRef.current = {
    layout,
  };

  const update = (data: IAPIData) => {
    if (!graph) {
      return;
    }
    const edges_delta = topologyEdgesToDelta(data.edges);
    const nodes_delta = topologyNodesToDelta(graph, data.nodes);

    console.log('edges_delta', edges_delta);
    console.log('nodes_delta', nodes_delta);

    if (edges_delta !== null && edges_delta.remove) {
      updateEdges?.({
        add: [],
        update: [],
        remove: edges_delta.remove,
        reset: data.reset,
      });
    }

    if (nodes_delta !== null) {
      let reset = data.reset;
      for (const parent_id of Object.keys(nodes_delta)) {
        if (parent_id === 'root') {
          updateRootNodes?.({
            ...nodes_delta[parent_id],
            reset,
          });
        } else {
          updateNode?.(parent_id, {
            ...nodes_delta[parent_id],
            reset,
          });
        }
        reset = false;
      }
    }
    if (edges_delta !== null) {
      updateEdges?.({ add: edges_delta.add, remove: [], update: [] });
    }
    // TODO: Lets check calling processLayouts after all nodes and edges are created cause issue or not.
    // this actually helps to layout once with edges and nodes
    updateManagerRef.current?.processLayouts?.();
  };

  return {
    update, // update is the only api to be called everytime we received data
  };
};
