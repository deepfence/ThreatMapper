/* eslint-disable */
import { pointAround } from "./gforce";

/* eslint-disable */
export const expandNode = (graph, item, setTrackedItem) => {
  itemSetExpanding(item);
};

export const finishExpandingNode = (graph, item) => {
  const model = item.get("model");

  if (itemExpandsAsCombo(item)) {
    return finishExpandCombo(graph, item);
  }

  return finishExpandSimpleNode(graph, item);
};

const finishExpandSimpleNode = (graph, item) => {
  itemSetExpanded(item);
  graph.emit("df-track-item", { item });
};

const finishExpandCombo = (graph, item, setTrackedItem) => {
  const model = item.get("model");
  const node_id = model.id;
  const combo_id = `${node_id}-combo`;

  model.children_ids = new Set([combo_id]);
  graph.createCombo(
    {
      id: combo_id,
      parent_id: node_id,
      node_type: "combo",
      center_ids: [],
      children_ids: new Set(),
      x: pointAround(model.x, 50),
      y: pointAround(model.y, 50),
      style: {
        stroke: model.cloudInfo?.edgeStyle?.stroke,
      },
    },
    []
  );

  const combo = graph.findById(combo_id);
  const combo_model = combo.get("model");

  const center_id = `${combo_id}-center`;
  const center = graph.addItem("node", {
    id: center_id,
    node_type: "combo_center",
    parent_id: combo_id,
    comboId: combo_id,
    size: 1,
    style: {
      opacity: 0,
    },
    x: combo_model.x,
    y: combo_model.y,
  });
  combo_model.center_ids.push(center_id);

  // this is the edge between the parent node and the combo. The gForce layout
  // skips this during layout
  graph.addItem("edge", {
    ...pseudoEdge(node_id, combo_id),
    combo_pseudo: true,
    style: { ...model.cloudInfo?.edgeStyle, endArrow: false },
  });

  // this is an extra invisible edge between the parent node and the center of
  // the combo. Since the combo edge above is skipped, we create this one to
  // keep the combo close to its parent. See the edgeStrength code handling
  // combo_pseudo.
  graph.addItem("edge", {
    ...pseudoEdge(node_id, center_id),
    combo_pseudo_center: true,
    style: {
      lineWidth: 0,
      endArrow: false,
    },
  });

  itemSetExpanded(combo);
  itemSetExpanded(item);

  graph.emit("df-track-item", { item: combo });
};

export const collapseNode = (graph, item, onNodeCollapsed, isChild) => {
  if (itemExpandsAsCombo(item)) {
    return collapseCombo(graph, item, onNodeCollapsed, isChild);
  }
  return collapseSimpleNode(graph, item, onNodeCollapsed, isChild);
};

const collapseSimpleNode = (graph, item, onNodeCollapsed, isChild) => {
  const model = item.get("model");
  const node_id = model.id;

  for (const edge of item.getOutEdges()) {
    graph.removeItem(edge.id);
  }

  if (model.children_ids) {
    for (const child_id of model.children_ids) {
      const child = graph.findById(child_id);

      if (itemIsExpanded(child)) {
        collapseNode(graph, child, onNodeCollapsed, true);
      }
      removeNodeItem(graph, child);
    }

    model.children_ids.clear();
  }

  itemUnsetExpanded(item);

  if (onNodeCollapsed) {
    onNodeCollapsed(item, isChild);
  }
};

const collapseCombo = (graph, item, onNodeCollapsed, isChild) => {
  const model = item.get("model");

  if (!itemIsExpanding(item)) {
    const combo_id = model.children_ids.values().next().value;
    const combo = graph.findById(combo_id);
    const combo_model = combo.get("model");
    if (combo_model.children_ids) {
      for (const child_id of combo_model.children_ids) {
        combo_model.children_ids.delete(child_id);
        const child = graph.findById(child_id);
        if (itemIsExpanded(child)) {
          collapseNode(graph, child, onNodeCollapsed, true);
        }
        removeNodeItem(graph, child);
      }
    }
    itemUnsetExpanded(combo);
  }
  itemUnsetExpanded(item);

  collapseSimpleNode(graph, item, onNodeCollapsed, isChild);
};

export const itemExpandsAsCombo = (item) => {
  const model = item.get("model");
  return (
    model.node_type === "kubernetes_cluster" ||
    model.node_type === "host" ||
    model.node_type === "pod" ||
    model.node_type == "container"
  );
};

export const itemExpands = (item) => {
  const model = item.get("model");

  switch (model.node_type) {
    case "cloud":
    case "region":
    case "kubernetes_cluster":
    case "host":
    case "pod":
    case "container":
      return true;
  }

  return false;
};

export const pseudoEdge = (source, target) => ({
  source,
  target,
  pseudo: true,
});

export const removeNodeItem = (graph, item) => {
  for (const edge of item.getEdges()) {
    const edge_model = edge.get("model");
    if (edge_model.connection) {
      graph.removeItem(edge_model.id);
    }
  }

  const model = item.get("model");
  graph.removeItem(item);
};

const ExpandState = {
  EXPANDING: "EXPANDING",
  EXPANDED: "EXPANDED",
};

const itemSetExpanding = (item) => {
  const model = item.get("model");
  model.expand_state = ExpandState.EXPANDING;
};

const itemSetExpanded = (item) => {
  const model = item.get("model");
  model.expand_state = ExpandState.EXPANDED;
};

const itemUnsetExpanded = (item) => {
  const model = item.get("model");
  delete model.expand_state;
};

export const itemIsExpanding = (item) => {
  return item.get("model").expand_state === ExpandState.EXPANDING;
};

export const itemIsExpanded = (item) => {
  return item.get("model").expand_state !== undefined;
};
