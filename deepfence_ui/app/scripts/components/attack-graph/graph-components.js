import G6 from "@antv/g6";

export const computeEdgeColor = '#007fff';
export const serviceEdgeColor = '#12c4c1';
export const computeEdgeConfig = {
  type: 'cubic-vertical',
  size: 2,
  color: computeEdgeColor,
  style: {
    endArrow: {
      path: G6.Arrow.triangle(4, 6, 12),
      d: 16,
      fill: computeEdgeColor,
      stroke: computeEdgeColor,
      fillOpacity: 0.6,
      strokeOpacity: 0.6,
      opacity: 0.6,
    },
    opacity: 0.6,
    radius: 20,
  },
};
