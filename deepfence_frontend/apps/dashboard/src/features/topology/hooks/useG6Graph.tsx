import G6 from '@antv/g6';
import { useEffect, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { preset } from 'tailwind-preset';

import { g6Toolbar } from '@/components/graph/plugin';
import {
  G6Graph,
  G6GraphData,
  G6GraphOptionsWithoutContainer,
} from '@/features/topology/types/graph';
import { Mode, useTheme } from '@/theme/ThemeContext';

const graphModeEnableOptimize = (mode: string) => {
  return {
    type: mode,
    enableOptimize: true,
    sensitivity: 0.7,
  };
};

const getEdgeStyles = ({ active, theme }: { active: boolean; theme: Mode }) => {
  if (!active) {
    return {
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
    lineWidth: 2.5,
    shadowBlur: 14,
    shadowColor: theme === 'dark' ? '#8AB9FF' : '#8AB9FF',
    stroke:
      theme === 'dark'
        ? preset.theme.extend.colors.accent.accent
        : preset.theme.extend.colors.accent.accent,
    endArrow: {
      path: G6.Arrow.triangle(4, 5, 8),
      d: 10,
      fill:
        theme === 'dark'
          ? preset.theme.extend.colors.accent.accent
          : preset.theme.extend.colors.accent.accent,
      stroke:
        theme === 'dark'
          ? preset.theme.extend.colors.accent.accent
          : preset.theme.extend.colors.accent.accent,
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
    shadowColor: theme === 'dark' ? '#8AB9FF' : '#8AB9FF',
    stroke:
      theme === 'dark'
        ? preset.theme.extend.colors.accent.accent
        : preset.theme.extend.colors.accent.accent,
    fill: preset.theme.extend.colors.bg['card'],
  };
};

const getDefaultOptions = (theme: Mode): G6GraphOptionsWithoutContainer => {
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
          theme === 'dark'
            ? preset.theme.extend.colors.bg['map-cluster']
            : preset.theme.extend.colors.bg['map-cluster'],
        fillOpacity: 0.25,
        lineWidth: 1.5,
        stroke:
          theme === 'dark'
            ? preset.theme.extend.colors['df-gray'][500]
            : preset.theme.extend.colors['df-gray'][500],
        strokeOpacity: 0.25,
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
