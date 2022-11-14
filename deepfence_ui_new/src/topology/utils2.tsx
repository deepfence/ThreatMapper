import { Graph as IGraph, Layout } from '@antv/g6';
// import { GraphinData, Utils } from '@antv/graphin';
import React from 'react';

import { COLORS, PALETTE } from '../graph/theme';
import { getNodeIcon } from '../utils/node-icons';
import { BASE_NODE_STRENGTH, gForceLayout, nodeStrength, pointAround } from './gforce';
import { StringIndexType } from './topology-client';

type NodeType = {
  id: string;
  label: string;
  label_full: string;
  label_short: string;
  node_type: string;
  img: string; // aws
  type: string;
  size: number;
  shape: string;
  labelCfg: object;
  pseudo: string | null;
};

export type SourceTargetType = { source: string; target: string };
// export type EdgeType = {
//   edge: SourceTargetType;
// };

const nodeSize = (node_type: string) => {
  const mul: StringIndexType<number> = {
    container: 0.5,
    process: 0.5,
  };

  const size = (mul[node_type] || 1) * 60;
  return size;
};

const basename = (path: string) => {
  const i = path.lastIndexOf('/');
  if (i >= 0) {
    return path.substring(i + 1);
  }
  return path;
};

const ellipsize = (text: string, n: number) => {
  if (text.length <= n) {
    return text;
  }

  return text.substr(0, n - 3) + '...';
};

export const funnyTopologyTypeToModelType = (type: string): string => {
  const vals: StringIndexType<string> = {
    '<cloud_provider>': 'cloud',
    '<cloud_region>': 'region',
    '<kubernetes_cluster>': 'kubernetes_cluster',
    '<host>': 'host',
    '<pod>': 'pod',
    '<container>': 'container',
    '<fargate>': 'fargate', // FIXME: check the actual value
  };
  // tslint:disable-next-line
  return vals[type];
};

export const topologyNodeToModel = (topo_node: NodeType) => {
  if (topo_node.id === undefined) {
    console.error("node doesn't have an id", topo_node);
    return;
  }

  const model = { ...topo_node };
  model.label_full = model.label;

  model.id = topo_node.id;
  // this has got to be the worst API I've ever seen!?
  const [id, type] = topo_node.id.split(';', 2);
  model.node_type = funnyTopologyTypeToModelType(type);
  if (model.node_type == undefined) {
    if (type) {
      model.node_type = 'process';
      if (model.label === undefined) {
        console.warn("process doesn't have a label", model);
        return;
      }
      if (model.label[0] == '[' && model.label[model.label.length - 1] == ']') {
        return;
      }
      model.label_short = ellipsize(basename(model.label), 20);
      model.label = model.label_short;
    } else {
      model.id = topo_node.id;
      model.node_type = 'unknown';
    }
  }

  switch (model.node_type) {
    case 'pod':
    case 'container':
    case 'process':
      model.labelCfg = { style: { fontSize: 14 } };
      break;
  }

  model.size = nodeSize(model.node_type);

  if (model.shape !== 'circle') {
    model.img = getNodeIcon(model.shape);
    if (model.img !== undefined) {
      model.type = 'image';
    }
  }

  return model;
};

type NodeFunctionType = {
  add: any[];
  update: any[];
  remove: any[];
};
export const topologyNodesToDelta = (graph: IGraph, data: any) => {
  const len = (k: string) => (!data[k] ? 0 : data[k].length);
  if (len('add') === 0 && len('update') === 0 && len('remove') === 0) {
    return null;
  }

  const delta: StringIndexType<NodeFunctionType> = {};
  const node_delta = (node_id: string): NodeFunctionType => {
    if (delta[node_id] === undefined) {
      delta[node_id] = { add: [], update: [], remove: [] };
    }
    return delta[node_id];
  };

  if (data.add) {
    for (const topo_node of data.add) {
      const node = topologyNodeToModel(topo_node);
      if (node) {
        let parent_id = topo_node.immediate_parent_id;
        if (parent_id === '') {
          parent_id = 'root';
        }

        // add pseudo nodes only at the root
        if (!node.pseudo || parent_id == 'root') node_delta(parent_id).add.push(node);
      }
    }
  }

  if (data.remove) {
    for (const topo_node_id of data.remove) {
      const node = graph.findById(topo_node_id);
      if (node === undefined) {
        console.warn(
          "trying to remove a node that doesn't exist. Was it collapsed?",
          topo_node_id,
        );
        continue;
      }

      const model = node.get('model');
      const parent_id = model.parent_id || 'root';
      node_delta(parent_id).remove.push(topo_node_id);
    }
  }

  return delta;
};

const topologyEdgeToModel = (edge: SourceTargetType) => {
  if (edge.source == edge.target) {
    return null;
  }

  return { ...edge, id: `${edge.source}-${edge.target}` };
};

const filter_map = (
  iter: SourceTargetType[],
  f: (edge: SourceTargetType) => null | SourceTargetType,
) => {
  const ret = [];
  for (const el of iter) {
    const m = f(el);
    if (m) {
      ret.push(m);
    }
  }

  return ret;
};

export const topologyEdgesToDelta = (data: { [key: string]: any[] }) => {
  const len = (k: string) => (!data[k] ? 0 : data[k].length);
  if (len('add') === 0 && len('remove') === 0) {
    return null;
  }

  const delta: {
    add: SourceTargetType[];
    remove: SourceTargetType[];
  } = { add: [], remove: [] };
  if (data.add) {
    delta.add = filter_map(data.add, topologyEdgeToModel);
  }

  if (data.remove) {
    delta.remove = filter_map(data.remove, topologyEdgeToModel);
  }

  return delta;
};

// Extract api to create Node data

type DataType = {
  root?: NodeFunctionType;
};

type ItemType = 'node' | 'edge' | 'combo';

// TODO：build-in Graphin.Utils
export const update = (data: GraphinData, type: ItemType = 'node') => {
  const items = data[`${type}s`];
  console.log('items---', items);
  return {
    set: (id, model) => {
      const newItems = [];
      items.forEach((item) => {
        if (item.id === id) {
          const mergedItem = Utils.deepMix({}, item, model);
          newItems.push(mergedItem);
        } else {
          newItems.push(item);
        }
      });
      return {
        ...data,
        [`${type}s`]: newItems,
      };
    },
  };
};

// set CLOUD_STYLES = [] to disable cloud colors
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

/**
 * 
 * @param graph IGraph
 * @param delta 
 * 
 * id: "out-theinternet"
img: "/src/assets/images/topology-icons/grayscale/globe.svg"
immediate_parent_id: ""
label: "The Internet"
labelMinor: "Outbound connections"
label_full: "The Internet"
node_type: "unknown"
pseudo: true
rank: "out-theinternet"
shape: "cloud"
size: 60
type: "image"
 */
export const updateRootNodes = (graph: IGraph, delta: StringIndexType<any>) => {
  for (const node_id of delta.remove || []) {
    const node = graph.findById(node_id);
    if (node === undefined) {
      console.error('trying to remove unknown root node', node_id);
      continue;
    }
    // removeNodeItem(graph, node);
  }

  const center_x = graph.getWidth() / 2;
  const center_y = graph.getHeight() / 2;

  const r = [];
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
    r.push({
      ...node,
      x: pointAround(center_x),
      y: pointAround(center_y),
      cloudInfo: info,
      style: nodeStyle(node, info?.nodeStyle),
      children_ids: new Set(),
    });
  }
  return r;
};

export const updateEdges = (graph: IGraph, delta: StringIndexType<any>) => {
  const removeEdge = (item) => {
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
      //   const source = graph.findById(edge.source)?.get('model');
      //   if (source === undefined) {
      //     console.error('edge source does not exist', edge);
      //     continue;
      //   }
      //   const target = graph.findById(edge.target)?.get('model');
      //   if (target === undefined) {
      //     console.error('edge target does not exist', edge);
      //     continue;
      //   }

      graph.addItem('edge', {
        ...edge,
        // style: source.cloudInfo?.edgeStyle,
        connection: true,
      });
      r.push({
        ...edge,
        // style: source.cloudInfo?.edgeStyle,
        connection: true,
      });
    }
    return r;
  }

  if (delta.remove) {
    for (const edge of delta.remove) {
      const item = graph.findById(edge.id);
      if (item === undefined) {
        console.warn("trying to remove edge that doesn't exist", edge.id);
        continue;
      }

      removeEdge(item);
    }
  }
};

export const itemExpandsAsCombo = (item) => {
  const model = item.get('model');
  return (
    model.node_type === 'kubernetes_cluster' ||
    model.node_type === 'host' ||
    model.node_type === 'pod' ||
    model.node_type == 'container'
  );
};

export const buildLayout = (graph, node_id, options) => {
  let item = undefined;
  if (node_id !== 'root') {
    item = graph.findById(node_id);
    if (item === undefined) {
      console.warn('aborting layout of node that no longer exists', node_id);
      return;
    }
  }

  if (node_id === 'root' || !itemExpandsAsCombo(item)) {
    return buildRootLayout(graph, item, options);
  } else {
    return buildComboLayout(graph, item, options);
  }
};

export const buildRootLayout = (graph, item, options) => {
  let nodes = {};
  let edges = [];
  for (const node of graph.getNodes()) {
    const model = node.get('model');
    if (!model || model.comboId) {
      continue;
    }
    nodes[model.id] = model;

    for (const edge of node.getEdges()) {
      const model = edge.get('model');
      if (model.combo_pseudo || model.combo_pseudo_center) {
        continue;
      }
      edges.push(model);
    }
  }

  edges = edges.filter((e) => nodes[e.source] && nodes[e.target]);
  nodes = Object.values(nodes);

  const center_x = graph.getWidth() / 2;
  const center_y = graph.getHeight() / 2;

  const num_nodes = nodes.length;

  return {
    nodes,
    edges,
    options: {
      ...gForceLayout(graph),

      center: [center_x, center_y],

      nodeStrength: (node) => {
        return BASE_NODE_STRENGTH;
      },

      tick: () => {
        if (options?.refreshOnTick !== false) {
          graph.refreshPositions();
        }
      },

      onLayoutEnd: () => {
        graph.refreshPositions();
      },
    },
  };
};

const buildComboLayout = (graph, item, options) => {
  const model = item.get('model');
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;

  const combo = graph.findById(combo_id);
  const combo_model = combo.get('model');

  let { nodes } = combo.getChildren();
  nodes = nodes.map((n) => n.get('model'));

  const center = graph.findById(combo_model.center_ids[0]);
  const edges = center.getOutEdges().map((e) => e.get('model'));

  const center_model = center.get('model');

  if (options.expanding) {
    edges.push(...center.getInEdges().map((e) => e.get('model')));
    nodes.push(model);
  }

  model.fx = model.x;
  model.fy = model.y;

  const num_nodes = nodes.length;

  return {
    nodes,
    edges,
    options: {
      ...gForceLayout(graph),
      center: [center_model.x, center_model.y],

      nodeStrength: (node) => {
        return nodeStrength(node, num_nodes);
      },

      tick: () => {
        if (options.refreshOnTick !== false) {
          graph.refreshPositions();
        }
      },
      onLayoutEnd: () => {
        model.fx = null;
        model.fy = null;
        graph.refreshPositions();
      },
    },
  };
};

export class LayoutExecutor {
  layout: any;
  constructor(nodes, edges, options) {
    this.layout = new Layout.gForce(options);
    this.layout.init({ nodes, edges });
  }

  start() {
    this.layout.execute();
  }

  stop() {
    this.layout.stop();
  }
}
