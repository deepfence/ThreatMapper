import {
  EnhancedDetailedNodeSummary,
  EnhancedDiff,
  G6Edge,
  G6Graph,
  G6Item,
  G6Node,
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
import { COLORS, PALETTE } from '@/features/topology/utils/theme';

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
  item: G6Item,
  nodes: EnhancedDetailedNodeSummary[],
) => {
  const model = item.get('model');
  const node_id = model.id;
  const children_ids = model.children_ids;
  const cloudInfo = model.cloudInfo;

  for (const node of nodes) {
    const item = graph.findById(node.id ?? '');
    if (item !== undefined) {
      console.error(
        `trying to add node that is already in the graph (parent=${node_id})`,
        node,
      );
      continue;
    }

    const node_item = graph.addItem('node', {
      ...node,
      x: pointAround(model.x),
      y: pointAround(model.y),
      parent_id: node_id,
      cloudInfo,
      style: { ...nodeStyle(node, cloudInfo?.nodeStyle) },
      children_ids: new Set(),
    }) as G6Item;
    graph.addItem('edge', {
      ...pseudoEdge(node_id, node.id ?? ''),
      style: { ...model.cloudInfo?.edgeStyle },
    });
    children_ids.add(node.id);
    node_item.refresh();
  }
};

const removeNodesSimple = (graph: G6Graph, item: G6Item, nodes: string[]) => {
  const model = item.get('model');
  const children_ids = model.children_ids;

  for (const child_node_id of nodes) {
    const child = graph.findById(child_node_id) as G6Node;
    if (!child || !children_ids.has(child_node_id)) {
      console.error('trying to remove an unknown child', child_node_id);
      continue;
    }
    children_ids.delete(child_node_id);

    if (isItemExpanded(child)) {
      collapseNode(graph, child, undefined, false);
    }
    removeNodeItem(graph, child);
  }
};

const removeNodesCombo = (graph: G6Graph, item: G6Item, nodes: string[]) => {
  const model = item.get('model');
  const node_id: string = model.id;
  const combo_id = `${node_id}-combo`;
  const combo_model = graph.findById(combo_id).get('model');
  const combo_children_ids = combo_model.children_ids;

  for (const node_id of nodes) {
    if (!combo_children_ids.has(node_id)) {
      console.error('trying to remove unknown child from combo', combo_id, node_id);
      continue;
    }
    combo_children_ids.delete(node_id);

    const item = graph.findById(node_id) as G6Node;
    if (isItemExpanded(item)) {
      collapseNode(graph, item);
    }
    removeNodeItem(graph, item);
  }
};

const addNodesCombo = (
  graph: G6Graph,
  item: G6Item,
  nodes: EnhancedDetailedNodeSummary[],
) => {
  const model = item.get('model');
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;

  const combo = graph.findById(combo_id);
  const combo_model = combo.get('model');
  const children_ids = combo_model.children_ids;

  const center_id = combo_model.center_ids[0];
  const center_model = graph.findById(center_id).get('model');

  const n_nodes = children_ids.size + nodes.length;

  const cloudInfo = model.cloudInfo;
  for (const node of nodes) {
    graph.addItem('node', {
      ...node,
      style: {
        ...nodeStyle(node, cloudInfo?.nodeStyle),
      },
      cloudInfo,
      parent_id: node_id,
      comboId: combo_id,
      children_ids: new Set([]),
      x: n_nodes > 1 ? pointAround(center_model.x) : center_model.x,
      y: n_nodes > 1 ? pointAround(center_model.y) : center_model.y,
    });

    graph.addItem('edge', {
      ...pseudoEdge(center_id, node.id ?? ''),
      combo_pseudo_inner: true,
      style: { lineWidth: 0, endArrow: false },
    });
    children_ids.add(node.id);
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
    const info = node.type === 'cloud' ? cloudInfo() : null;

    graph.addItem('node', {
      ...node,
      x: pointAround(center_x),
      y: pointAround(center_y),
      cloudInfo: info,
      style: nodeStyle(node, info?.nodeStyle ?? {}),
      children_ids: new Set(),
    });
  }
};

// updateGraphEdges api is where the graph starts updating edges
export const updateGraphEdges = (graph: G6Graph, delta: EnhancedDiff['edgesDiff']) => {
  const removeEdge = (item: G6Edge) => {
    const model = item.get('model');
    if (model.connection === true) {
      graph.removeItem(model.id);
    }
  };

  // if (delta.reset) {
  //   for (const edge of graph.getEdges()) {
  //     removeEdge(edge);
  //   }
  // }

  if (delta.add) {
    for (const edge of delta.add) {
      const sourceNode = graph.findById(edge.source ?? '')?.get('model');
      if (sourceNode === undefined) {
        console.error('edge source does not exist', edge);
        continue;
      }
      const targetNode = graph.findById(edge.target ?? '')?.get('model');
      if (targetNode === undefined) {
        console.error('edge target does not exist', edge);
        continue;
      }

      graph.addItem('edge', {
        ...edge,
        style: sourceNode.cloudInfo?.edgeStyle,
        connection: true,
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

const nodeStyle = (node: Record<string, any>, override: Record<string, any>) => {
  let style: Record<string, string> = {};
  const fill: Record<string, string> = {
    cloud: COLORS.CLOUD_PROVIDER,
    region: COLORS.REGION,
    host: COLORS.HOST,
    pod: COLORS.POD,
    container: COLORS.CONTAINER,
    process: COLORS.PROCESS,
  };
  style.fill = fill[node.node_type] || COLORS.NODE;

  style = { ...style, ...override };
  if (node.img !== undefined) {
    delete style.fill;
  } else if (node.node_type === 'process') {
    style.fill = COLORS.PROCESS;
  }

  return style;
};

const CLOUD_STYLES = [PALETTE.GOOGLE_BLUE, PALETTE.AWS_YELLOW];
const cloudInfo = () => {
  const color = CLOUD_STYLES.shift() as string;
  CLOUD_STYLES.push(color);
  return {
    nodeStyle: {
      fill: color || COLORS.NODE,
    },
    edgeStyle: {
      stroke: COLORS.EDGE,
    },
  };
};
