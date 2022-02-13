/* eslint-disable */
import {
  collapseNode,
  finishExpandingNode,
  itemExpandsAsCombo,
  itemIsExpanded,
  itemIsExpanding,
  pseudoEdge,
  removeNodeItem,
} from "./expand-collapse";
import { pointAround } from "./gforce";
import { COLORS, PALETTE } from "./theme";

export const updateRootNodes = (graph, delta) => {
  for (const node_id of delta.remove || []) {
    const node = graph.findById(node_id);
    if (node === undefined) {
      console.error("trying to remove unknown root node", node_id);
      continue;
    }
    removeNodeItem(graph, node);
  }

  const center_x = graph.getWidth() / 2;
  const center_y = graph.getHeight() / 2;

  for (const node of delta.add || []) {
    const info = node.node_type === "cloud" ? cloudInfo() : null;
    graph.addItem("node", {
      ...node,
      x: pointAround(center_x),
      y: pointAround(center_y),
      cloudInfo: info,
      style: nodeStyle(node, info?.nodeStyle),
      children_ids: new Set(),
    });
  }
};

// set CLOUD_STYLES = [] to disable cloud colors
const CLOUD_STYLES = [PALETTE.GOOGLE_BLUE, PALETTE.AWS_YELLOW];
const cloudInfo = () => {
  const color = CLOUD_STYLES.shift();
  CLOUD_STYLES.push(color);
  return {
    nodeStyle: {
      fill: color || COLORS.NODE,
    },
    edgeStyle: {
      stroke: COLORS.EDGE,
    },
  };
};

export const updateNode = (graph, item, delta) => {
  if (itemIsExpanding(item)) {
    finishExpandingNode(graph, item);
  }

  if (itemExpandsAsCombo(item)) {
    return updateComboNode(graph, item, delta);
  }

  return updateSimpleNode(graph, item, delta);
};

export const updateSimpleNode = (graph, item, delta) => {
  if (delta.remove) {
    removeNodesSimple(graph, item, delta.remove);
  }

  if (delta.add) {
    addNodesSimple(graph, item, delta.add);
  }
};

export const updateComboNode = (graph, item, delta) => {
  if (delta.remove) {
    removeNodesCombo(graph, item, delta.remove);
  }

  if (delta.add) {
    addNodesCombo(graph, item, delta.add);
  }
};

const removeNodesSimple = (graph, item, nodes) => {
  const model = item.get("model");
  const node_id = model.id;
  const children_ids = model.children_ids;

  for (const child_node_id of nodes) {
    const child = graph.findById(child_node_id);
    if (!child || !children_ids.has(child_node_id)) {
      console.error("trying to remove an unknown child", child_node_id);
      continue;
    }
    children_ids.delete(child_node_id);

    if (itemIsExpanded(child)) {
      collapseNode(graph, child);
    }
    removeNodeItem(graph, child);
  }
};

const addNodesSimple = (graph, item, nodes) => {
  const model = item.get("model");
  const node_id = model.id;
  const children_ids = model.children_ids;
  const cloudInfo = model.cloudInfo;

  for (const node of nodes) {
    const item = graph.findById(node.id);
    if (item !== undefined) {
      console.error(
        `trying to add node that is already in the graph (parent=${node_id})`,
        node
      );
      continue;
    }

    const node_item = graph.addItem("node", {
      ...node,
      x: pointAround(model.x),
      y: pointAround(model.y),
      parent_id: node_id,
      cloudInfo,
      style: { ...nodeStyle(node, cloudInfo?.nodeStyle) },
      children_ids: new Set(),
    });
    graph.addItem("edge", {
      ...pseudoEdge(node_id, node.id),
      style: { ...model.cloudInfo?.edgeStyle },
    });
    children_ids.add(node.id);
    node_item.refresh();
  }
};

const addNodesCombo = (graph, item, nodes) => {
  const model = item.get("model");
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;

  const combo = graph.findById(combo_id);
  const combo_model = combo.get("model");
  const children_ids = combo_model.children_ids;

  const center_id = combo_model.center_ids[0];
  const center_model = graph.findById(center_id).get("model");

  const n_nodes = children_ids.size + nodes.length;

  const cloudInfo = model.cloudInfo;
  for (const node of nodes) {
    graph.addItem("node", {
      ...node,
      style: {
        ...nodeStyle(node, cloudInfo?.nodeStyle),
      },
      cloudInfo,
      parent_id: node_id,
      comboId: combo_id,
      children_ids: new Set([]),
      x: n_nodes > 1 ? pointAround(center_model.x) : center_model.x,
      y: n_nodes > 1 ? pointAround(center_model.y) : center_model.y,
    });

    graph.addItem("edge", {
      ...pseudoEdge(center_id, node.id),
      combo_pseudo_inner: true,
      style: { lineWidth: 0, endArrow: false },
    });
    children_ids.add(node.id);
  }
};

const removeNodesCombo = (graph, item, nodes) => {
  const model = item.get("model");
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;
  const combo_model = graph.findById(combo_id).get("model");
  const combo_children_ids = combo_model.children_ids;

  for (const node_id of nodes) {
    if (!combo_children_ids.has(node_id)) {
      console.error(
        "trying to remove unknown child from combo",
        combo_id,
        node_id
      );
      continue;
    }
    combo_children_ids.delete(node_id);

    const item = graph.findById(node_id);
    if (itemIsExpanded(item)) {
      collapseNode(graph, item);
    }
    removeNodeItem(graph, item);
  }
};

export const updateEdges = (graph, delta) => {
  const removeEdge = (item) => {
    const model = item.get("model");
    if (model.connection === true) {
      graph.removeItem(model.id);
    }
  };

  if (delta.reset) {
    for (const edge of graph.getEdges()) {
      removeEdge(edge);
    }
  }

  if (delta.add) {
    for (const edge of delta.add) {
      const source = graph.findById(edge.source)?.get("model");
      if (source === undefined) {
        console.error("edge source does not exist", edge);
        continue;
      }
      const target = graph.findById(edge.target)?.get("model");
      if (target === undefined) {
        console.error("edge target does not exist", edge);
        continue;
      }

      graph.addItem("edge", {
        ...edge,
        style: source.cloudInfo?.edgeStyle,
        connection: true,
      });
    }
  }

  if (delta.remove) {
    for (const edge of delta.remove) {
      const item = graph.findById(edge.id);
      if (item === undefined) {
        console.warn("trying to remove edge that doesn't exist", edge.id);
        continue;
      }

      removeEdge(item);
    }
  }
};

const nodeStyle = (node, override) => {
  let style = {};
  const fill = {
    cloud: COLORS.CLOUD_PROVIDER,
    region: COLORS.REGION,
    host: COLORS.HOST,
    pod: COLORS.POD,
    container: COLORS.CONTAINER,
    process: COLORS.PROCESS,
  };
  style.fill = fill[node.node_type] || COLORS.NODE;

  style = { ...style, ...override };
  if (node.img !== undefined) {
    delete style.fill;
  } else if (node.node_type === "process") {
    style.fill = COLORS.PROCESS;
  }

  return style;
};

export class GraphUpdateManager {
  constructor(graph, layoutManager) {
    this.graph = graph;
    this.layoutManager = layoutManager;

    this.updates = [];
    this.layouts = [];

    this.paused = false;
  }

  resume() {
    this.paused = false;
    this.maybeProcess();
  }

  pause() {
    this.paused = true;
  }

  maybeProcess() {
    if (!this.paused) {
      this.processUpdates();
      this.processLayouts();
    }
  }

  updateRootNodes(delta) {
    this.updates.push({ root: { delta } });
    this.maybeProcess();
  }

  updateNode(node_id, delta) {
    this.updates.push({ node: { node_id, delta } });
    this.maybeProcess();
  }

  updateEdges(delta) {
    this.updates.push({ edges: { delta } });
    this.maybeProcess();
  }

  processUpdates() {
    for (const up of this.updates) {
      if (up.root) {
        try {
          this.processRootUpdate(up.root.delta);
        } catch (e) {
        }
      } else if (up.node) {
        const { node_id, delta } = up.node;
        try {
          this.processNodeUpdate(node_id, delta);
        } catch (e) {
          console.error("node update failed", node_id, e);
        }
      } else if (up.edges) {
        this.processEdgesUpdate(up.edges.delta);
      }
    }
    this.updates = [];
  }

  queueLayout(node_id, options) {
    this.layouts.push({ node_id, options });
  }

  processRootUpdate(delta) {
    updateRootNodes(this.graph, delta);
    this.queueLayout("root");
  }

  processNodeUpdate(node_id, delta) {
    const item = this.graph.findById(node_id);
    if (item === undefined) {
      console.error(
        "received update for a node that doesn't exist",
        node_id,
        delta
      );
      return;
    }

    if (!itemIsExpanded(item)) {
      // this can happen if we get an update before the backend has received
      // our message where we told it the node was collapsed
      console.warn(
        "ignoring node update as the node is not expanded",
        node_id,
        delta
      );
      return;
    }

    const expanding = itemIsExpanding(item);

    updateNode(this.graph, item, delta);

    const size = delta.add.length + delta.remove.length;
    if (size > 0) {
      this.queueLayout(node_id, {
        expanding,
        refreshOnTick: expanding || size > 30,
      });
    }
  }

  processEdgesUpdate(delta) {
    updateEdges(this.graph, delta);
  }

  processLayouts() {
    for (const { node_id, options } of this.layouts) {
      this.layoutManager.layout(node_id, options);
    }
    this.layouts = [];
  }
}

const isEmptyCombo = (graph, item) => {
  if (!itemExpandsAsCombo(item)) {
    return false;
  }

  const node_id = item.get("model").id;

  const combo_id = `${node_id}-combo`;
  const combo = graph.findById(combo_id);
  const combo_model = combo.get("model");

  return combo_model.children_ids.size == 0;
};
