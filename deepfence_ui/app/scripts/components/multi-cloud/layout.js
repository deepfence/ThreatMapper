/* eslint-disable */
import { Layout } from "@antv/g6";
import { itemExpandsAsCombo } from "./expand-collapse";
import { BASE_NODE_STRENGTH, gForceLayout, nodeStrength } from "./gforce";

export class LayoutManager {
  constructor(graph, opts) {
    this.graph = graph;
    this.opts = opts;
    this.layouts = {};
    this.queuedLayouts = [];
    this.currentExecutor = null;
    this.paused = false;
  }

  pause() {
    this.paused = true;
  }

  resume() {
    this.paused = false;
    this.maybeStartNextLayout();
  }

  layout(node_id, options) {
    this.layouts[node_id] = options;

    const index = this.queuedLayouts.findIndex((id) => node_id === id);
    if (index < 0) {
      this.queuedLayouts.push(node_id);
    }

    this.maybeStartNextLayout();
  }

  maybeStartNextLayout() {
    if (!this.paused && this.currentExecutor === null) {
      const next = this.queuedLayouts.shift();
      if (next) {
        this.startLayout(next);
      }
    }
  }

  buildExecutor(node_id, nodes, edges, options) {
    return new LayoutExecutor(nodes, edges, {
      ...options,
      tick: () => {
        if (this.opts?.tick) {
          this.opts.tick();
        }

        if (options?.tick) {
          options.tick();
        }
      },
      onLayoutEnd: () => {
        this.layoutEnded(node_id);
        try {
          if (options?.onLayoutEnd) {
            options.onLayoutEnd();
          }

          if (this.opts?.onLayoutEnd) {
            this.opts.onLayoutEnd();
          }
        } catch (e) {
          console.error("onLayoutEnd failed", e);
        }
        this.maybeStartNextLayout();
      },
    });
  }

  startLayout(node_id) {
    const opts = this.layouts[node_id];
    delete this.layouts[node_id];

    let layout = buildLayout(this.graph, node_id, opts);
    if (!layout) {
      return this.maybeStartNextLayout();
    }

    const { nodes, edges, options } = layout;
    this.currentExecutor = this.buildExecutor(node_id, nodes, edges, options);
    this.graph.emit("beforelayout");

    if (this.opts?.onLayoutStart) {
      this.opts.onLayoutStart();
    }

    this.currentExecutor.start();
  }

  layoutEnded(id) {
    this.currentExecutor = null;
    this.graph.emit("afterlayout");
  }
}

class LayoutExecutor {
  constructor(nodes, edges, options) {
    this.layout = new Layout.gForce(options);
    this.layout.init({ nodes, edges });
  }

  start() {
    this.layout.execute();
  }

  stop() {
    this.layout.stop();
  }
}

const buildLayout = (graph, node_id, options) => {
  let item = undefined;
  if (node_id !== "root") {
    item = graph.findById(node_id);
    if (item === undefined) {
      console.warn("aborting layout of node that no longer exists", node_id);
      return;
    }
  }

  if (node_id === "root" || !itemExpandsAsCombo(item)) {
    return buildRootLayout(graph, item, options);
  } else {
    return buildComboLayout(graph, item, options);
  }
};

const buildRootLayout = (graph, item, options) => {
  let nodes = {};
  let edges = [];

  for (const node of graph.getNodes()) {
    const model = node.get("model");
    if (!model || model.comboId) {
      continue;
    }
    nodes[model.id] = model;

    for (const edge of node.getEdges()) {
      const model = edge.get("model");
      if (model.combo_pseudo || model.combo_pseudo_center) {
        continue;
      }
      edges.push(model);
    }
  }

  edges = edges.filter((e) => nodes[e.source] && nodes[e.target]);
  nodes = Object.values(nodes);

  const center_x = graph.getWidth() / 2;
  const center_y = graph.getHeight() / 2;

  const num_nodes = nodes.length;

  return {
    nodes,
    edges,
    options: {
      ...gForceLayout(graph),

      center: [center_x, center_y],

      nodeStrength: (node) => {
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

const buildComboLayout = (graph, item, options) => {
  const model = item.get("model");
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;

  const combo = graph.findById(combo_id);
  const combo_model = combo.get("model");

  let { nodes } = combo.getChildren();
  nodes = nodes.map((n) => n.get("model"));

  const center = graph.findById(combo_model.center_ids[0]);
  const edges = center.getOutEdges().map((e) => e.get("model"));

  const center_model = center.get("model");

  if (options.expanding) {
    edges.push(...center.getInEdges().map((e) => e.get("model")));
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
      center: [center_model.x, center_model.y],

      nodeStrength: (node) => {
        return nodeStrength(node, num_nodes);
      },

      tick: () => {
        if (options.refreshOnTick !== false) {
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
