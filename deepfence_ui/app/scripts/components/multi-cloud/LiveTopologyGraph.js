/* eslint-disable */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { TopologyGraph } from "./TopologyGraph";
import { getNodeIcon } from "./node-icons";
import { TopologyClient, TopologyNodeType } from "./topology-client-2";
import { useSocketDisconnectHandler } from './hooks';

export const LiveTopologyGraph = forwardRef(
  (
    {
      apiKey,
      apiURL,
      refreshInterval,
      onNodeClicked,
      onFilterAdded,
      onFilterRemoved,
    },
    ref
  ) => {
    const graph = useRef(null);
    const nodes_client = useRef(null);
    const triggerSocketDisconnectHandler = useSocketDisconnectHandler();

    useEffect(() => {
      if (!ref) {
        return;
      }

      if (typeof ref === "function") {
        ref(graph.current);
      } else {
        ref.current = graph.current;
      }
    }, [graph]);

    useEffect(() => {
      if (graph.current == null) {
        return;
      }

      nodes_client.current = new TopologyClient(
        apiURL,
        apiKey,
        refreshInterval,
        (data) => {
          const edges_delta = topologyEdgesToDelta(data.edges);
          const nodes_delta = topologyNodesToDelta(graph.current, data.nodes);

          if (edges_delta != null || nodes_delta != null) {
            //
          }

          if (edges_delta !== null) {
            graph.current.updateEdges({
              remove: edges_delta.remove,
              reset: data.reset,
            });
          }

          if (nodes_delta !== null) {
            let reset = data.reset;
            for (const parent_id of Object.keys(nodes_delta)) {
              if (parent_id === "root") {
                graph.current.updateRootNodes({
                  ...nodes_delta[parent_id],
                  reset,
                });
              } else {
                graph.current.updateNode(parent_id, {
                  ...nodes_delta[parent_id],
                  reset,
                });
              }
              reset = false;
            }
          }

          if (edges_delta !== null) {
            graph.current.updateEdges({ add: edges_delta.add });
          }
        },
        () => {
          triggerSocketDisconnectHandler();
        }
      );

      nodes_client.current.open();

      return () => {
        nodes_client.current.close();
      };
    }, [graph]);

    const onNodeExpanded = useCallback(
      (item) => {
        if (graph.current === null || nodes_client.current === null) {
          return;
        }

        const node = item.get("model");

        const topo_node_type = modelNodeTypeToTopologyType(node.node_type);
        if (!topo_node_type) {
          return;
        }

        let parents = graph.current
          .getParents(node.id)
          .map((id) => graph.current.findById(id).get("model"));
        parents = modelParentsToTopologyParents(parents);

        const kubernetes =
          parents[TopologyNodeType.KUBERNETES_CLUSTER] !== undefined;

        const topo_children_types = modelNodeTypeToTopologyChildrenTypes(
          node.node_type,
          { kubernetes }
        );
        if (topo_children_types === undefined) {
          return;
        }

        nodes_client.current.expandNode(
          node.id,
          topo_node_type,
          parents,
          topo_children_types
        );

        if (onFilterAdded) {
          const filter = filterList(graph.current, node);
          onFilterAdded(filter);
        }
      },
      [graph, nodes_client]
    );

    const onNodeCollapsed = useCallback(
      (item, isChild) => {
        if (graph.current === null) {
          return;
        }
        const node = item.get("model");

        if (onFilterRemoved) {
          const filter = filterList(graph.current, node);
          onFilterRemoved(filter);
        }

        const topo_node_type = modelNodeTypeToTopologyType(node.node_type);

        let parents = graph.current
          .getParents(node.id)
          .map((id) => graph.current.findById(id).get("model"));
        parents = modelParentsToTopologyParents(parents);

        nodes_client.current.collapseNode(node.id, topo_node_type, parents);
      },
      [graph]
    );

    const onHover = useCallback((item, hover) => {
      hoverNode(item, hover);
    }, []);

    return (
      <TopologyGraph
        ref={graph}
        onNodeExpanded={onNodeExpanded}
        onNodeCollapsed={onNodeCollapsed}
        onNodeClicked={onNodeClicked}
        onHover={onHover}
      />
    );
  }
);

export const modelNodeTypeToTopologyType = (type) => {
  const types = {
    cloud: TopologyNodeType.CLOUD_PROVIDER,
    region: TopologyNodeType.REGION,
    kubernetes_cluster: TopologyNodeType.KUBERNETES_CLUSTER,
    host: TopologyNodeType.HOST,
    pod: TopologyNodeType.POD,
    container: TopologyNodeType.CONTAINER,
    process: TopologyNodeType.PROCESS,
  };

  const ret = types[type];
  if (ret === undefined) {
    console.error("no topology type for model node type", type);
    return null;
  }

  return ret;
};

export const modelNodeTypeToTopologyChildrenTypes = (type, opts) => {
  const types = {
    cloud: [TopologyNodeType.REGION, TopologyNodeType.KUBERNETES_CLUSTER],
    region: [TopologyNodeType.HOST],
    kubernetes_cluster: [TopologyNodeType.HOST],
    host: opts?.kubernetes
      ? [TopologyNodeType.POD]
      : [TopologyNodeType.PROCESS, TopologyNodeType.CONTAINER],
    pod: [TopologyNodeType.CONTAINER],
    container: [TopologyNodeType.PROCESS],
  };

  return types[type];
};

export const topologyNodesToDelta = (graph, data) => {
  const len = (k) => (!data[k] ? 0 : data[k].length);
  if (len("add") === 0 && len("update") === 0 && len("remove") === 0) {
    return null;
  }

  const delta = {};
  const node_delta = (node_id) => {
    if (delta[node_id] === undefined) {
      delta[node_id] = { add: [], update: [], remove: [] };
    }
    return delta[node_id];
  };

  if (data.add) {
    for (const topo_node of data.add) {
      const node = topologyNodeToModel(topo_node);
      if (node) {
        let parent_id = topo_node.immediate_parent_id;
        if (parent_id === "") {
          parent_id = "root";
        }

        // add pseudo nodes only at the root
        if (!node.pseudo || parent_id == "root")
          node_delta(parent_id).add.push(node);
      }
    }
  }

  if (data.remove) {
    for (const topo_node_id of data.remove) {
      const node = graph.findById(topo_node_id);
      if (node === undefined) {
        console.warn(
          "trying to remove a node that doesn't exist. Was it collapsed?",
          topo_node_id
        );
        continue;
      }

      const model = node.get("model");
      const parent_id = model.parent_id || "root";
      node_delta(parent_id).remove.push(topo_node_id);
    }
  }

  return delta;
};

const topologyNodeToModel = (topo_node) => {
  if (topo_node.id === undefined) {
    console.error("node doesn't have an id", topo_node);
    return;
  }

  const model = { ...topo_node };
  model.label_full = model.label;

  model.id = topo_node.id;
  // this has got to be the worst API I've ever seen!?
  let [id, type] = topo_node.id.split(";", 2);
  model.node_type = funnyTopologyTypeToModelType(type);
  if (model.node_type == undefined) {
    if (type) {
      model.node_type = "process";
      if (model.label === undefined) {
        console.warn("process doesn't have a label", model);
        return;
      }
      if (model.label[0] == "[" && model.label[model.label.length - 1] == "]") {
        return;
      }
      model.label_short = ellipsize(basename(model.label), 20);
      model.label = model.label_short;
    } else {
      model.id = topo_node.id;
      model.node_type = "unknown";
    }
  }

  switch (model.node_type) {
    case "pod":
    case "container":
    case "process":
      model.labelCfg = { style: { fontSize: 14 } };
      break;
  }

  model.size = nodeSize(model.node_type);

  if (model.shape !== "circle") {
    model.img = getNodeIcon(model.shape);
    if (model.img !== undefined) {
      model.type = "image";
    }
  }

  return model;
};

export const funnyTopologyTypeToModelType = (type) => {
  const vals = {
    "<cloud_provider>": "cloud",
    "<cloud_region>": "region",
    "<kubernetes_cluster>": "kubernetes_cluster",
    "<host>": "host",
    "<pod>": "pod",
    "<container>": "container",
    "<fargate>": "fargate", // FIXME: check the actual value
  };

  return vals[type];
};

const nodeSize = (node_type) => {
  const mul = {
    container: 0.5,
    process: 0.5,
  };

  const size = (mul[node_type] || 1) * 60;
  return size;
};

const filterList = (graph, node) => {
  const elems = graph.getParents(node.id);
  elems.push(node.id);

  return elems.map((node_id) => nodeFilter(graph, node_id));
};

const nodeFilter = (graph, node_id) => {
  const item = graph.findById(node_id);
  const node = item.get("model");
  const topo_node_type = modelNodeTypeToTopologyType(node.node_type);
  const topo_children_types = modelNodeTypeToTopologyChildrenTypes(
    node.node_type
  );

  return {
    id: node.id,
    node_type: node.node_type,
    label: node.label,
    topo_node_type,
    topo_children_types,
  };
};

const basename = (path) => {
  const i = path.lastIndexOf("/");
  if (i >= 0) {
    return path.substr(i + 1);
  }
  return path;
};

const ellipsize = (text, n) => {
  if (text.length <= n) {
    return text;
  }

  return text.substr(0, n - 3) + "...";
};

const hoverNode = (item, hover) => {
  const model = item.get("model");
  if (model.node_type === "process") {
    if (hover) {
      item.update({ label: model.label_full });
      item.toFront();
    } else {
      item.update({ label: model.label_short });
    }
  }
};

const modelParentsToTopologyParents = (nodes) => {
  const ret = {};

  for (const node of nodes) {
    const node_type = modelNodeTypeToTopologyNodeType(node.node_type);
    ret[node_type] = node.id;
  }

  return ret;
};

const modelNodeTypeToTopologyNodeType = (type) => {
  const types = {
    cloud: TopologyNodeType.CLOUD_PROVIDER,
    region: TopologyNodeType.REGION,
    kubernetes_cluster: TopologyNodeType.KUBERNETES_CLUSTER,
    host: TopologyNodeType.HOST,
    pod: TopologyNodeType.POD,
    container: TopologyNodeType.CONTAINER,
    process: TopologyNodeType.PROCESS,
  };

  const ret = types[type];
  if (ret === undefined) {
    console.error("no topology type for model node type", type);
    return null;
  }

  return ret;
};

const topologyEdgesToDelta = (data) => {
  const len = (k) => (!data[k] ? 0 : data[k].length);
  if (len("add") === 0 && len("remove") === 0) {
    return null;
  }

  const delta = { add: [], remove: [] };
  if (data.add) {
    delta.add = filter_map(data.add, topologyEdgeToModel);
  }

  if (data.remove) {
    delta.remove = filter_map(data.remove, topologyEdgeToModel);
  }

  return delta;
};

const topologyEdgeToModel = (edge) => {
  if (edge.source == edge.target) {
    return null;
  }

  return { ...edge, id: `${edge.source}-${edge.target}` };
};

const filter_map = (iter, f) => {
  const ret = [];
  for (const el of iter) {
    const m = f(el);
    if (m) {
      ret.push(m);
    }
  }

  return ret;
};
