// import { IUserEdge, IUserNode, NodeStyle } from '@antv/graphin';
import { useMemo } from 'react';

import { COLORS } from '../graph/theme';
import { arrayTransformByFunction, basename, ellipsize } from '../graph/utils';
import { getNodeIcon } from '../utils/node-icons';
import { nodeSize, serverToUINodeMap } from './utils';

export type ApiNodeType = {
  id: string;
  label: string;
  label_full: string;
  labelShort: string;
  node_type: string;
  img: 'image' | 'text' | 'font'; // aws
  type: string;
  image: string;
  size: number;
  shape: string;
  labelCfg: object;
  pseudo: boolean;
  nodeType: string;
};

const getNodeId = (nodeData: IUserNode) => {
  if (nodeData.id === undefined) {
    console.error("node doesn't have an id", nodeData);
    return;
  }
  return nodeData.id;
};

const getNodeType = (nodeData: IUserNode) => {
  // we expect if type exist then it is a process node
  const [, type] = nodeData.id.split(';', 2);
  let nodeType = serverToUINodeMap(type);
  if (nodeType == undefined) {
    if (type) {
      nodeType = 'process';
    } else {
      nodeType = 'unknown';
    }
  }
  return nodeType;
};

const getNodeLabel = (nodeData: IUserNode) => {
  if (nodeData.label === undefined) {
    console.warn("process doesn't have a label", nodeData);
    return;
  }
  if (nodeData.label[0] == '[' && nodeData.label[nodeData.label.length - 1] == ']') {
    return;
  }
  return ellipsize(basename(nodeData.label), 20);
};

const getNodeSize = (nodeType: string) => {
  return nodeSize(nodeType);
};

const getNodeImage = (nodeData: IUserNode) => {
  let type: 'image' | 'text' | 'font' | undefined = undefined;
  let image = undefined;
  if (nodeData.shape !== 'circle') {
    image = getNodeIcon(nodeData.shape);
    if (image !== undefined) {
      type = 'image';
    }
  }
  return {
    type,
    image,
  };
};

// build up necessary attributes for nodes styles
const addNodeAttributes = (nodeData: IUserNode) => {
  const nodeId = getNodeId(nodeData);
  if (!nodeId) {
    return;
  }
  nodeData.id = nodeId;

  let parent_id = nodeData.immediate_parent_id;
  if (parent_id === '') {
    parent_id = 'root';
  }

  // nodeData.parent_id = parent_id;

  const nodeType = getNodeType(nodeData);
  if (!nodeType) {
    return;
  }
  nodeData.node_type = nodeType;

  const size = getNodeSize(nodeType);
  if (size) {
    nodeData.size = size;
  }

  const label = getNodeLabel(nodeData);
  if (!label) {
    return;
  }
  nodeData.label = label;

  const { type, image } = getNodeImage(nodeData);

  const graphinNode: IUserNode = {
    ...nodeData,
  };
  graphinNode.type = type;
  graphinNode.image = image;
  return graphinNode;
};

// form a graphin node style to render graph node
const createGraphinNodeStyles = (node: IUserNode) => {
  const nodeData = addNodeAttributes(node);
  if (!nodeData) {
    return;
  }
  type N = Partial<NodeStyle> & {
    id: string;
  };

  const nodes: N = {
    ...nodeData,
    id: nodeData.id,
    keyshape: {
      size: nodeData.size,
      fillOpacity: 0.2,
    },
    icon: {
      type: nodeData.type as 'font' | 'image' | 'text',
      fontFamily: 'graphin',
      value: nodeData.image,
      size: nodeData.size,
    },
    label: {
      value: nodeData.label,
    },
  };
  return nodes;
};

type ST = { source: string; target: string };

const addEdgeAttributes = (edgeData: IUserEdge[]) => {
  const addId = (edge: ST) => {
    if (edge.source == edge.target) {
      return null;
    }
    return {
      ...edge,
      id: `${edge.source}-${edge.target}`,
      style: {
        keyshape: {
          stroke: COLORS.EDGE,
        },
      },
    };
  };
  return arrayTransformByFunction<IUserEdge>(edgeData, addId);
};
// form a graphin edge style to render graph edge
const createGraphinEdgeStyles = (edgeData: IUserEdge[]): IUserEdge[] => {
  return addEdgeAttributes(edgeData);
};

type TData = {
  nodes: IUserNode[];
  edges: IUserEdge[];
};

export const useTopologyGraphStyles = (data: TData) => {
  // graphin edges
  const edges = useMemo(() => {
    if (!data.edges) {
      return [];
    }
    return createGraphinEdgeStyles(data.edges);
  }, [data.edges]);

  // graphin nodes
  const nodes = useMemo(() => {
    return data.nodes.map((node: IUserNode) => {
      const _node = createGraphinNodeStyles(node);
      if (_node) {
        return {
          id: _node.id,
          style: _node,
          node_type: _node.node_type,
          parent_id: _node.parent_id,
        };
      }
    });
  }, [data.nodes]);
  return {
    edges,
    nodes,
  };
};
