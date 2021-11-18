import React, { useState, useEffect, useRef } from 'react';
import { DagreGraph as AntVDagreGraph } from '@ant-design/charts';
import G6 from "@antv/g6";


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
 * in this last case we need to draw multiple graphs
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
          nodesData.set(node.id, {
            id: node.id,
            label: node.label,
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


const layoutCfg = {
  type: "dagre",
  rankdir: "LR",
  controlPoints: false,
  nodesepFunc: () => 1,
  ranksepFunc: () => 10
};

const nodeStyle = {
  stroke: 'white',
  fill: '#0079f2',
  lineWidth: 1,
};

const edgeStyle = {
  stroke: '#55c1e9',
  lineWidth: 1,
  opacity: 0.5,
  endArrow: {
    path: G6.Arrow.triangle(3, 5, 0),
    fill: "#E6E6FA",
    stroke: "#E6E6FA",
  },
  radius: 15
};

const nodeLabelCfg = {
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

const nodeAnchorPoints = [
  [0, 0.5],
  [1, 0.5],
];

export const DagreGraph = ({ data, height, width, style, className }) => {
  const ref = useRef();

  const [initialData] = useState(data);

  useEffect(() => {
    if (ref.current && initialData !== data) {
      ref.current.read(data);
    }
  }, [data]);

  return (
    <AntVDagreGraph
      autoFit
      graphRef={ref}
      data={initialData}
      height={height}
      width={width}
      style={style}
      className={className}
      nodeType="circle"
      nodeStyle={nodeStyle}
      nodeStateStyles={{}}
      edgeType="polyline"
      edgeStyle={edgeStyle}
      edgeStateStyles={{}}
      nodeAnchorPoints={nodeAnchorPoints}
      nodeLabelCfg={nodeLabelCfg}
      layout={layoutCfg}
      nodeSize={15}
      behaviors={[]}
    />
  );
}
