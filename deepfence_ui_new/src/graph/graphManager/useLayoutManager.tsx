import { ICombo, IEdge, INode, Item, Layout, Node } from '@antv/g6';

import {
  ApiNodeItemType,
  ICustomNode,
  IGraph,
  IItem,
  InputLayoutOptions,
  IStringIndex,
  LayoutOptions,
  OutputLayoutOptions,
  PointTuple,
} from '../types';
import { itemExpandsAsCombo } from './expand-collapse';
import { BASE_NODE_STRENGTH, gForceLayout, nodeStrength } from './gforce';

class LayoutExecutor {
  layout: typeof Layout;
  constructor(nodes: INode[], edges: IEdge[], options: OutputLayoutOptions['options']) {
    this.layout = new Layout.gForce(options);
    this.layout.init({ nodes, edges });
  }

  start() {
    this.layout.execute();
  }
}

const buildLayout = (graph: IGraph, node_id: string, options?: InputLayoutOptions) => {
  let item = null;
  if (node_id !== 'root') {
    item = graph.findById(node_id);
    if (item === undefined) {
      console.warn('aborting layout of node that no longer exists', node_id);
      return;
    }
  }

  if (node_id === 'root' || !itemExpandsAsCombo(item)) {
    return buildNormalLayout(graph, options);
  } else {
    return buildComboLayout(graph, item as Item, options);
  }
};

const buildComboLayout = (
  graph: IGraph,
  comboItem: IItem,
  options?: InputLayoutOptions,
) => {
  const model = comboItem?.get('model');
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;

  const combo = graph.findById(combo_id) as ICombo;
  const combo_model = combo.get('model');

  let { nodes } = combo.getChildren();
  nodes = nodes.map((n: INode) => n.get('model'));

  const center = graph.findById(combo_model.center_ids[0]) as ICombo;
  const edges = center.getOutEdges().map((e: IEdge) => e.get('model'));

  const center_model: {
    x: number;
    y: number;
  } = center.get('model');

  if (options?.expanding) {
    edges.push(...center.getInEdges().map((e: IEdge) => e.get('model')));
    nodes.push(model);
  }

  model.fx = model.x;
  model.fy = model.y;

  const num_nodes = nodes.length;

  return {
    nodes,
    edges,
    options: {
      ...gForceLayout(graph),
      center: [center_model.x, center_model.y] as PointTuple,

      nodeStrength: (node: ICustomNode) => {
        return nodeStrength(node, num_nodes);
      },

      tick: () => {
        if (options?.refreshOnTick !== false) {
          graph.refreshPositions();
        }
      },
      onLayoutEnd: () => {
        model.fx = null;
        model.fy = null;
        graph.refreshPositions();
      },
    },
  };
};

const buildNormalLayout = (
  graph: IGraph,
  options?: InputLayoutOptions,
): OutputLayoutOptions => {
  const nodes: Partial<ApiNodeItemType> = {};
  let edges = [];

  // nodes are already added to graph at this time
  // we extract nodes and edges to build gForce options

  for (const node of graph.getNodes()) {
    // model is actually a g6 graph node
    const model = node.get('model');
    if (!model || model.comboId) {
      continue;
    }
    // store node model by id in a map
    nodes[model.id] = model;

    for (const edge of node.getEdges()) {
      const model = edge.get('model');
      if (model.combo_pseudo || model.combo_pseudo_center) {
        continue;
      }
      edges.push(model);
    }
  }

  edges = edges.filter((e) => nodes[e.source] && nodes[e.target]) as IEdge[];
  // retrieves nodes model
  const _nodes = Object.values(nodes) as INode[];

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
    nodes: INode[],
    edges: IEdge[],
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

    const layout = buildLayout(graph, node_id, _opts);
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
