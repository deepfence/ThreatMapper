import { EnhancedDetailedNodeSummary, G6Graph } from '@/features/topology/types/graph';

export const BASE_NODE_STRENGTH = 6000;

// gForce Layout properties can be found here: https://g6.antv.vision/en/docs/api/graphLayout/gforce
export const gForceLayout = (graph: G6Graph) => {
  return {
    preventOverlap: true,

    interval: 0.09,
    minMovement: 0.95,
    gravity: 4,
    maxSpeed: 500,
    damping: 0.2,

    linkDistance: linkDistance,

    edgeStrength: (edge: any) => {
      if (edge.combo_pseudo_center) {
        return 2000;
      }

      return 200;
    },

    nodeStrength,

    nodeSpacing: 4000,
  };
};

export const linkDistance = (edge: any) => {
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

export const nodeStrength = (node: EnhancedDetailedNodeSummary, num_nodes: number) => {
  const mul: Record<string, number> = {
    host: 10,
  };

  return BASE_NODE_STRENGTH * (mul[node.df_data?.type ?? ''] || 1);
};
