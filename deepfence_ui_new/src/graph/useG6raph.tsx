import './topology/topology.css';

import G6 from '@antv/g6';
import { useEffect, useState } from 'react';

import { COLORS } from './theme';
import { IGraph, OptionsWithoutContainer } from './types';

const toolbar = new G6.ToolBar({
  className: 'g6-df-toolbar',
  getContent: () => {
    const outDiv = document.createElement('div');
    outDiv.innerHTML = `<ul>
            <li code="zoom-out" title="Zoom Out"><i class="fa fa-lg fa-search-plus"></i></li>
            <li code="zoom-in" title="Zoom In"><i class="fa fa-lg fa-search-minus"></i></li>
            <li code="actual-size" title="Re-center"><i class="fa fa-lg fa-compress"></i></li>
          </ul>`;
    return outDiv;
  },
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
      graph.zoomTo(currentZoom * ratioOut, {
        x: width / 2,
        y: height / 2,
      });
    } else if (code === 'zoom-in') {
      const currentZoom = graph.getZoom();
      const height = graph.getHeight();
      const width = graph.getWidth();
      const ratioIn = 1 - DELTA * sensitivity;
      const minZoom = graph.get('minZoom');
      if (ratioIn * currentZoom < minZoom) {
        return;
      }
      graph.zoomTo(currentZoom * ratioIn, {
        x: width / 2,
        y: height / 2,
      });
    } else if (code === 'actual-size') {
      graph.fitView();
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

const DEFAULT_OPTIONS: OptionsWithoutContainer = {
  animate: false,
  fitCenter: true,
  groupByTypes: false,
  defaultNode: {
    style: {
      // DO NOT set .fill here, as it breaks image nodes.
      stroke: COLORS.NODE_OUTLINE,
      lineWidth: 2,
      cursor: 'pointer',
    },
    labelCfg: {
      position: 'bottom',
      offset: 12,
      style: {
        stroke: 'black',
        lineWidth: 0,
        fill: COLORS.LABEL,
        fontFamily: 'Source Sans Pro',
        fontSize: 20,
        background: {
          fill: '#ffffff',
          fillOpacity: 0.1,
          padding: [2, 4, 2, 4],
          radius: 2,
        },
      },
    },
  },
  defaultEdge: {
    type: 'cubic',
    size: 2,
    color: COLORS.EDGE,
    style: {
      opacity: 0.6,
      endArrow: {
        path: G6.Arrow.triangle(4, 6, 12),
        opacity: 0.6,
        strokeOpacity: 0.6,
        fillOpacity: 0.6,
        d: 16,
      },
    },
  },
  defaultCombo: {
    padding: 0,
    style: {
      fill: '#111111',
      fillOpacity: 0.6,
      stroke: COLORS.EDGE,
      strokeOpacity: 0.5,
    },
  },

  // state style
  nodeStateStyles: {
    active: {
      fill: '#fefefe',
    },
    inactive: {
      fill: 'red',
    },
  },
  comboStateStyles: {
    active: {},
    inactive: {},
  },

  edgeStateStyles: {
    active: {
      lineWidth: 3,
      stroke: COLORS.ACTIVE_EDGE,
      opacity: 0.6,
    },
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
      // {
      //   type: "activate-relations",
      //   trigger: "mouseenter",
      // },
    ],
  },
};

export const useG6raph = <D,>(
  graphContainer: HTMLElement | null,
  data: D,
  options: OptionsWithoutContainer = {},
) => {
  const [graph, setGraph] = useState<IGraph | null>(null);

  useEffect(() => {
    if (!graphContainer) {
      return;
    }
    const width = graphContainer.offsetWidth;
    const height = graphContainer.offsetHeight;
    const graph = new G6.Graph({
      plugins: [toolbar],
      ...DEFAULT_OPTIONS,
      ...options,
      container: graphContainer,
      width,
      height,
    });
    graph.data(data);
    graph.render();
    setGraph(graph);
  }, [graphContainer]);

  return { graph };
};
