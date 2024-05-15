import G6 from '@antv/g6';
import { useEffect, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { colors, preset } from 'tailwind-preset';

import { g6Toolbar } from '@/components/graph/plugin';
import {
  G6Graph,
  G6GraphData,
  G6GraphOptionsWithoutContainer,
} from '@/features/topology/types/graph';
import { Mode, THEME_DARK, THEME_LIGHT, useTheme } from '@/theme/ThemeContext';

const graphModeEnableOptimize = (mode: string) => {
  return {
    type: mode,
    enableOptimize: true,
    sensitivity: 0.7,
  };
};

const getEdgeStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  const isDarkTheme = theme === THEME_DARK;
  const color = colors[isDarkTheme ? 'darkVariables' : 'variables'].DEFAULT;

  if (!active) {
    return {
      lineWidth: isDarkTheme ? 1.5 : 2,
      stroke: isDarkTheme ? color['brand-blue'] : '#4B88FF',
      endArrow: {
        path: G6.Arrow.triangle(4, 5, 8),
        d: 10,
        fill: isDarkTheme ? color['brand-blue'] : '#4B88FF',
        stroke: isDarkTheme ? color['brand-blue'] : '#4B88FF',
      },
    };
  }
  return {
    lineWidth: 2.5,
    shadowBlur: 20,
    shadowColor: isDarkTheme ? '#8AB9FF' : '#0075FF',
    stroke: isDarkTheme ? color['accent-accent'] : '#0094FF',
    endArrow: {
      path: G6.Arrow.triangle(4, 5, 8),
      d: 10,
      fill: isDarkTheme ? color['accent-accent'] : '#0094FF',
      stroke: isDarkTheme ? color['accent-accent'] : '#0094FF',
    },
  };
};

const getLabelBgStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  const isDarkTheme = theme === THEME_DARK;
  const color = colors[isDarkTheme ? 'darkVariables' : 'variables'].DEFAULT;

  if (!active) {
    return {
      fill: 'transparent',
      fillOpacity: 1,
      padding: [2, 4, 2, 4],
      radius: 3,
    };
  }

  return {
    fill: isDarkTheme ? color['bg-breadcrumb-bar'] : '',
    fillOpacity: 1,
    padding: [2, 4, 2, 4],
    radius: 3,
  };
};

const getLabelStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  const isDarkTheme = theme === THEME_DARK;
  const color = colors[isDarkTheme ? 'darkVariables' : 'variables'].DEFAULT;

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
    fill: isDarkTheme ? color['text-input-value'] : color['text-text-and-icon'],
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
    lineWidth: 2.2,
    shadowBlur: 20,
    shadowColor: isLightTheme ? '#0066FF' : color['accent-accent'],
    stroke: isLightTheme ? '#0075FF' : color['accent-accent'],
    fill: isLightTheme ? color['bg-card'] : color['bg-map-node'],
  };
};

const getDefaultOptions = (theme: Mode): G6GraphOptionsWithoutContainer => {
  const color = colors[theme === 'dark' ? 'darkVariables' : 'variables'].DEFAULT;

  return {
    animate: false,
    fitCenter: true,
    groupByTypes: false,
    defaultNode: {
      type: 'circle',
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
      type: 'cubic',
      style: getEdgeStyles({ active: false, theme }),
    },
    defaultCombo: {
      padding: 0,
      style: {
        fill:
          theme === 'dark' ? color['bg-map-cluster'] : 'r(1, 1, 1) 0:#FAF0F4 1:#7C99C6',
        fillOpacity: 0.25,
        lineWidth: 1.5,
        stroke: theme === 'dark' ? color['df-gray']['500'] : color['df-gray']['300'],
        strokeOpacity: theme === 'dark' ? 0.25 : 1,
      },
    },
    nodeStateStyles: {
      active: {
        ...getNodeStyles({ active: true, theme }),
        'node-label': getLabelStyles({ active: true, theme }),
        'node-label-bg': getLabelBgStyles({ active: true, theme }),
      },
    },
    comboStateStyles: {
      active: {},
      inactive: {},
    },
    edgeStateStyles: {
      active: getEdgeStyles({ active: true, theme }),
    },
    modes: {
      default: [
        graphModeEnableOptimize('drag-canvas'),
        graphModeEnableOptimize('zoom-canvas'),
        {
          type: 'drag-node',
          onlyChangeComboSize: true,
        },
        'drag-combo',
      ],
    },
  } satisfies G6GraphOptionsWithoutContainer;
};

export const useG6Graph = <D,>(
  graphContainer: HTMLElement | null,
  data: D,
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
    const plugins = options.plugins ?? [];
    const width = graphContainer.offsetWidth;
    const height = graphContainer.offsetHeight;
    const g6Graph = new G6.Graph({
      plugins: [...plugins, g6Toolbar],
      ...getDefaultOptions(mode),
      ...options,
      container: graphContainer,
      width,
      height,
    });
    g6Graph.data(data as G6GraphData);
    g6Graph.render();
    setGraph(g6Graph);
  }, [graphContainer]);

  return { graph };
};
