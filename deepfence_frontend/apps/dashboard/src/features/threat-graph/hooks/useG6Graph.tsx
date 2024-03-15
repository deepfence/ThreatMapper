import G6 from '@antv/g6';
import { merge } from 'lodash-es';
import { useEffect, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { colors, preset } from 'tailwind-preset';

import { g6Toolbar } from '@/components/graph/plugin';
import { G6Graph, G6GraphOptionsWithoutContainer } from '@/features/topology/types/graph';
import { Mode, THEME_LIGHT, useTheme } from '@/theme/ThemeContext';

const getEdgeStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  const isLightTheme = theme === THEME_LIGHT;
  const color = colors[isLightTheme ? 'variables' : 'darkVariables'].DEFAULT;

  if (!active) {
    return {
      offset: 50,
      radius: 20,
      lineWidth: 1.5,
      stroke: isLightTheme ? color['text-link'] : color['brand-blue'],
      endArrow: {
        path: G6.Arrow.triangle(4, 5, 8),
        d: 10,
        fill: isLightTheme ? color['text-link'] : color['brand-blue'],
        stroke: isLightTheme ? color['text-link'] : color['brand-blue'],
      },
    };
  }
  return {
    lineWidth: 1.5,
    shadowBlur: 14,
    shadowColor: isLightTheme ? '#FF214C' : color['brand-error'],
    stroke: color['brand-error'],
    endArrow: {
      path: G6.Arrow.triangle(4, 5, 8),
      d: 10,
      fill: color['brand-error'],
      stroke: color['brand-error'],
    },
  };
};

const getLabelBgStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  const color = colors[theme === 'light' ? 'variables' : 'darkVariables'].DEFAULT;

  if (!active) {
    return {
      fill: 'transparent',
      fillOpacity: 1,
      padding: [2, 4, 2, 4],
      radius: 3,
    };
  }

  return {
    fill: color['bg-breadcrumb-bar'],
    fillOpacity: 1,
    padding: [2, 4, 2, 4],
    radius: 3,
  };
};

const getLabelStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  const color = colors[theme === 'light' ? 'variables' : 'darkVariables'].DEFAULT;

  if (!active) {
    return {
      fill: color['text-text-and-icon'],
      fontFamily: preset.theme.extend.fontFamily.body.join(','),
      fontSize: 13,
      fontWeight: 500,
      lineHeight: 18,
      background: getLabelBgStyles({ active, theme }),
    };
  }

  return {
    fill: color['text-text-and-icon'],
    fontFamily: preset.theme.extend.fontFamily.body.join(','),
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 18,
    background: getLabelBgStyles({ active, theme }),
  };
};

const getNodeStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  const isLightTheme = theme === THEME_LIGHT;
  const color = colors[isLightTheme ? 'variables' : 'darkVariables'].DEFAULT;

  if (!active) {
    return {
      lineWidth: 0,
      fill: isLightTheme ? color['bg-card'] : color['bg-map-node'],
      shadowBlur: isLightTheme ? 10 : 0,
      shadowColor: isLightTheme ? color['df-gray'][400] : '',
      stroke: isLightTheme ? color['df-gray'][400] : '',
      background: isLightTheme ? color['bg-card'] : '',
    };
  }
  return {
    lineWidth: 2,
    shadowBlur: 10,
    shadowColor: color['brand-error'],
    stroke: color['brand-error'],
    fill: isLightTheme ? color['bg-card'] : color['bg-map-node'],
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
