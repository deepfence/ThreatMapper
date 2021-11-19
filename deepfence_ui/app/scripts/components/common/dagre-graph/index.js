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
            style: { fill: '#ff4570' }
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
          edgesProps.style = { stroke: '#ff4570' };
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
    const hr = `<div style="border-bottom: 1px solid white;margin: 8px 0px;"></div>`

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
          <strong>CVEs</strong>
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
      graphRef.current.data(data);
      graphRef.current.render();
    }
  }, [data]);

  return (
    <div style={{ position: 'relative', textAlign: 'left' }} className={styles.dagreGraphContainer}>
      <div style={style} className={className} ref={ref} />
    </div>
  );

};
