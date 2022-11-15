import { IAPIData, nodeSize, serverToUINodeMap } from '../../topology/utils';
import { getNodeIcon } from '../../utils/node-icons';
import { APIDeltaType, ApiNodeItemType, IGraph, IStringIndex } from '../types';
import { arrayTransformByFunction, basename, ellipsize } from '../utils';

export type SourceTargetType = { source: string; target: string };

// -----start node formation/updation-----
export const topologyNodeToModel = (topo_node: ApiNodeItemType) => {
  if (topo_node.id === undefined) {
    console.error("node doesn't have an id", topo_node);
    return;
  }

  const model = { ...topo_node };
  model.label_full = model.label;

  model.id = topo_node.id;
  // this has got to be the worst API I've ever seen!?
  const [, type] = topo_node.id.split(';', 2);
  model.node_type = serverToUINodeMap(type);
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
    model.img = getNodeIcon(model.shape) as 'image' | 'text' | 'font';
    if (model.img !== undefined) {
      model.type = 'image';
    }
  }

  return model;
};

export const topologyNodesToDelta = (graph: IGraph, data: IAPIData['nodes']) => {
  const len = (k: Exclude<keyof IAPIData['nodes'], 'reset'>) =>
    !data[k] ? 0 : data[k].length;
  if (len('add') === 0 && len('update') === 0 && len('remove') === 0) {
    return null;
  }

  const delta: IStringIndex<APIDeltaType> = {};
  const node_delta = (node_id: string): APIDeltaType => {
    if (delta[node_id] === undefined) {
      delta[node_id] = { add: [], update: [], remove: [], reset: false };
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
        if (!node.pseudo || parent_id == 'root') {
          node_delta(parent_id).add.push(node);
        }
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
// -----end node formation/updation-----

// -----start edge formation/updation-----
const topologyEdgeToModel = (edge: ApiNodeItemType) => {
  if (edge.source == edge.target) {
    return null;
  }

  return { ...edge, id: `${edge.source}-${edge.target}` };
};

export const topologyEdgesToDelta = (edges: IAPIData['edges']) => {
  const len = (k: Exclude<keyof IAPIData['edges'], 'reset'>) =>
    !edges[k] ? 0 : edges[k].length;

  if (len('add') === 0 && len('remove') === 0) {
    return null;
  }

  const delta: IAPIData['edges'] = { add: [], remove: [], update: [] };
  if (edges.add) {
    delta.add = arrayTransformByFunction(edges.add, topologyEdgeToModel);
  }

  if (edges.remove) {
    delta.remove = arrayTransformByFunction(edges.remove, topologyEdgeToModel);
  }

  return delta;
};
// -----end edge formation/updation-----
