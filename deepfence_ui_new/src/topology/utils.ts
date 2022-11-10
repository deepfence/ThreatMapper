/**
 * Topology Graph utilities
 */

import { IGraph } from '@antv/g6';
import { IG6GraphEvent, IUserNode } from '@antv/graphin';

import { GraphItem } from '../graph/utils';
import { StringIndexType } from './topology-client';

export const nodeSize = (node_type: string) => {
  const mul: StringIndexType<number> = {
    container: 0.5,
    process: 0.5,
  };

  const size = (mul[node_type] || 1) * 60;
  return size;
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

export const pseudoEdge = (source, target) => ({
  source,
  target,
  pseudo: true,
});

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

export const updateEdges = (graph: IGraph, delta: StringIndexType<any>) => {
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
