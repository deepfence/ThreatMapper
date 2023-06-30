import G6 from '@antv/g6';
import { useEffect, useState } from 'react';
import { useUpdateEffect } from 'react-use';
import { preset } from 'tailwind-preset';

import {
  G6Graph,
  G6GraphData,
  G6GraphOptionsWithoutContainer,
} from '@/features/topology/types/graph';
import { Mode, useTheme } from '@/theme/ThemeContext';

const toolbar = new G6.ToolBar({
  className: 'absolute bottom-4 left-4',
  getContent: () => `<div>
    <ul class="list-none m-0 p-1 rounded bg-gray-50 dark:bg-bg-breadcrumb-bar dark:text-text-text-and-icon">
      <li code="zoom-out" title="Zoom Out" class="cursor-pointer w-6 h-6">
        <svg width="100%" height="100%" viewBox="0 0 37 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M17.0654 5C10.438 5 5.06543 10.3726 5.06543 17C5.06543 23.6274 10.438 29 17.0654 29C23.6928 29 29.0654 23.6274 29.0654 17C29.0654 10.3726 23.6928 5 17.0654 5ZM18.0654 16H22.0654C22.6177 16 23.0654 16.4477 23.0654 17C23.0654 17.5523 22.6177 18 22.0654 18H18.0654V22C18.0654 22.5523 17.6177 23 17.0654 23C16.5131 23 16.0654 22.5523 16.0654 22V18H12.0654C11.5131 18 11.0654 17.5523 11.0654 17C11.0654 16.4477 11.5131 16 12.0654 16H16.0654V12C16.0654 11.4477 16.5131 11 17.0654 11C17.6177 11 18.0654 11.4477 18.0654 12V16ZM27.6054 25.52L32.7754 30.69V30.74C33.1152 31.1368 33.0924 31.7282 32.723 32.0976C32.3536 32.4669 31.7622 32.4898 31.3654 32.15L26.2154 27C26.7148 26.5418 27.1794 26.0471 27.6054 25.52ZM7.81834 20.7158C9.36072 24.4636 13.0127 26.9098 17.0654 26.91C22.5533 26.9102 27.016 22.4877 27.0654 17C27.1019 12.9474 24.6887 9.27349 20.955 7.69729C17.2213 6.12108 12.9055 6.95428 10.0268 9.80704C7.14813 12.6598 6.27595 16.968 7.81834 20.7158Z" fill="currentColor"/>
        </svg>
      </li>
      <li code="zoom-in" title="Zoom In" class="mt-1 cursor-pointer w-6 h-6">
        <svg width="100%" height="100%" viewBox="0 0 37 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path fill-rule="evenodd" clip-rule="evenodd" d="M17.0654 5C10.438 5 5.06543 10.3726 5.06543 17C5.06543 23.6274 10.438 29 17.0654 29C23.6928 29 29.0654 23.6274 29.0654 17C29.0654 10.3726 23.6928 5 17.0654 5ZM21.0654 16C21.6177 16 22.0654 16.4477 22.0654 17C22.0654 17.5523 21.6177 18 21.0654 18H13.0654C12.5131 18 12.0654 17.5523 12.0654 17C12.0654 16.4477 12.5131 16 13.0654 16H21.0654ZM27.6054 25.52L32.7754 30.69V30.74C33.1152 31.1368 33.0924 31.7282 32.723 32.0976C32.3536 32.4669 31.7622 32.4898 31.3654 32.15L26.2154 27C26.7148 26.5418 27.1794 26.0471 27.6054 25.52ZM7.81834 20.7158C9.36072 24.4636 13.0127 26.9098 17.0654 26.91C22.5533 26.9102 27.016 22.4877 27.0654 17C27.1019 12.9474 24.6887 9.27349 20.955 7.69729C17.2213 6.12108 12.9055 6.95428 10.0268 9.80704C7.14813 12.6598 6.27595 16.968 7.81834 20.7158Z" fill="currentColor"/>
        </svg>
      </li>
      <li code="actual-size" title="Re-center" class="mt-1 cursor-pointer w-6 h-6">
        <svg width="100%" height="100%" viewBox="0 0 37 36" fill="none" xmlns="http://www.w3.org/2000/svg">
          <g>
            <path fill-rule="evenodd" clip-rule="evenodd" d="M7.95544 9H27.9554C29.06 9 29.9554 9.89543 29.9554 11V25C29.9554 26.1046 29.06 27 27.9554 27H7.95544C6.85087 27 5.95544 26.1046 5.95544 25V11C5.95544 9.89543 6.85087 9 7.95544 9ZM7.95544 11V25H27.9554V11H7.95544Z" fill="currentColor"/>
          </g>
        </svg>
      </li>
    </ul>
  </div>`,
  handleClick: (code, graph) => {
    const sensitivity = 2;
    const DELTA = 0.05;
    if (code === 'zoom-out') {
      const currentZoom = graph.getZoom();
      const height = graph.getHeight();
      const width = graph.getWidth();
      const ratioOut = 1 / (1 - DELTA * sensitivity);
      const maxZoom = graph.get('maxZoom');
      if (ratioOut * currentZoom > maxZoom) {
        return;
      }
      graph.zoomTo(
        currentZoom * ratioOut,
        {
          x: width / 2,
          y: height / 2,
        },
        true,
        { duration: 200, easing: 'easeCubic' },
      );
    } else if (code === 'zoom-in') {
      const currentZoom = graph.getZoom();
      const height = graph.getHeight();
      const width = graph.getWidth();
      const ratioIn = 1 - DELTA * sensitivity;
      const minZoom = graph.get('minZoom');
      if (ratioIn * currentZoom < minZoom) {
        return;
      }
      graph.zoomTo(
        currentZoom * ratioIn,
        {
          x: width / 2,
          y: height / 2,
        },
        true,
        { duration: 200, easing: 'easeCubic' },
      );
    } else if (code === 'actual-size') {
      graph.fitView(undefined, undefined, true, { duration: 200, easing: 'easeCubic' });
    }
  },
});

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
    lineWidth: 1.5,
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
        ? preset.theme.extend.colors.chart.blue3
        : preset.theme.extend.colors.chart.blue3,
    fill: preset.theme.extend.colors.bg['map-node'],
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

export const useG6raph = <D,>(
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
      plugins: [...plugins, toolbar],
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
