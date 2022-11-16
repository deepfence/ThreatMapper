/**
 * Topology Graph utilities
 *
 * How Topology graph is working?
 * 1. To render a graph we need nodes and edges
 * 2. Backend sends these nodes and edges as delta, frontend transform these data into g6 structure with additional
 * attributes store in each node model which could be either simple node or combo node. The attributes help in node expansion and collapsion
 * 3. Each time a new node is received or old node is deleted backend sends only those information. Graph dynamically
 * update graph.
 * 4. Topology uses GForce layout to put corresponding nodes close to each other with an attempt to put meaningful nodes in the
 * center of the screen
 * 5. For combo nodes, the nodes are group by a circle and all nodes inside it are attracted towards center of circle. This is achieved with
 * the help of a node which is invisible to user and it helps to pull all of those nodes otherwise random nodes may appear on top of combo circle.
 * 6. Graph has node, edges, children nodes and edges. Each time a new data is received, we need to update them. This take place in such way:
 *   a) remove all edges mentioned in api data
 *   b) removes all nodes including child nodes and edges mentioned in api data and add new nodes in case of node expansion
 *   c) add edges to newly connected nodes
 *
 */

import { ICombo, IGraph, Item } from '@antv/g6';

import { StringIndexType } from '../../topology/topology-client';
import {
  collapseNode,
  finishExpandingNode,
  itemExpandsAsCombo,
  itemIsExpanded,
  itemIsExpanding,
} from '../graphManager/expand-collapse';
import { pointAround } from '../graphManager/gforce';
// import { IG6GraphEvent, IUserNode } from '@antv/graphin';
import { COLORS, PALETTE } from '../theme';
import { ApiNodeItemType, ICustomNode, IItem, INode, IStringIndex } from '../types';

export interface IAPIData {
  nodes: {
    add: ApiNodeItemType[];
    update: ApiNodeItemType[];
    remove: string[];
    reset?: boolean;
  };
  edges: {
    add: ApiNodeItemType[];
    update: ApiNodeItemType[];
    remove: ApiNodeItemType[]; // edge remove is not string array in api response though node remove is
    reset?: boolean;
  };
  reset: boolean;
  metadata: ApiNodeItemType;
}

export const nodeSize = (node_type: string) => {
  const mul: StringIndexType<number> = {
    container: 0.5,
    process: 0.5,
  };

  const size = (mul[node_type] || 1) * 60;
  return size;
};

export const modelParentsToTopologyParents = (nodes: ICustomNode[]) => {
  const ret: IStringIndex<string> = {};

  for (const node of nodes) {
    const node_type = uiToServerNodeMap(node.node_type);
    if (node_type !== null) {
      ret[node_type] = node.id;
    }
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

export const uiToServerNodeParents = (nodes: ICustomNode[]) => {
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
export const itemExpands = (item: IItem) => {
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

const removeNodesCombo = (graph: IGraph, item: Item, nodes: string[]) => {
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

    const item = graph.findById(node_id) as ICustomNode;
    if (itemIsExpanded(item)) {
      collapseNode(graph, item);
    }
    removeNodeItem(graph, item);
  }
};

const addNodesCombo = (graph: IGraph, item: IItem, nodes: ApiNodeItemType[]) => {
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

export const updateComboNode = (graph: IGraph, item: IItem, delta: IAPIData['nodes']) => {
  if (delta.remove) {
    removeNodesCombo(graph, item, delta.remove);
  }

  if (delta.add) {
    addNodesCombo(graph, item, delta.add);
  }
};

const removeNodesSimple = (graph: IGraph, item: Item, nodes: string[]) => {
  const model = item.get('model');
  const children_ids = model.children_ids;

  for (const child_node_id of nodes) {
    const child = graph.findById(child_node_id) as ICustomNode;
    if (!child || !children_ids.has(child_node_id)) {
      console.error('trying to remove an unknown child', child_node_id);
      continue;
    }
    children_ids.delete(child_node_id);

    if (itemIsExpanded(child)) {
      collapseNode(graph, child, undefined, false);
    }
    removeNodeItem(graph, child);
  }
};

const addNodesSimple = (graph: IGraph, item: Item, nodes: ApiNodeItemType[]) => {
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
    }) as Item;
    graph.addItem('edge', {
      ...pseudoEdge(node_id, node.id),
      style: { ...model.cloudInfo?.edgeStyle },
    });
    children_ids.add(node.id);
    node_item.refresh();
  }
};

export const updateSimpleNode = (graph: IGraph, item: Item, delta: IAPIData['nodes']) => {
  if (delta.remove) {
    removeNodesSimple(graph, item, delta.remove as string[]);
  }

  if (delta.add) {
    addNodesSimple(graph, item, delta.add);
  }
};

export const updateGraphNode = (graph: IGraph, item: IItem, delta: IAPIData['nodes']) => {
  if (itemIsExpanding(item)) {
    finishExpandingNode(graph, item);
  }

  if (itemExpandsAsCombo(item)) {
    return updateComboNode(graph, item, delta);
  }

  return updateSimpleNode(graph, item, delta);
};

export const removeNodeItem = (graph: IGraph, item: INode) => {
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
  const fill: IStringIndex<string> = {
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
    const node = graph.findById(node_id) as INode;
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
      style: nodeStyle(node, info?.nodeStyle ?? {}),
      children_ids: new Set(),
    });
  }
};

export const updateGraphEdges = (graph: IGraph, delta: IAPIData['edges']) => {
  const removeEdge = (item: IItem) => {
    const model = item.get('model');
    if (model.connection === true) {
      graph.removeItem(model.id);
    }
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

export const getParents = (graph: IGraph, item: Item) => {
  const parents: string[] = [];

  let parent_id: string = item.get('model').parent_id;
  while (parent_id) {
    let parent: ICustomNode = graph.findById(parent_id) as ICustomNode;
    if (parent) {
      parent = parent.get<ICustomNode>('model');
      if (parent.node_type !== 'combo') {
        parents.unshift(parent_id);
      }
    }

    parent_id = parent.parent_id;
  }

  return parents;
};

export const onHoverNode = (item: ICustomNode, hover: boolean) => {
  const model = item.get('model');
  if (model.node_type === 'process') {
    if (hover) {
      item.update({ label: model.label_full });
      item.toFront();
    } else {
      item.update({ label: model.label_short });
    }
  }
};

export const fixCombo = (graph: IGraph, combo: ICombo) => {
  const model = combo.get('model');
  const bbox = combo.getBBox();
  const { centerX, centerY } = bbox;

  const center_id = model.center_ids[0];
  const center = graph.findById(center_id);
  const center_model = center.get('model');

  center_model.fx = centerX;
  center_model.fy = centerY;
};
