import {
  ComboModel,
  EdgeModel,
  EnhancedDetailedNodeSummary,
  EnhancedDiff,
  G6Edge,
  G6Graph,
  G6Item,
  G6Node,
  NodeModel,
} from '@/features/topology/types/graph';
import {
  collapseNode,
  finishExpandingNode,
  isItemExpanded,
  isItemExpanding,
  itemExpandsAsCombo,
  removeNodeItem,
} from '@/features/topology/utils/expand-collapse';
import { pointAround } from '@/features/topology/utils/gForce';
import { COLORS } from '@/features/topology/utils/theme';

const updateSimpleNode = (
  graph: G6Graph,
  item: G6Item,
  diff: EnhancedDiff['nodesDiff'],
) => {
  if (diff.remove) {
    removeNodesSimple(graph, item, diff.remove);
  }

  if (diff.add) {
    addNodesSimple(graph, item, diff.add);
  }
};

export function updateGraphNode(
  graph: G6Graph,
  item: G6Item,
  diff: EnhancedDiff['nodesDiff'],
) {
  if (isItemExpanding(item)) {
    finishExpandingNode(graph, item);
  }

  if (itemExpandsAsCombo(item)) {
    updateComboNode(graph, item, diff);
    return;
  }

  updateSimpleNode(graph, item, diff);
}

const updateComboNode = (
  graph: G6Graph,
  item: G6Item,
  diff: EnhancedDiff['nodesDiff'],
) => {
  if (diff.remove) {
    removeNodesCombo(graph, item, diff.remove);
  }

  if (diff.add) {
    addNodesCombo(graph, item, diff.add);
  }
};

const addNodesSimple = (
  graph: G6Graph,
  parent: G6Item,
  nodes: EnhancedDetailedNodeSummary[],
) => {
  const parentModel = parent.get('model') as NodeModel;
  const parentId = parentModel.id;
  const childrenIds = parentModel.children_ids;

  for (const node of nodes) {
    const item = graph.findById(node.id ?? '');
    if (item !== undefined) {
      console.error(
        `trying to add node that is already in the graph (parent=${parentId})`,
        node,
      );
      continue;
    }

    const node_item = graph.addItem('node', {
      ...node,
      x: pointAround(parentModel.x!),
      y: pointAround(parentModel.y!),
      parent_id: parentId,
      style: { ...nodeStyle(node, {}) },
      children_ids: new Set(),
    }) as G6Item;
    graph.addItem('edge', {
      ...pseudoEdge(parentId, node.id ?? ''),
    });
    childrenIds?.add(node.id!);
    node_item.refresh();
  }
};

const removeNodesSimple = (graph: G6Graph, parent: G6Item, nodes: string[]) => {
  const parentModel = parent.get('model') as NodeModel;
  const childrenIds = parentModel.children_ids;

  for (const childNodeId of nodes) {
    const child = graph.findById(childNodeId) as G6Node;
    if (!child || !childrenIds?.has(childNodeId)) {
      console.error('trying to remove an unknown child', childNodeId);
      continue;
    }
    childrenIds.delete(childNodeId);

    if (isItemExpanded(child)) {
      collapseNode(graph, child, undefined, false);
    }
    removeNodeItem(graph, child);
  }
};

const removeNodesCombo = (graph: G6Graph, parent: G6Item, nodes: string[]) => {
  const parentModel = parent.get('model') as NodeModel;
  const parentNodeId: string = parentModel.id;
  const comboId = `${parentNodeId}-combo`;
  const comboModel = graph.findById(comboId).get('model') as ComboModel;
  const comboChildrenIds = comboModel.children_ids;

  for (const node_id of nodes) {
    if (!comboChildrenIds?.has(node_id)) {
      console.error('trying to remove unknown child from combo', comboId, node_id);
      continue;
    }
    comboChildrenIds.delete(node_id);

    const item = graph.findById(node_id) as G6Node;
    if (isItemExpanded(item)) {
      collapseNode(graph, item);
    }
    removeNodeItem(graph, item);
  }
};

const addNodesCombo = (
  graph: G6Graph,
  parent: G6Item,
  nodes: EnhancedDetailedNodeSummary[],
) => {
  const parentModel = parent.get('model') as NodeModel;
  const parentNodeId = parentModel.id;
  const combo_id = `${parentNodeId}-combo`;

  const combo = graph.findById(combo_id);
  const comboModel = combo.get('model') as ComboModel;
  const comboChildrenIds = comboModel.children_ids;

  const center_id = comboModel?.center_ids?.[0];
  const center_model = graph.findById(center_id!).get('model') as NodeModel;

  const n_nodes = (comboChildrenIds?.size ?? 0) + nodes.length;

  for (const node of nodes) {
    graph.addItem('node', {
      ...node,
      style: {
        ...nodeStyle(node, {}),
      },
      parent_id: parentNodeId,
      comboId: combo_id,
      children_ids: new Set([]),
      x: n_nodes > 1 ? pointAround(center_model.x!) : center_model.x,
      y: n_nodes > 1 ? pointAround(center_model.y!) : center_model.y,
    });

    graph.addItem('edge', {
      ...pseudoEdge(center_id!, node.id ?? ''),
      combo_pseudo_inner: true,
      style: { lineWidth: 0, endArrow: false },
    });
    comboChildrenIds?.add(node.id!);
  }
};

export const updateGraphRootNodes = (graph: G6Graph, diff: EnhancedDiff['nodesDiff']) => {
  for (const node_id of diff.remove) {
    const node = graph.findById(node_id) as G6Node;
    if (node === undefined) {
      console.error('trying to remove unknown root node', node_id);
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
      style: nodeStyle(node, {}),
      children_ids: new Set(),
    });
  }
};

// updateGraphEdges api is where the graph starts updating edges
export const updateGraphEdges = (graph: G6Graph, delta: EnhancedDiff['edgesDiff']) => {
  const removeEdge = (item: G6Edge) => {
    const model = item.get('model') as EdgeModel;
    graph.removeItem(model.id!); // TODO: do we need this removal?
  };

  // if (delta.reset) {
  //   for (const edge of graph.getEdges()) {
  //     removeEdge(edge);
  //   }
  // }

  if (delta.add) {
    for (const edge of delta.add) {
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

  if (delta.remove) {
    for (const edge of delta.remove) {
      const id = `${edge.source}-${edge.target}`;
      const item = graph.findById(id) as G6Edge;
      if (item === undefined) {
        console.warn("trying to remove edge that doesn't exist", edge.id);
        continue;
      }

      removeEdge(item);
    }
  }
};

const pseudoEdge = (source: string, target: string) => ({
  source,
  target,
  pseudo: true,
});

const nodeStyle = (node: EnhancedDetailedNodeSummary, override: Record<string, any>) => {
  let style: Record<string, string> = {};
  const fill: Record<string, string> = {
    cloud_provider: COLORS.CLOUD_PROVIDER,
    region: COLORS.REGION,
    host: COLORS.HOST,
    pod: COLORS.POD,
    container: COLORS.CONTAINER,
    process: COLORS.PROCESS,
  };
  style.fill = fill[node?.df_data?.type ?? ''] || COLORS.NODE;

  style = { ...style, ...override };
  if (node.df_data.image !== undefined) {
    delete style.fill;
  } else if (node?.df_data?.type === 'process') {
    style.fill = COLORS.PROCESS;
  }

  return style;
};
