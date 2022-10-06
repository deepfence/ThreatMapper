import { IGraph } from '@antv/g6-pc';

import { COLORS, PALETTE } from '../graph/theme';
import {
  collapseNode,
  finishExpandingNode,
  itemExpandsAsCombo,
  itemIsExpanded,
  itemIsExpanding,
  pseudoEdge,
  removeNodeItem,
} from './expand-collapse';
import { pointAround } from './gforce';
import { StringIndexType } from './topology-client';

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
    removeNodeItem(graph, node);
  }

  const center_x = graph.getWidth() / 2;
  const center_y = graph.getHeight() / 2;

  const r = [];
  for (const node of delta.add || []) {
    const info = node.node_type === 'cloud' ? cloudInfo() : null;
    // graph.addItem('node', {
    //   ...node,
    //   x: pointAround(center_x),
    //   y: pointAround(center_y),
    //   cloudInfo: info,
    //   style: nodeStyle(node, info?.nodeStyle),
    //   children_ids: new Set(),
    // });
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
