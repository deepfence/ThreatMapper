import React, { useState, useEffect, useRef } from 'react';
import G6 from "@antv/g6";
import styles from './index.module.scss';


function fitLabel(label) {
  if (label.length >= 15) {
    return `${label.substring(0, 15)}...`;
  }
  return label;
}

/* Api response could be containing multiple different end nodes
 * depending upon the api call made.
 * one example where there is a single start and end node is below
 *
 * [
 *  ['in-theinternet', 'ramanan-oss-console'],
 *  ['in-theinternet', "ramanan-agent", 'ramanan-oss-console'],
 * ]
 *
 * another example is
 *
 * [
 *  ['in-theinternet', 'ramanan-oss-console'],
 *  ['in-theinternet', "ramanan-agent", 'ramanan-oss-console'],
 *  ['in-theinternet', 'ramanan-agent-2'],
 *  ['in-theinternet', "ramanan-agent", 'ramanan-oss-agent-2'],
 * ]
 *
 * we also want to highlight first edge since that would be the shortest
 */
export const formatApiDataForDagreGraph = (apiResponse) => {

  const pathsBetweenSameNodes = new Map();
  apiResponse.forEach((path) => {
    const len = path.length;
    const key = `${path[0]}<->${path[len - 1]}`;
    const newPath = [];
    path.forEach((node) => {
      newPath.push({
        id: node,
        label: node
      });
    });
    if (pathsBetweenSameNodes.has(key)) {
      pathsBetweenSameNodes.get(key).push(newPath);
    } else {
      pathsBetweenSameNodes.set(key, [newPath]);
    }
  });

  const edgesData = new Map();
  const nodesData = new Map();

  [...pathsBetweenSameNodes.values()].forEach((paths) => {
    paths.forEach((path, pathIndex) => {
      const isShortest = pathIndex === 0;
      path.forEach((node, nodeIndex) => {
        if (!nodesData.has(node.id)) {
          const truncLabel = fitLabel(node.label)
          nodesData.set(node.id, {
            id: node.id,
            label: truncLabel,
            oriLabel: node.label,
            truncLabel,
            style: nodeIndex === path.length - 1 ? {
              fill: '#ff4570'
            } : undefined
          });
        }
        if (nodeIndex === 0) return;
        const edgeKey = `${path[nodeIndex - 1].id}<->${node.id}`;
        const existingEdge = edgesData.get(edgeKey);
        if (!existingEdge) {
          edgesData.set(edgeKey, {
            source: path[nodeIndex - 1].id,
            target: node.id,
            style: isShortest ? {
              stroke: '#ff4570'
            } : undefined,
          });
        } else if (existingEdge && isShortest) {
          edgesData.set(edgeKey, {
            ...existingEdge,
            style: {
              stroke: '#ff4570'
            }
          });
        }
      });
    });
  });
  return {
    nodes: [...nodesData.values()],
    edges: [...edgesData.values()]
  };
};

const labelCfg = {
  position: "bottom",
  offset: 5,
  style: {
    stroke: "black",
    lineWidth: 0,
    fill: 'white',
    fontFamily: "Source Sans Pro",
    fontSize: 8,
  },
};

export const DagreGraph = ({ data, height, width, style, className }) => {
  const ref = useRef(null);
  const graphRef = useRef(null)

  useEffect(() => {
    if (!graphRef.current) {

      const tooltip = new G6.Tooltip({
        getContent(e) {
          const nodeType = e.item.getType();
          const outDiv = document.createElement('div');
          if (nodeType === 'node') {
            outDiv.innerHTML = e.item.getModel().oriLabel;
            return outDiv
          }
        },
        itemTypes: ['node'],
        className: 'dagre-node-tooltip'
      });

      const graph = new G6.Graph({
        container: ref.current,
        width: width ?? 400,
        height: height ?? 400,
        fitView: true,
        layout: {
          type: "dagre",
          rankdir: "LR",
          controlPoints: true,
          nodesepFunc: () => 1,
          ranksepFunc: () => 1,
        },
        modes: {
          default: [],
        },
        plugins: [tooltip],
        defaultNode: {
          type: 'circle',
          size: 15,
          style: {
            stroke: 'white',
            fill: '#0079f2',
            lineWidth: 1,
          },
          labelCfg,
        },
        defaultEdge: {
          type: 'line',
          style: {
            stroke: '#55c1e9',
            lineWidth: 1,
            opacity: 0.5,
            endArrow: {
              path: G6.Arrow.triangle(3, 5, 0),
              fill: "#E6E6FA",
              stroke: "#E6E6FA",
            },
          },
        },
      });

      graph.read(data);
      graphRef.current = graph;
    }
  }, []);

  const [initialData] = useState(data);

  useEffect(() => {
    if (graphRef.current && initialData !== data) {
      graphRef.current.changeData(data);
    }
  }, [data]);

  return (
    <div style={{ position: 'relative' }} className={styles.dagreGraphContainer}>
      <div style={style} className={className} ref={ref} />
    </div>
  );

};
