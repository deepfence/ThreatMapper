/* eslint-disable */
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useDOMSize, useVisibilityState } from "./hooks";
import {
  collapseNode,
  expandNode,
  itemExpands,
  itemIsExpanded,
} from "./expand-collapse";
import "./TopologyGraph.css";
import { useGraph, nodeToFront } from "./graph";
import { GraphUpdateManager, updateEdges } from "./update";
import { LayoutManager } from "./layout";

export const TopologyGraph = forwardRef(
  ({ data, onNodeExpanded, onNodeCollapsed, onNodeClicked, onHover }, ref) => {
    const [container, setContainer] = useState(null);
    const [width, height] = useDOMSize(container);
    const { graph } = useGraph(container, data || {});
    const visible = useVisibilityState();
    const layoutManagerRef = useRef(null);
    const updateManagerRef = useRef(null);

    const trackedItem = useRef(null);
    const setTrackedItem = (item) => {
      trackedItem.current = item;
    };

    const graphRef = useRef(graph);
    useImperativeHandle(ref, () => ({
      updateRootNodes: (delta) => {
        updateManagerRef.current.updateRootNodes(delta);
      },

      updateNode: (node_id, delta) => {
        updateManagerRef.current.updateNode(node_id, delta);
      },

      updateEdges: (delta) => {
        updateManagerRef.current.updateEdges(delta);
      },

      findById: (node_id) => {
        const graph = graphRef.current;
        return graph.findById(node_id);
      },

      getParents: (node_id) => {
        const graph = graphRef.current;
        const item = graph.findById(node_id);
        return getParents(graph, item);
      },

      expandNode: (node_id) => {
        const graph = graphRef.current;
        const item = graph.findById(node_id);
        if (!itemIsExpanded(item)) {
          expandNode(graph, item);
          if (onNodeExpanded) {
            onNodeExpanded(item);
          }
        }
      },

      collapseNode: (node_id) => {
        const graph = graphRef.current;
        const item = graph.findById(node_id);
        if (itemIsExpanded(item)) {
          collapseNode(graph, item, onNodeCollapsed);
        }
      },
    }));

    useEffect(() => {
      // update the graph size when the container element is resized
      if (graph !== null) {
        // WTF something keeps resizing the container!?
        if (height < 1000) {
          graph.changeSize(width, height);
        }
        return;
      }
    }, [width, height]);

    useEffect(() => {
      if (layoutManagerRef.current) {
        if (visible) {
          layoutManagerRef.current.resume();
        } else {
          layoutManagerRef.current.pause();
        }
      }
    }, [visible]);

    useEffect(() => {
      if (graph === null) {
        return;
      }

      // this is used by the exported imperative API
      graphRef.current = graph;

      layoutManagerRef.current = new LayoutManager(graph, {
        tick: debounce(() => {
          if (trackedItem.current) {
            nodeToFront(trackedItem.current);
            graph.focusItem(trackedItem.current, true);
          }
        }, 500),

        onLayoutStart: () => {
          updateManagerRef.current.pause();
        },

        onLayoutEnd: () => {
          updateManagerRef.current.resume();
        },
      });

      updateManagerRef.current = new GraphUpdateManager(
        graph,
        layoutManagerRef.current
      );

      graph.on("node:mouseenter", (e) => {
        if (onHover) {
          onHover(e.item, true);
        }
      });
      graph.on("node:mouseleave", (e) => {
        if (onHover) {
          onHover(e.item, false);
        }
      });

      graph.on("node:drag", (e) => {
        e.preventDefault();
      });

      graph.on("combo:drag", (e) => {
        e.preventDefault();
      });

      graph.on("combo:dragend", (e) => {
        try {
          const combo = e.item;

          fixCombo(graph, combo);
        } catch (e) {
          console.error("exception handling dragend", e);
        }
      });

      graph.on("combo:click", (e) => {
        graph.focusItem(e.item, true);
      });

      graph.on("node:click", (e) => {
        try {
          const item = e.item;

          if (onNodeClicked) {
            const model = item.get("model");
            onNodeClicked(model);
          }

          if (itemExpands(item)) {
            if (itemIsExpanded(item)) {
              collapseNode(graph, item, onNodeCollapsed);
            } else {
              expandNode(graph, item);
              if (onNodeExpanded) {
                onNodeExpanded(item);
              }
            }
          }
        } catch (e) {
          console.error("exception handling click", e);
        }
      });

      graph.on("dragstart", () => {
        setTrackedItem(null);
      });

      graph.on("df-track-item", (e) => {
        setTrackedItem(e.item);
      });

      graph.on("beforeremoveitem", (e) => {
        const item = e.item;
        if (trackedItem.current?.get("model")?.id === item.id) {
          setTrackedItem(null);
        }
      });
    }, [graph, onNodeExpanded]);

    return <div className="TopologyGraph" ref={setContainer}></div>;
  }
);

const getParents = (graph, item) => {
  let parents = [];

  let parent_id = item.get("model").parent_id;
  while (parent_id) {
    const parent = graph.findById(parent_id).get("model");
    if (parent.node_type !== "combo") {
      parents.unshift(parent_id);
    }
    parent_id = parent.parent_id;
  }

  return parents;
};

const debounce = (cb, ms = 500) => {
  let timer = null;

  return (...args) => {
    let cb_args = args;
    const doCall = () => {
      cb(...cb_args);
      cb_args = null;
    };

    if (timer === null) {
      timer = setTimeout(() => {
        timer = null;

        if (cb_args !== null) {
          doCall();
        }
      }, ms);
    }
  };
};

const fixCombo = (graph, combo) => {
  const model = combo.get("model");
  const bbox = combo.getBBox();
  const { centerX, centerY } = bbox;

  const center_id = model.center_ids[0];
  const center = graph.findById(center_id);
  const center_model = center.get("model");

  center_model.fx = centerX;
  center_model.fy = centerY;
};
