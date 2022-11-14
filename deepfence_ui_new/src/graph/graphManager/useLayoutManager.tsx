import { Edge, Layout, Node } from '@antv/g6';

import { BASE_NODE_STRENGTH, gForceLayout } from '../../topology/gforce';
import {
  ApiNodeItemType,
  IGraph,
  InputLayoutOptions,
  IStringIndex,
  LayoutOptions,
  OutputLayoutOptions,
} from '../types';

class LayoutExecutor {
  layout: typeof Layout;
  constructor(nodes: Node[], edges: Edge[], options: OutputLayoutOptions['options']) {
    this.layout = new Layout.gForce(options);
    this.layout.init({ nodes, edges });
  }

  start() {
    this.layout.execute();
  }
}

const buildRootLayout = (
  graph: IGraph,
  options?: InputLayoutOptions,
): OutputLayoutOptions => {
  const nodes: Partial<ApiNodeItemType> = {};
  let edges = [];

  for (const node of graph.getNodes()) {
    const model = node.get('model');
    if (!model || model.comboId) {
      continue;
    }
    nodes[model.id] = model;

    for (const edge of node.getEdges()) {
      const model = edge.get('model');
      if (model.combo_pseudo || model.combo_pseudo_center) {
        continue;
      }
      edges.push(model);
    }
  }

  edges = edges.filter((e) => nodes[e.source] && nodes[e.target]) as Edge[];
  const _nodes = Object.values(nodes) as Node[];

  const center_x = graph.getWidth() / 2;
  const center_y = graph.getHeight() / 2;

  return {
    nodes: _nodes,
    edges,
    options: {
      ...gForceLayout(graph),

      center: [center_x, center_y],

      nodeStrength: () => {
        return BASE_NODE_STRENGTH;
      },

      tick: () => {
        if (options?.refreshOnTick !== false) {
          graph.refreshPositions();
        }
      },

      onLayoutEnd: () => {
        graph.refreshPositions();
      },
    },
  };
};

export type LayoutType = {
  layout?: (node_id: string, options?: InputLayoutOptions) => void;
};

export const useLayoutManager = (graph: IGraph | null, opts: LayoutOptions) => {
  if (graph === null) {
    return {};
  }
  const layouts: Partial<IStringIndex<InputLayoutOptions>> = {};
  const queuedLayouts: string[] = [];
  let currentExecutor: LayoutExecutor | null = null;
  const paused = false;

  function layoutEnded() {
    currentExecutor = null;
    graph?.emit('afterlayout');
  }
  const buildExecutor = (
    nodes: Node[],
    edges: Edge[],
    options: OutputLayoutOptions['options'],
  ) => {
    return new LayoutExecutor(nodes, edges, {
      ...options,
      tick: () => {
        if (opts?.tick) {
          opts.tick();
        }

        if (options?.tick) {
          options.tick();
        }
      },
      onLayoutEnd: () => {
        layoutEnded();
        try {
          if (options?.onLayoutEnd) {
            options.onLayoutEnd();
          }

          if (opts?.onLayoutEnd) {
            opts.onLayoutEnd();
          }
        } catch (e) {
          console.error('onLayoutEnd failed', e);
        }
        maybeStartNextLayout();
      },
    });
  };
  const layout = (node_id: string, options?: InputLayoutOptions) => {
    layouts[node_id] = options;
    const index = queuedLayouts.findIndex((id) => node_id === id);
    if (index < 0) {
      queuedLayouts.push(node_id);
    }
    maybeStartNextLayout();
  };
  const maybeStartNextLayout = () => {
    if (!paused && !currentExecutor) {
      const next = queuedLayouts.shift();

      if (next) {
        startLayout(next);
      }
    }
  };
  const startLayout = (node_id: string) => {
    const _opts: InputLayoutOptions | undefined = layouts[node_id];
    delete layouts[node_id];

    const layout = buildRootLayout(graph, _opts);
    if (!layout) {
      return maybeStartNextLayout();
    }

    const { nodes, edges, options } = layout;
    currentExecutor = buildExecutor(nodes, edges, options);

    graph.emit('beforelayout');

    if (opts?.onLayoutStart) {
      opts.onLayoutStart();
    }

    currentExecutor.start();
  };

  return { layout };
};
