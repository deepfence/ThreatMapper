/**
 * Topology Graph utilities
 */

import { StringIndexType } from './topology-client';

export const nodeSize = (node_type: string) => {
  const mul: StringIndexType<number> = {
    container: 0.5,
    process: 0.5,
  };

  const size = (mul[node_type] || 1) * 60;
  return size;
};

export const nodeTypeMapping = (type: string): string => {
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

export const getConditionalFontSize = (nodeType: string) => {
  switch (nodeType) {
    case 'pod':
    case 'container':
    case 'process':
      return 14;
  }
};
