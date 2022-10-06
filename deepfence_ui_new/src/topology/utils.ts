import { Graph as IGraph } from '@antv/g6';
import { GraphinData, Utils } from '@antv/graphin';
import React from 'react';

import { getNodeIcon } from '../utils/node-icons';
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
