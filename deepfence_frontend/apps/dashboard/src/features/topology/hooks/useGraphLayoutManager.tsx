import { Layout } from '@antv/g6';
import { PointTuple } from '@antv/layout';
import { useRef } from 'react';

import {
  EnhancedDetailedNodeSummary,
  G6Combo,
  G6Edge,
  G6Graph,
  G6Item,
  G6Layout,
  G6Node,
  InputLayoutOptions,
  LayoutOptions,
  OutputLayoutOptions,
} from '@/features/topology/types/graph';
import { itemExpandsAsCombo } from '@/features/topology/utils/expand-collapse';
import {
  BASE_NODE_STRENGTH,
  gForceLayout,
  nodeStrength,
} from '@/features/topology/utils/gForce';

export function useGraphLayoutManager(graph: G6Graph | null, options: LayoutOptions) {
  const layoutsRef = useRef<Record<string, InputLayoutOptions | null>>({});
  const queuedLayoutsRef = useRef<string[]>([]);
  const pausedRef = useRef(false);
  const currentExecutorRef = useRef<LayoutExecutor | null>(null);

  function layoutEnded() {
    currentExecutorRef.current = null;
    graph?.emit('afterlayout');
  }

  const buildExecutor = (
    nodes: G6Node[],
    edges: G6Edge[],
    layoutOptions: OutputLayoutOptions['options'],
  ) => {
    return new LayoutExecutor(nodes, edges, {
      ...layoutOptions,
      tick: () => {
        if (options?.tick) {
          options.tick();
        }

        if (layoutOptions?.tick) {
          layoutOptions.tick();
        }
      },
      onLayoutEnd: () => {
        layoutEnded();
        try {
          if (layoutOptions?.onLayoutEnd) {
            layoutOptions.onLayoutEnd();
          }

          if (options?.onLayoutEnd) {
            options.onLayoutEnd();
          }
        } catch (e) {
          console.error('onLayoutEnd failed', e);
        }
        maybeStartNextLayout();
      },
    });
  };

  const layout = (nodeId: string, options?: InputLayoutOptions) => {
    layoutsRef.current[nodeId] = options ?? null;
    const index = queuedLayoutsRef.current.findIndex((id) => nodeId === id);
    if (index < 0) {
      queuedLayoutsRef.current.push(nodeId);
    }
    maybeStartNextLayout();
  };
  const maybeStartNextLayout = () => {
    if (!pausedRef.current && !currentExecutorRef.current) {
      const next = queuedLayoutsRef.current.shift();

      if (next) {
        startLayout(next);
      }
    }
  };

  const startLayout = (node_id: string) => {
    const _opts = layoutsRef.current[node_id];
    delete layoutsRef.current[node_id];

    const layout = buildLayout(graph!, node_id, _opts);
    if (!layout) {
      return maybeStartNextLayout();
    }

    const { nodes, edges, options: layoutOptions } = layout;
    currentExecutorRef.current = buildExecutor(nodes, edges, layoutOptions);

    graph?.emit('beforelayout');

    if (options?.onLayoutStart) {
      options.onLayoutStart();
    }

    currentExecutorRef.current?.start();
  };

  if (!graph) return {};

  return { layout };
}

class LayoutExecutor {
  layout: G6Layout;
  constructor(nodes: G6Node[], edges: G6Edge[], options: OutputLayoutOptions['options']) {
    this.layout = new Layout.gForce(options);
    this.layout.init({ nodes, edges });
  }

  start() {
    this.layout.execute();
  }
}

const buildLayout = (
  graph: G6Graph,
  nodeId: string,
  options: InputLayoutOptions | null,
) => {
  let item = null;
  if (nodeId !== 'root') {
    item = graph.findById(nodeId);
    if (item === undefined) {
      console.warn('aborting layout of node that no longer exists', nodeId);
      return;
    }
  }

  if (nodeId === 'root' || !itemExpandsAsCombo(item)) {
    return buildNormalLayout(graph, options);
  } else {
    return buildComboLayout(graph, item as G6Item, options);
  }
};

const buildNormalLayout = (
  graph: G6Graph,
  options: InputLayoutOptions | null,
): OutputLayoutOptions => {
  const nodes: Record<string, EnhancedDetailedNodeSummary> = {};
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

  edges = edges.filter((e) => nodes[e.source] && nodes[e.target]) as G6Edge[];
  // retrieves nodes model
  const _nodes = Object.values(nodes);

  const center_x = graph.getWidth() / 2;
  const center_y = graph.getHeight() / 2;

  return {
    nodes: _nodes as any,
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

const buildComboLayout = (
  graph: G6Graph,
  comboItem: G6Item,
  options: InputLayoutOptions | null,
) => {
  const model = comboItem?.get('model');
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;

  const combo = graph.findById(combo_id) as G6Combo;
  const combo_model = combo.get('model');

  let { nodes } = combo.getChildren();
  nodes = nodes.map((n: G6Node) => n.get('model'));

  const center = graph.findById(combo_model.center_ids[0]) as G6Combo;
  const edges = center.getOutEdges().map((e: G6Edge) => e.get('model'));

  const center_model: {
    x: number;
    y: number;
  } = center.get('model');

  if (options?.expanding) {
    edges.push(...center.getInEdges().map((e: G6Edge) => e.get('model')));
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

      nodeStrength: (node: EnhancedDetailedNodeSummary) => {
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
