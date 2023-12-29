import {
  ApiDiff,
  ComboModel,
  EnhancedDiff,
  G6Combo,
  G6Edge,
  G6Graph,
  G6Node,
  InputLayoutOptions,
  NodeModel,
  OutputLayoutOptions,
  TopologyAction,
} from '@/features/topology/types/graph';
import { itemExpandsAsCombo } from '@/features/topology/utils/expand-collapse';
import {
  convertApiEdgesDiffToModelEdgesDiff,
  convertApiNodesDiffToModelNodesDiff,
} from '@/features/topology/utils/g6-model-transforms';
import { pointAround } from '@/features/topology/utils/gForce';
import {
  buildLayoutOptions,
  LayoutExecutor,
} from '@/features/topology/utils/graph-layout';
import { getNodeIconConfig, nodeStyle } from '@/features/topology/utils/graph-styles';
import { Mode } from '@/theme/ThemeContext';

export const updateGraph = (
  theme: Mode,
  graph: G6Graph,
  apiDiff: ApiDiff,
  action: TopologyAction,
) => {
  const modelNodesDiff = convertApiNodesDiffToModelNodesDiff(graph, apiDiff.nodesDiff);
  const modelEdgesDiff = convertApiEdgesDiffToModelEdgesDiff(apiDiff.edgesDiff);

  const updates: Array<
    | { root: { diff: EnhancedDiff['nodesDiff'] } }
    | { node: { nodeId: string; diff: EnhancedDiff['nodesDiff'] } }
    | { edges: { diff: EnhancedDiff['edgesDiff'] } }
  > = [];

  // START: collecting the updates to graph
  if (modelEdgesDiff.remove.length) {
    updates.push({
      edges: {
        diff: {
          add: [],
          update: [],
          remove: modelEdgesDiff.remove,
        },
      },
    });
  }
  if (Object.keys(modelNodesDiff).length) {
    for (const parentId of Object.keys(modelNodesDiff)) {
      if (parentId === 'root') {
        updates.push({ root: { diff: modelNodesDiff[parentId] } });
      } else {
        updates.push({ node: { nodeId: parentId, diff: modelNodesDiff[parentId] } });
      }
    }
  }
  if (modelEdgesDiff.add.length) {
    updates.push({
      edges: {
        diff: {
          add: modelEdgesDiff.add,
          update: [],
          remove: [],
        },
      },
    });
  }
  // END: collecting the updates to graph

  // START: processing updates and collecting layouts
  const layouts: Array<{
    nodeId: string;
    options?: InputLayoutOptions;
  }> = [];
  for (const update of updates) {
    if ('root' in update) {
      try {
        processRootUpdate(theme, graph, update.root.diff);
        layouts.push({ nodeId: 'root' });
      } catch (e) {
        console.error('Error on processUpdates', e);
      }
    } else if ('node' in update) {
      const { nodeId, diff } = update.node;
      try {
        const expanding = isExpanding(nodeId, action);
        processNodeUpdate(theme, graph, nodeId, diff, expanding);
        layouts.push({
          nodeId,
          options: {
            expanding,
            refreshOnTick: expanding,
          },
        });
      } catch (e) {
        console.error('node update failed', nodeId, e);
      }
    } else if ('edges' in update) {
      processEdgesUpdate(graph, update.edges.diff);
    }
  }
  // END: processing updates and collecting layouts

  // START: executing layouts
  for (const layout of layouts) {
    const layoutOptions = buildLayoutOptions(
      graph,
      layout.nodeId,
      layout.options ?? null,
    );
    if (!layoutOptions) continue;
    const executor = buildExecutor(
      layoutOptions.nodes,
      layoutOptions.edges,
      layoutOptions.options,
    );
    executor.start();
  }
  // END: executing layouts
};

function processRootUpdate(theme: Mode, graph: G6Graph, diff: EnhancedDiff['nodesDiff']) {
  for (const nodeId of diff.remove) {
    const node = graph.findById(nodeId) as G6Node | undefined;
    if (!node) {
      console.error('trying to remove unknown root node', nodeId);
      continue;
    }
    removeNodeItem(graph, node);
  }

  const center_x = graph.getWidth() / 2;
  const center_y = graph.getHeight() / 2;

  for (const node of diff.add) {
    graph.addItem('node', {
      ...node,
      x: pointAround(center_x),
      y: pointAround(center_y),
      style: nodeStyle(theme, node, {}),
      type: 'circle',
      icon: getNodeIconConfig(theme, node) ?? undefined,
    });
  }
}

function processNodeUpdate(
  theme: Mode,
  graph: G6Graph,
  nodeId: string,
  diff: EnhancedDiff['nodesDiff'],
  expanding: boolean,
) {
  if (diff.remove.length) {
    for (const nodeIdToRemove of diff.remove) {
      const nodeToRemove = graph.findById(nodeIdToRemove) as G6Node | undefined;
      if (!nodeToRemove) {
        console.error('error removing non existing node', nodeIdToRemove);
        continue;
      }
      removeNodeItem(graph, nodeToRemove);
      // TODO: try to see if parent was expanded combo and if it was remove the combo itself if there is no children
      const comboId = `${nodeId}-combo`;
      const combo = graph.findById(comboId) as G6Combo | undefined;
      const comboNodes = combo?.getNodes?.() as G6Node[] | undefined;
      if (combo && comboNodes?.length && comboNodes?.length === 1) {
        removeNodeItem(graph, comboNodes[0]);
        removeComboItem(graph, combo);
      }
    }
  }

  if (diff.add.length) {
    const item = graph.findById(nodeId) as G6Node | undefined;
    if (!item) {
      console.error("received update for a node that doesn't exist", nodeId, diff);
      return;
    }
    const itemModel = item.getModel() as NodeModel;

    if (itemExpandsAsCombo(item)) {
      // create combo here
      // TODO: do not check expanding, check for existing combo
      if (expanding) addCombo(graph, item);
      // Process add nodes to combo
      const comboId = `${itemModel.id}-combo`;
      const combo = graph.findById(comboId) as G6Combo;
      const comboModel = combo.get('model') as ComboModel;
      const center_id = comboModel?.center_ids?.[0];
      const center_model = graph.findById(center_id!).get('model') as NodeModel;
      const numNodesInCombo =
        combo?.getChildren?.()?.nodes?.length ?? 0 + diff.add.length;
      for (const nodeToAdd of diff.add) {
        graph.addItem('node', {
          ...nodeToAdd,
          style: nodeStyle(theme, nodeToAdd, {}),
          parent_id: itemModel.id,
          comboId: comboId,
          x: numNodesInCombo > 1 ? pointAround(center_model.x!) : center_model.x,
          y: numNodesInCombo > 1 ? pointAround(center_model.y!) : center_model.y,
          type: 'circle',
          icon: getNodeIconConfig(theme, nodeToAdd) ?? undefined,
        });

        graph.addItem('edge', {
          ...pseudoEdge(center_id!, nodeToAdd.id ?? ''),
          combo_pseudo_inner: true,
          style: { lineWidth: 0, endArrow: false },
        });
      }
    } else {
      for (const nodeToAdd of diff.add) {
        const existingNode = graph.findById(nodeToAdd.id!) as G6Node | undefined;
        if (existingNode) {
          console.error('error adding a node that already exists', nodeToAdd.id);
          continue;
        }
        const addedNode = graph.addItem('node', {
          ...nodeToAdd,
          x: pointAround(itemModel.x!),
          y: pointAround(itemModel.y!),
          parent_id: nodeId,
          style: nodeStyle(theme, nodeToAdd, {}),
          type: 'circle',
          icon: getNodeIconConfig(theme, nodeToAdd) ?? undefined,
        }) as G6Node;
        graph.addItem('edge', {
          ...pseudoEdge(nodeId, nodeToAdd.id!),
        });
        addedNode.refresh();
      }
    }
  }
}

function processEdgesUpdate(graph: G6Graph, diff: EnhancedDiff['edgesDiff']) {
  if (diff.add) {
    for (const edge of diff.add) {
      const sourceNode = graph.findById(edge.source ?? '')?.get('model') as
        | NodeModel
        | undefined;
      if (!sourceNode) {
        console.error('edge source does not exist', edge);
        continue;
      }
      const targetNode = graph.findById(edge.target ?? '')?.get('model') as
        | NodeModel
        | undefined;
      if (!targetNode) {
        console.error('edge target does not exist', edge);
        continue;
      }

      graph.addItem('edge', {
        ...edge,
        connection: true,
        type: edge.source === edge.target ? 'loop' : undefined,
      });
    }
  }

  if (diff.remove) {
    for (const edge of diff.remove) {
      const id = `${edge.source}-${edge.target}`;
      const item = graph.findById(id) as G6Edge | undefined;
      if (!item) {
        console.warn("trying to remove edge that doesn't exist", edge.id);
        continue;
      }

      removeEdgeItem(graph, item);
    }
  }
}

function addCombo(graph: G6Graph, item: G6Node) {
  const model = item.get('model') as NodeModel;
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;

  graph.createCombo(
    {
      id: combo_id,
      parent_id: node_id,
      node_type: 'combo',
      center_ids: [],
      x: pointAround(model.x!, 50),
      y: pointAround(model.y!, 50),
    },
    [],
  );

  const combo = graph.findById(combo_id);
  const combo_model = combo.get('model') as ComboModel;

  const center_id = `${combo_id}-center`;
  // This node will be an invisible node that lie at the center of combo layout nodes which
  // helps to pull all other nodes at its center
  graph.addItem('node', {
    id: center_id,
    node_type: 'combo_center',
    parent_id: combo_id,
    comboId: combo_id,
    size: 1,
    style: {
      opacity: 0,
    },
    x: combo_model.x,
    y: combo_model.y,
  });
  combo_model.center_ids?.push(center_id);

  // this is the edge between the parent node and the combo. The gForce layout
  // skips this during layout
  graph.addItem('edge', {
    ...pseudoEdge(node_id, combo_id),
    combo_pseudo: true,
    type: 'line',
    style: { endArrow: false },
  });

  // this is an extra invisible edge between the parent node and the center of
  // the combo. Since the combo edge above is skipped, we create this one to
  // keep the combo close to its parent. See the edgeStrength code handling
  // combo_pseudo.
  // I see without this edge, combos are overlaped
  graph.addItem('edge', {
    ...pseudoEdge(node_id, center_id),
    combo_pseudo_center: true,
    style: {
      lineWidth: 0,
      endArrow: false,
    },
  });
}

function removeNodeItem(graph: G6Graph, item: G6Node) {
  for (const edge of item.getEdges()) {
    graph.removeItem(edge);
  }

  graph.removeItem(item);
}

function removeComboItem(graph: G6Graph, item: G6Combo) {
  for (const edge of item.getEdges()) {
    graph.removeItem(edge);
  }

  graph.removeItem(item);
}

function removeEdgeItem(graph: G6Graph, item: G6Edge) {
  graph.removeItem(item);
}

function isExpanding(nodeId: string, action: TopologyAction) {
  return action.type === 'expandNode' && action.nodeId === nodeId;
}

const buildExecutor = (
  nodes: G6Node[],
  edges: G6Edge[],
  layoutOptions: OutputLayoutOptions['options'],
) => {
  return new LayoutExecutor(nodes, edges, {
    ...layoutOptions,
    tick: () => {
      // if (options?.tick) {
      //   options.tick();
      // }

      if (layoutOptions?.tick) {
        layoutOptions.tick();
      }
    },
    onLayoutEnd: () => {
      // layoutEnded();
      try {
        if (layoutOptions?.onLayoutEnd) {
          layoutOptions.onLayoutEnd();
        }

        // if (options?.onLayoutEnd) {
        //   options.onLayoutEnd();
        // }
      } catch (e) {
        console.error('onLayoutEnd failed', e);
      }
    },
  });
};

function pseudoEdge(source: string, target: string) {
  return {
    source,
    target,
    pseudo: true,
  };
}
