import G6 from '@antv/g6';
import { merge } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { preset } from 'tailwind-preset';

import { g6Toolbar } from '@/components/graph/plugin';
import { G6Graph, G6GraphOptionsWithoutContainer } from '@/features/topology/types/graph';
import { Mode, useTheme } from '@/theme/ThemeContext';

const getEdgeStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  if (!active) {
    return {
      offset: 50,
      radius: 20,
      lineWidth: 1.5,
      stroke:
        theme === 'dark'
          ? preset.theme.extend.colors['brand-dark'].blue
          : preset.theme.extend.colors['brand-light'].blue,
      endArrow: {
        path: G6.Arrow.triangle(4, 5, 8),
        d: 10,
        fill:
          theme === 'dark'
            ? preset.theme.extend.colors['brand-dark'].blue
            : preset.theme.extend.colors['brand-light'].blue,
        stroke:
          theme === 'dark'
            ? preset.theme.extend.colors['brand-dark'].blue
            : preset.theme.extend.colors['brand-light'].blue,
      },
    };
  }
  return {
    lineWidth: 1.5,
    shadowBlur: 14,
    shadowColor:
      theme === 'dark'
        ? preset.theme.extend.colors.status.error
        : preset.theme.extend.colors.status.error,
    stroke:
      theme === 'dark'
        ? preset.theme.extend.colors.status.error
        : preset.theme.extend.colors.status.error,
    endArrow: {
      path: G6.Arrow.triangle(4, 5, 8),
      d: 10,
      fill:
        theme === 'dark'
          ? preset.theme.extend.colors.status.error
          : preset.theme.extend.colors.status.error,
      stroke:
        theme === 'dark'
          ? preset.theme.extend.colors.status.error
          : preset.theme.extend.colors.status.error,
    },
  };
};

const getLabelBgStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  if (!active) {
    return {
      fill: 'transparent',
      fillOpacity: 1,
      padding: [2, 4, 2, 4],
      radius: 3,
    };
  }

  return {
    fill:
      theme === 'dark'
        ? preset.theme.extend.colors.bg['breadcrumb-bar']
        : preset.theme.extend.colors.bg['breadcrumb-bar'],
    fillOpacity: 1,
    padding: [2, 4, 2, 4],
    radius: 3,
  };
};

const getLabelStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  if (!active) {
    return {
      fill:
        theme === 'dark'
          ? preset.theme.extend.colors.text['text-and-icon']
          : preset.theme.extend.colors.text['text-and-icon'],
      fontFamily: preset.theme.extend.fontFamily.body.join(','),
      fontSize: 13,
      fontWeight: 300,
      background: getLabelBgStyles({ active, theme }),
    };
  }

  return {
    fill:
      theme === 'dark'
        ? preset.theme.extend.colors.text['input-value']
        : preset.theme.extend.colors.text['input-value'],
    fontFamily: preset.theme.extend.fontFamily.body.join(','),
    fontSize: 13,
    fontWeight: 700,
    background: getLabelBgStyles({ active, theme }),
  };
};

const getNodeStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  if (!active) {
    return {
      lineWidth: 0,
      fill: preset.theme.extend.colors.bg['map-node'],
    };
  }
  return {
    lineWidth: 2,
    shadowBlur: 10,
    shadowColor:
      theme === 'dark'
        ? preset.theme.extend.colors.status.error
        : preset.theme.extend.colors.status.error,
    stroke:
      theme === 'dark'
        ? preset.theme.extend.colors.status.error
        : preset.theme.extend.colors.status.error,
    fill: preset.theme.extend.colors.bg['map-node'],
  };
};

const getDefaultOptions = (theme: Mode): G6GraphOptionsWithoutContainer => {
  return {
    fitView: true,
    maxZoom: 4,
    modes: {
      default: ['drag-canvas', 'zoom-canvas'],
    },
    plugins: [g6Toolbar],
    layout: {
      type: 'dagre',
      rankdir: 'TB',
      nodesep: 60,
      ranksep: 40,
      preventOverlap: true,
    },
    defaultNode: {
      type: 'threat-graph-node',
      size: 45,
      style: {
        ...getNodeStyles({ active: false, theme }),
        'node-label': getLabelStyles({ active: false, theme }),
        'node-label-bg': getLabelBgStyles({ active: true, theme }),
      },
      labelCfg: {
        position: 'bottom',
        offset: 12,
        style: getLabelStyles({ active: false, theme }),
      },
    },
    defaultEdge: {
      type: 'polyline',
      style: getEdgeStyles({ active: false, theme }),
    },
    nodeStateStyles: {
      active: {
        ...getNodeStyles({ active: true, theme }),
        'node-label': getLabelStyles({ active: true, theme }),
        'node-label-bg': getLabelBgStyles({ active: true, theme }),
      },
    },
    edgeStateStyles: {
      active: getEdgeStyles({ active: true, theme }),
    },
  } satisfies G6GraphOptionsWithoutContainer;
};

export const useG6Graph = (
  graphContainer: HTMLElement | null,
  options: G6GraphOptionsWithoutContainer = {},
) => {
  const [graph, setGraph] = useState<G6Graph | null>(null);
  const { mode } = useTheme();

  useUpdateEffect(() => {
    window.location.reload();
  }, [mode]);

  useEffect(() => {
    if (!graphContainer || graph) {
      return;
    }
    const width = graphContainer.offsetWidth;
    const height = graphContainer.offsetHeight;
    const g6Graph = new G6.Graph({
      ...merge(getDefaultOptions(mode), options),
      container: graphContainer,
      width,
      height,
    });
    g6Graph.read({
      nodes: [],
      edges: [],
    });
    g6Graph.render();
    setGraph(g6Graph);
  }, [graphContainer]);

  return { graph };
};
