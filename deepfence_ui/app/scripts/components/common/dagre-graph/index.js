/* eslint-disable arrow-body-style */
import React, { useState, useEffect, useRef } from 'react';
import G6 from "@antv/g6";
import { AutoSizer } from 'react-virtualized';
import { isNil } from 'lodash';
import styles from './index.module.scss';


function fitLabel(label) {
  if (label.length >= 15) {
    return `${label.substring(0, 15)}...`;
  }
  return label;
}

/* Api response could be containing multiple different end nodes
 * depending upon the api call made.
 * we also want to highlight first edge since that would be the shortest
 */
export const formatApiDataForDagreGraph = (apiResponse) => {
  if (!Array.isArray(apiResponse)) {
    apiResponse = [apiResponse];
  }
  const nodesMap = new Map();
  const edgesMap = new Map();
  apiResponse.forEach((attackPathsInfo) => {
    const { attack_path: attackPathsBetweenNodes, ...rest } = attackPathsInfo;
    if (!attackPathsBetweenNodes.length) return;
    attackPathsBetweenNodes.forEach((attackPath) => {
      attackPath.forEach((attackNode, index) => {
        let nodeProps = {};
        if (index === attackPath.length - 1) {
          nodeProps = {
            ...rest,
            style: { fill: '#db2547' }
          }
        }
        if (nodesMap.has(attackNode)) {
          nodesMap.set(attackNode, {
            ...nodesMap.get(attackNode),
            ...nodeProps
          })
        } else {
          const truncatedLabel = fitLabel(attackNode);
          nodesMap.set(attackNode, {
            id: attackNode,
            label: truncatedLabel,
            truncatedLabel,
            originalLabel: attackNode,
            ...nodeProps
          });
        }

        if (index === 0) return;

        const lastNode = attackPath[index - 1];
        const edgeKey = `${lastNode}<-->${attackNode}`;

        const edgesProps = {};
        if (rest.cve_attack_vector === 'network') {
          edgesProps.style = {
            stroke: '#db2547',
            endArrow: {
              fill: "#db2547",
              stroke: "#db2547",
            },
          };
        }

        if (edgesMap.has(edgeKey)) {
          edgesMap.set(edgeKey, {
            ...edgesMap.get(edgeKey),
            ...edgesProps
          });
        } else {
          edgesMap.set(edgeKey, {
            source: lastNode,
            target: attackNode,
            ...edgesProps
          });
        }
      });
    });
  });
  return {
    nodes: [...nodesMap.values()],
    edges: [...edgesMap.values()]
  }
};

function getTooltipContent(node) {
  if (node.cve_attack_vector) {
    const hr = `<div style="border-bottom: 1px solid rgb(166, 166, 166);margin: 8px 0px;"></div>`

    return `
      <div style="max-width: 250px">
        <strong style="overflow-wrap: break-word;">${node.originalLabel}</strong>
        ${hr}
        <div>
          <strong>Attack Vector</strong>
          <div>
            ${node.cve_attack_vector}
          </div>
        </div>
        ${hr}
        <div>
          <strong>Top CVEs</strong>
          <div>
          ${node.cve_id.length ? node.cve_id.join('<br />') : 'None'}
          </div>
        </div>
        ${hr}
        <div>
          <strong>PORTS</strong>
          <div>
            ${node.ports?.length ? node.ports.join(', ') : 'None'}
          </div>
        </div>
      </div>
    `;
  }

  return `<strong>${node.originalLabel}</strong>`;
}

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
            const model = e.item.getModel();
            outDiv.innerHTML = getTooltipContent(model);
            return outDiv
          }
        },
        itemTypes: ['node'],
        className: 'dagre-node-tooltip',
      });

      const graph = new G6.Graph({
        container: ref.current,
        width: width ?? 0,
        height: height ?? 0,
        fitView: true,
        layout: {
          type: 'dagre',
          rankdir: 'LR',
          nodesepFunc: () => 0,
          ranksepFunc: () => 0,
          controlPoints: true,
        },
        modes: {
          default: [],
        },
        plugins: [tooltip],
        defaultNode: {
          type: 'circle',
          size: 15,
          style: {
            opacity: 0.8,
            stroke: 'white',
            fill: '#0079f2',
            lineWidth: 0.5,
          },
          labelCfg,
        },
        defaultEdge: {
          type: 'spline',
          style: {
            stroke: '#55c1e9',
            lineWidth: 1,
            opacity: 0.5,
            endArrow: {
              opacity: 0.5,
              path: G6.Arrow.triangle(3, 5, 0),
              fill: "#55c1e9",
              stroke: "#55c1e9",
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
      graphRef.current.data(data);
      graphRef.current.render();
    }
  }, [data]);


  return (
    <div style={{ position: 'relative', textAlign: 'left' }} className={styles.dagreGraphContainer}>
      <AutoSizer>
        {({ height: calculatedHeight, width: calculatedWidth }) => {
          if ((isNil(height) || isNil(width)) && graphRef.current) {
            graphRef.current.changeSize(width ?? calculatedWidth, height ?? calculatedHeight);
            graphRef.current.render();
          }
          return (<div style={style} className={className} ref={ref} />);
        }}
      </AutoSizer>
    </div>
  );

};
