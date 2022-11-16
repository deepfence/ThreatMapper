/* eslint-disable */
import { ICombo } from '@antv/g6';

import { ICustomEdge, ICustomNode, IGraph, INode, IStringIndex } from '../types';

export const BASE_NODE_STRENGTH = 6000;

// We use gForceLayout and properties can be found here: https://g6.antv.vision/en/docs/api/graphLayout/gforce

export const gForceLayout = (graph: IGraph) => {
  return {
    preventOverlap: true,

    interval: 0.09,
    minMovement: 0.95,
    gravity: 4,
    maxSpeed: 500,
    damping: 0.2,

    linkDistance: linkDistance,

    edgeStrength: (edge: ICustomEdge) => {
      if (edge.combo_pseudo_center) {
        return 2000;
      }

      return 200;
    },

    nodeStrength,

    nodeSpacing: 4000,
  };
};

export const linkDistance = (edge: ICustomEdge) => {
  if (edge.combo_pseudo_inner) {
    // setting this to non-zero creates a "hole" inside combos
    return -1;
  }

  if (edge.combo_pseudo_center) {
    // the distance between combos and their parent
    return 600;
  }

  // default link length
  return 250;
};

export const pointAround = (point: number, r = 10) => {
  return point - r + Math.random() * r * 2;
};

export const nodeStrength = (node: ICustomNode, num_nodes: number) => {
  const mul: IStringIndex<number> = {
    host: 10,
  };

  return BASE_NODE_STRENGTH * (mul[node.node_type] || 1);
};
