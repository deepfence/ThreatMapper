/**
 * Topology Graph utilities
 */

import { IGraph } from '@antv/g6';

import {
  collapseNode,
  finishExpandingNode,
  itemExpandsAsCombo,
} from '../graph/graphManager/expand-collapse';
// import { IG6GraphEvent, IUserNode } from '@antv/graphin';
import { COLORS, PALETTE } from '../graph/theme';
import { IStringIndex } from '../graph/types';
import { GraphItem, itemIsExpanded, itemIsExpanding } from '../graph/utils';
import { pointAround } from './gforce';
import { StringIndexType } from './topology-client';

export interface IAPIData {
  nodes: {
    add: IStringIndex<string>[];
    update: IStringIndex<string>[];
    remove: IStringIndex<string>[];
  };
  edges: {
    add: IStringIndex<string>[];
    update: IStringIndex<string>[];
    remove: IStringIndex<string>[];
  };
  reset: boolean;
  metadata: IStringIndex<string>;
}

export const nodeSize = (node_type: string) => {
  const mul: StringIndexType<number> = {
    container: 0.5,
    process: 0.5,
  };

  const size = (mul[node_type] || 1) * 60;
  return size;
};

export const modelParentsToTopologyParents = (nodes) => {
  const ret = {};

  for (const node of nodes) {
    const node_type = modelNodeTypeToTopologyNodeType(node.node_type);
    ret[node_type] = node.id;
  }

  return ret;
};

export const modelNodeTypeToTopologyChildrenTypes = (
  type: string,
  opts: {
    [k: string]: boolean;
  },
) => {
  const types: { [k: string]: string[] } = {
    cloud: [TopologyNodeType.REGION, TopologyNodeType.KUBERNETES_CLUSTER],
    region: [TopologyNodeType.HOST],
    kubernetes_cluster: [TopologyNodeType.HOST],
    host: opts?.kubernetes
      ? [TopologyNodeType.POD]
      : [TopologyNodeType.PROCESS, TopologyNodeType.CONTAINER],
    pod: [TopologyNodeType.CONTAINER],
    container: [TopologyNodeType.PROCESS],
  };

  return types[type];
};

export const uiToServerNodeParents = (nodes: IUserNode[]) => {
  const ret: { [key: string]: string } = {};

  for (const node of nodes) {
    const node_type = uiToServerNodeMap(node.node_type);
    if (node_type) {
      ret[node_type] = node.id;
    }
  }

  return ret;
};

export const TopologyNodeType = {
  CLOUD_PROVIDER: 'cloud-providers',
  REGION: 'cloud-regions',
  KUBERNETES_CLUSTER: 'kubernetes-clusters',
  HOST: 'hosts',
  POD: 'pods',
  CONTAINER: 'containers',
  PROCESS: 'processes',
};

export const serverToUINodeMap = (type: string): string => {
  const vals: { [key: string]: string } = {
    '<cloud_provider>': 'cloud',
    '<cloud_region>': 'region',
    '<kubernetes_cluster>': 'kubernetes_cluster',
    '<host>': 'host',
    '<pod>': 'pod',
    '<container>': 'container',
    '<fargate>': 'fargate',
  };

  return vals[type];
};

export const uiToServerNodeMap = (type: string) => {
  const types: { [key: string]: string } = {
    cloud: TopologyNodeType.CLOUD_PROVIDER,
    region: TopologyNodeType.REGION,
    kubernetes_cluster: TopologyNodeType.KUBERNETES_CLUSTER,
    host: TopologyNodeType.HOST,
    pod: TopologyNodeType.POD,
    container: TopologyNodeType.CONTAINER,
    process: TopologyNodeType.PROCESS,
  };

  const ret = types[type];
  if (ret === undefined) {
    console.error('no topology type for model node type', type);
    return null;
  }

  return ret;
};

export const getConditionalFontSize = (node_type: string) => {
  switch (node_type) {
    case 'pod':
    case 'container':
    case 'process':
      return 14;
  }
};

// collapse or expand cases
export const itemExpands = (item: IG6GraphEvent['item']) => {
  const model = item?.get?.('model');

  switch (model.node_type) {
    case 'cloud':
    case 'region':
    case 'kubernetes_cluster':
    case 'host':
    case 'pod':
    case 'container':
      return true;
  }

  return false;
};

export const pseudoEdge = (source: string, target: string) => ({
  source,
  target,
  pseudo: true,
});

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

const removeNodesCombo = (graph, item, nodes) => {
  const model = item.get('model');
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;
  const combo_model = graph.findById(combo_id).get('model');
  const combo_children_ids = combo_model.children_ids;

  for (const node_id of nodes) {
    if (!combo_children_ids.has(node_id)) {
      console.error('trying to remove unknown child from combo', combo_id, node_id);
      continue;
    }
    combo_children_ids.delete(node_id);

    const item = graph.findById(node_id);
    if (itemIsExpanded(item)) {
      collapseNode(graph, item);
    }
    removeNodeItem(graph, item);
  }
};

const addNodesCombo = (graph, item, nodes) => {
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
      ...pseudoEdge(center_id, node.id),
      combo_pseudo_inner: true,
      style: { lineWidth: 0, endArrow: false },
    });
    children_ids.add(node.id);
  }
};

export const updateComboNode = (graph, item, delta) => {
  if (delta.remove) {
    removeNodesCombo(graph, item, delta.remove);
  }

  if (delta.add) {
    addNodesCombo(graph, item, delta.add);
  }
};

const removeNodesSimple = (graph, item, nodes) => {
  const model = item.get('model');
  const node_id = model.id;
  const children_ids = model.children_ids;

  for (const child_node_id of nodes) {
    const child = graph.findById(child_node_id);
    if (!child || !children_ids.has(child_node_id)) {
      console.error('trying to remove an unknown child', child_node_id);
      continue;
    }
    children_ids.delete(child_node_id);

    if (itemIsExpanded(child)) {
      collapseNode(graph, child);
    }
    removeNodeItem(graph, child);
  }
};

const addNodesSimple = (graph, item, nodes) => {
  const model = item.get('model');
  const node_id = model.id;
  const children_ids = model.children_ids;
  const cloudInfo = model.cloudInfo;

  for (const node of nodes) {
    const item = graph.findById(node.id);
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
    });
    graph.addItem('edge', {
      ...pseudoEdge(node_id, node.id),
      style: { ...model.cloudInfo?.edgeStyle },
    });
    children_ids.add(node.id);
    node_item.refresh();
  }
};

export const updateSimpleNode = (graph, item, delta) => {
  if (delta.remove) {
    removeNodesSimple(graph, item, delta.remove);
  }

  if (delta.add) {
    addNodesSimple(graph, item, delta.add);
  }
};

export const updateGraphNode = (graph, item, delta) => {
  if (itemIsExpanding(item)) {
    finishExpandingNode(graph, item);
  }

  if (itemExpandsAsCombo(item)) {
    return updateComboNode(graph, item, delta);
  }

  return updateSimpleNode(graph, item, delta);
};

export const updateNode = (graph: IGraph, item: GraphItem, nodes) => {
  const model = item.get('model');
  const node_id = model.id;
  const children_ids = model.children_ids || new Set();
  const cloudInfo = model.cloudInfo;

  for (const node of nodes) {
    const item = graph.findById(node.id);
    if (item !== undefined) {
      console.error(
        `trying to add node that is already in the graph (parent=${node_id})`,
        node,
      );
      continue;
    }
    const node_item = graph.addItem('node', {
      ...node,
      parent_id: node_id,
      cloudInfo,
      // style: { ...nodeStyle(node, cloudInfo?.nodeStyle) },
      children_ids: new Set(),
    });
    graph.addItem('edge', {
      ...pseudoEdge(node_id, node.id),
      // style: { ...model.cloudInfo?.edgeStyle },
    });
    graph.updateItem(node.id, {
      style: {
        label: {
          value: 'New Node Label',
        },
        keyshape: {
          size: 80,
          stroke: '#ff9f0f',
          fill: '#ff9f0ea6',
        },
      },
    });
    children_ids.add(node.id);
    node_item.refresh();
  }
};

export const removeNodeItem = (graph: IGraph, item: GraphItem) => {
  for (const edge of item.getEdges()) {
    const edge_model = edge.get('model');
    if (edge_model.connection) {
      graph.removeItem(edge_model.id);
    }
  }

  graph.removeItem(item);
};

const nodeStyle = (node: StringIndexType<any>, override: StringIndexType<any>) => {
  let style: StringIndexType<string> = {};
  const fill = {
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

export const updateGraphRootNodes = (graph: IGraph, delta: StringIndexType<any>) => {
  for (const node_id of delta.remove || []) {
    const node = graph.findById(node_id);
    if (node === undefined) {
      console.error('trying to remove unknown root node', node_id);
      continue;
    }
    removeNodeItem(graph, node);
  }

  const center_x = graph.getWidth() / 2;
  const center_y = graph.getHeight() / 2;

  for (const node of delta.add || []) {
    const info = node.node_type === 'cloud' ? cloudInfo() : null;

    graph.addItem('node', {
      ...node,
      x: pointAround(center_x),
      y: pointAround(center_y),
      cloudInfo: info,
      style: nodeStyle(node, info?.nodeStyle),
      children_ids: new Set(),
    });
  }
};

export const updateGraphEdges = (graph: IGraph, delta: EdgeDeltaType) => {
  const removeEdge = (item: GraphItem) => {
    const model = item.get('model');
    // if (model.connection === true) {
    // }
    graph.removeItem(model.id);
  };

  if (delta.reset) {
    for (const edge of graph.getEdges()) {
      removeEdge(edge);
    }
  }

  if (delta.add) {
    const r = [];
    for (const edge of delta.add) {
      const source = graph.findById(edge.source)?.get('model');
      if (source === undefined) {
        console.error('edge source does not exist', edge);
        continue;
      }
      const target = graph.findById(edge.target)?.get('model');
      if (target === undefined) {
        console.error('edge target does not exist', edge);
        continue;
      }

      graph.addItem('edge', {
        ...edge,
        style: source.cloudInfo?.edgeStyle,
        connection: true,
      });
      r.push({
        ...edge,
        style: source.cloudInfo?.edgeStyle,
        connection: true,
      });
    }
    return r;
  }

  if (delta.remove) {
    for (const edge of delta.remove) {
      const id = `${edge.source}-${edge.target}`;
      const item = graph.findById(id);
      if (item === undefined) {
        console.warn("trying to remove edge that doesn't exist", edge.id);
        continue;
      }

      removeEdge(item);
    }
  }
};

export const getParents = (graph: IGraph, item: GraphItem) => {
  const parents = [];

  let parent_id = item.get('model').parent_id;
  while (parent_id) {
    let parent = graph.findById(parent_id);
    if (parent) {
      parent = parent.get('model');
    }
    if (parent.node_type !== 'combo') {
      parents.unshift(parent_id);
    }
    parent_id = parent.parent_id;
  }

  return parents;
};
