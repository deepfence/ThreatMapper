import G6 from '@antv/g6';
import { useEffect, useState } from 'react';
import { useUpdateEffect } from 'react-use';

import { G6Graph, G6GraphOptionsWithoutContainer } from '@/features/topology/types/graph';
import { GraphPalette } from '@/features/topology/utils/graph-styles';
import { Mode, useTheme } from '@/theme/ThemeContext';

const toolbar = new G6.ToolBar({
  className: 'absolute bottom-2.5 left-2.5',
  getContent: () => `<div>
    <ul class="list-none m-0 p-2.5 pt-0 rounded-md drop-shadow-md shadow-gray-500 border-solid border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
      <li code="zoom-out" title="Zoom Out" class="mt-2.5 cursor-pointer">
        <svg class="fill-gray-500 dark:fill-gray-400" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <path d="M658.432 428.736a33.216 33.216 0 0 1-33.152 33.152H525.824v99.456a33.216 33.216 0 0 1-66.304 0V461.888H360.064a33.152 33.152 0 0 1 0-66.304H459.52V296.128a33.152 33.152 0 0 1 66.304 0V395.52H625.28c18.24 0 33.152 14.848 33.152 33.152z m299.776 521.792a43.328 43.328 0 0 1-60.864-6.912l-189.248-220.992a362.368 362.368 0 0 1-215.36 70.848 364.8 364.8 0 1 1 364.8-364.736 363.072 363.072 0 0 1-86.912 235.968l192.384 224.64a43.392 43.392 0 0 1-4.8 61.184z m-465.536-223.36a298.816 298.816 0 0 0 298.432-298.432 298.816 298.816 0 0 0-298.432-298.432A298.816 298.816 0 0 0 194.24 428.8a298.816 298.816 0 0 0 298.432 298.432z"></path>
        </svg>
      </li>
      <li code="zoom-in" title="Zoom In" class="mt-2.5 cursor-pointer">
        <svg class="fill-gray-500 dark:fill-gray-400" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="24" height="24">
          <path d="M639.936 416a32 32 0 0 1-32 32h-256a32 32 0 0 1 0-64h256a32 32 0 0 1 32 32z m289.28 503.552a41.792 41.792 0 0 1-58.752-6.656l-182.656-213.248A349.76 349.76 0 0 1 480 768 352 352 0 1 1 832 416a350.4 350.4 0 0 1-83.84 227.712l185.664 216.768a41.856 41.856 0 0 1-4.608 59.072zM479.936 704c158.784 0 288-129.216 288-288S638.72 128 479.936 128a288.32 288.32 0 0 0-288 288c0 158.784 129.216 288 288 288z" p-id="3853"></path>
        </svg>
      </li>
      <li code="actual-size" title="Re-center" class="mt-2.5 cursor-pointer flex items-center justify-center">
        <svg class="fill-gray-500 dark:fill-gray-400" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" width="20" height="24">
          <path d="M684.288 305.28l0.128-0.64-0.128-0.64V99.712c0-19.84 15.552-35.904 34.496-35.712a35.072 35.072 0 0 1 34.56 35.776v171.008h170.944c19.648 0 35.84 15.488 35.712 34.432a35.072 35.072 0 0 1-35.84 34.496h-204.16l-0.64-0.128a32.768 32.768 0 0 1-20.864-7.552c-1.344-1.024-2.816-1.664-3.968-2.816-0.384-0.32-0.512-0.768-0.832-1.088a33.472 33.472 0 0 1-9.408-22.848zM305.28 64a35.072 35.072 0 0 0-34.56 35.776v171.008H99.776A35.072 35.072 0 0 0 64 305.216c0 18.944 15.872 34.496 35.84 34.496h204.16l0.64-0.128a32.896 32.896 0 0 0 20.864-7.552c1.344-1.024 2.816-1.664 3.904-2.816 0.384-0.32 0.512-0.768 0.768-1.088a33.024 33.024 0 0 0 9.536-22.848l-0.128-0.64 0.128-0.704V99.712A35.008 35.008 0 0 0 305.216 64z m618.944 620.288h-204.16l-0.64 0.128-0.512-0.128c-7.808 0-14.72 3.2-20.48 7.68-1.28 1.024-2.752 1.664-3.84 2.752-0.384 0.32-0.512 0.768-0.832 1.088a33.664 33.664 0 0 0-9.408 22.912l0.128 0.64-0.128 0.704v204.288c0 19.712 15.552 35.904 34.496 35.712a35.072 35.072 0 0 0 34.56-35.776V753.28h170.944c19.648 0 35.84-15.488 35.712-34.432a35.072 35.072 0 0 0-35.84-34.496z m-593.92 11.52c-0.256-0.32-0.384-0.768-0.768-1.088-1.088-1.088-2.56-1.728-3.84-2.688a33.088 33.088 0 0 0-20.48-7.68l-0.512 0.064-0.64-0.128H99.84a35.072 35.072 0 0 0-35.84 34.496 35.072 35.072 0 0 0 35.712 34.432H270.72v171.008c0 19.84 15.552 35.84 34.56 35.776a35.008 35.008 0 0 0 34.432-35.712V720l-0.128-0.64 0.128-0.704a33.344 33.344 0 0 0-9.472-22.848zM512 374.144a137.92 137.92 0 1 0 0.128 275.84A137.92 137.92 0 0 0 512 374.08z"></path>
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

const tooltip = new G6.Tooltip({
  offsetX: 10,
  offsetY: 10,
  itemTypes: ['node'],
  className: 'g6-tooltip-override',
  getContent: (e) => {
    return `
      <div role="tooltip" class="inline-block text-sm font-light text-gray-500 bg-white border border-gray-200 rounded-lg shadow-sm w-72 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400">
          TODO
      </div>
    `;
  },
});

const getDefaultOptions = (theme: Mode): G6GraphOptionsWithoutContainer => {
  return {
    fitView: true,
    maxZoom: 4,
    modes: {
      default: ['drag-canvas', 'zoom-canvas'],
    },
    plugins: [toolbar],
    layout: {
      type: 'dagre',
      rankdir: 'TB',
      nodesep: 60,
      ranksep: 40,
      preventOverlap: true,
    },
    defaultNode: {
      type: 'threat-graph-node',
      labelCfg: {
        style: {
          fill:
            theme === 'dark'
              ? GraphPalette.LABEL_TEXT_DARK
              : GraphPalette.LABEL_TEXT_LIGHT,
          fontFamily: 'Inter',
          fontSize: 12,
          background: {
            fill:
              theme === 'dark'
                ? GraphPalette.LABEL_BACKGROUND_DARK
                : GraphPalette.LABEL_BACKGROUND_LIGHT,
            fillOpacity: 0.1,
            padding: [2, 4, 2, 4],
            radius: 2,
          },
        },
      },
    },
    defaultEdge: {
      type: 'cubic-vertical',
      size: 2,
      color: theme === 'dark' ? GraphPalette.EDGE_DARK : GraphPalette.EDGE_LIGHT,
      style: {
        opacity: 0.7,
        strokeOpacity: 0.7,
        fillOpacity: 0.7,
        endArrow: {
          path: G6.Arrow.vee(4, 5, 12),
          d: 14,
          fill: theme === 'dark' ? GraphPalette.EDGE_DARK : GraphPalette.EDGE_LIGHT,
          stroke: theme === 'dark' ? GraphPalette.EDGE_DARK : GraphPalette.EDGE_LIGHT,
        },
        radius: 20,
      },
    },
  };
};

export const useG6raph = (
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
    const plugins = options.plugins ?? [];
    const width = graphContainer.offsetWidth;
    const height = graphContainer.offsetHeight;
    const g6Graph = new G6.Graph({
      plugins: [...plugins, toolbar, tooltip],
      ...getDefaultOptions(mode),
      ...options,
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
