/* eslint-disable */

export const BASE_NODE_STRENGTH = 6000;

export const gForceLayout = (graph) => {
  return {
    preventOverlap: true,

    interval: 0.09,
    minMovement: 0.95,
    gravity: 4,
    maxSpeed: 500,
    damping: 0.2,

    linkDistance: linkDistance,

    edgeStrength: (edge) => {
      if (edge.combo_pseudo_center) {
        return 2000;
      }

      return 200;
    },

    nodeStrength,

    nodeSpacing: 4000,
  };
};

export const linkDistance = (edge) => {
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

export const initNodesAroundCenter = (nodes, x, y, r = 10) => {
  for (const node of nodes) {
    if (node.x === undefined) {
      node.x = pointAround(x, r);
      node.y = pointAround(y, r);
    }
  }
};

export const pointAround = (point, r = 10) => {
  return point - r + Math.random() * r * 2;
};

export const nodeStrength = (node, num_nodes) => {
  const mul = {
    host: 10,
  };

  return BASE_NODE_STRENGTH * (mul[node.node_type] || 1);
};
