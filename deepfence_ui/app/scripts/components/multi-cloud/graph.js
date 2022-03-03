/* eslint-disable */
import G6 from "@antv/g6";
import { useCallback, useEffect, useRef } from "react";
import { COLORS, PALETTE } from "./theme";

export const useGraph = (el, data) => {
  const graphRef = useRef(null);

  useEffect(() => {
    if (el === null) {
      return;
    }

    const width = el.offsetWidth;
    const height = el.offsetHeight;


    const toolbar = new G6.ToolBar({
      className: 'g6-df-toolbar',
      getContent: () => {
        const outDiv = document.createElement('div');
        outDiv.innerHTML = `<ul>
            <li code="zoom-out" title="Zoom Out"><i class="fa fa-lg fa-search-plus"></i></li>
            <li code="zoom-in" title="Zoom In"><i class="fa fa-lg fa-search-minus"></i></li>
            <li code="actual-size" title="Re-center"><i class="fa fa-lg fa-compress"></i></li>
          </ul>`
        return outDiv
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
            y: height / 2
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
            y: height / 2
          });
        } else if (code === 'actual-size') {
          graph.fitView();
        }
      }
    });

    const graph = new G6.Graph({
      plugins: [toolbar],

      animate: false,

      container: el,
      width,
      height,

      fitCenter: true,
      groupByTypes: false,

      defaultNode: {
        style: {
          // DO NOT set .fill here, as it breaks image nodes.
          stroke: COLORS.NODE_OUTLINE,
          lineWidth: 2,
        },
        labelCfg: {
          ...LABEL_CFG,
        },
      },

      defaultEdge: {
        style: {
          stroke: COLORS.EDGE,
          lineWidth: 1,
          opacity: 0.5,
          endArrow: {
            path: G6.Arrow.triangle(6, 9, 0),
            fill: "#13F4EF",
            stroke: "#13F4EF",
          },
        },
      },

      defaultCombo: {
        padding: 0,
        style: {
          fill: "#111111",
          fillOpacity: 0.6,
          stroke: COLORS.EDGE,
          strokeOpacity: 0.5,
        },
      },

      // state style
      nodeStateStyles: {
        active: {
          fill: "#fefefe",
        },
        inactive: {
          fill: "red",
        },
      },
      comboStateStyles: {
        active: {},
        inactive: {},
      },

      edgeStateStyles: {
        active: {
          stroke: "#fefefe",
          endArrow: {
            path: G6.Arrow.triangle(7, 10, 15),
            fill: "#E6E6FA",
            stroke: "#E6E6FA",
            d: -20,
          },
        },
        inactive: {
          endArrow: {
            path: G6.Arrow.triangle(7, 10, 15),
            fill: "red",
            opacity: 0,
            stroke: "#E6E6FA",
            d: -20,
          },
        },
      },

      modes: {
        default: [
          graphModeEnableOptimize("drag-canvas"),
          graphModeEnableOptimize("zoom-canvas"),
          {
            type: "drag-node",
            onlyChangeComboSize: true,
          },
          "drag-combo",
          // {
          //   type: "activate-relations",
          //   trigger: "mouseenter",
          // },
        ],
      },
    });
    graph.updateLayout({});

    graph.data(data);
    graph.render();

    graphRef.current = graph;
  }, [el]);

  return { graph: graphRef.current };
};

const LABEL_CFG = {
  position: "bottom",
  offset: 12,
  style: {
    stroke: "black",
    lineWidth: 0,
    fill: COLORS.LABEL,
    fontFamily: "Source Sans Pro",
    fontSize: 20,
  },
};

const graphModeEnableOptimize = (mode) => {
  return {
    type: mode,
    enableOptimize: true,
    sensitivity: 0.7,
  };
};

export const nodeToFront = (node) => {
  node.toFront();
  for (const edge of node.getEdges()) {
    edge.toFront();
  }

  if (node.getType() !== "combo") {
    return;
  }

  const children = node.getChildren();
  for (const node of children.nodes) {
    nodeToFront(node);
  }
};
