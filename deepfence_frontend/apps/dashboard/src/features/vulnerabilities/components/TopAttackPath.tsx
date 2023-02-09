import G6 from '@antv/g6';
import { isNil } from 'lodash-es';
import { useEffect, useRef, useState } from 'react';
import { Radio } from 'ui-components';
// import { AutoSizer } from 'react-virtualized';

G6.registerEdge(
  'circles-running',
  {
    afterDraw(_, group) {
      const circleCount = 4;
      const shape = group.get('children')[0];

      const _loop = function _loop(i) {
        const circle = group.addShape('circle', {
          attrs: {
            x: 0,
            y: 0,
            r: 0.6,
            opacity: 0.8,
            fill: '#db2547',
          },
          name: 'circle-shape',
        });
        circle.animate(
          (ratio) => {
            ratio += i / circleCount;
            if (ratio > 1) {
              ratio %= 1;
            }
            const tmpPoint = shape.getPoint(ratio);

            return {
              x: tmpPoint.x,
              y: tmpPoint.y,
              fillOpacity: 0.8,
            };
          },
          {
            repeat: true,
            duration: 10 * 1000,
            easing: 'easeLinear',
          },
        );
      };

      for (let i = 0; i < circleCount; i++) {
        _loop(i);
      }
    },
  },
  'cubic-vertical',
);

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
export const formatApiDataForDagreGraph = (apiResponse, highlightTarget) => {
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
        if (highlightTarget && highlightTarget === attackNode) {
          nodeProps = {
            ...rest,
            style: { fill: '#db2547' },
          };
        } else if (!highlightTarget && index === attackPath.length - 1) {
          nodeProps = {
            ...rest,
            style: { fill: '#db2547' },
          };
        }
        if (nodesMap.has(attackNode)) {
          nodesMap.set(attackNode, {
            ...nodesMap.get(attackNode),
            ...nodeProps,
          });
        } else {
          const truncatedLabel = fitLabel(attackNode);
          nodesMap.set(attackNode, {
            id: attackNode,
            label: truncatedLabel,
            truncatedLabel,
            originalLabel: attackNode,
            ...nodeProps,
          });
        }

        if (index === 0) return;

        const prevNode = attackPath[index - 1];
        const lastNode = attackPath[attackPath.length - 1];
        const edgeKey = `${prevNode}<-->${attackNode}`;

        const edgesProps = {};
        if (
          (highlightTarget &&
            highlightTarget === lastNode &&
            rest.cve_attack_vector === 'network') ||
          (!highlightTarget && rest.cve_attack_vector === 'network')
        ) {
          edgesProps.type = 'circles-running';
          edgesProps.style = {
            stroke: '#db2547',
            opacity: 0.5,
            shadowColor: 'white',
            endArrow: {
              fillOpacity: 0.5,
              strokeOpacity: 0.5,
              opacity: 0.5,
              fill: '#db2547',
              stroke: '#db2547',
            },
          };
        }

        if (edgesMap.has(edgeKey)) {
          edgesMap.set(edgeKey, {
            ...edgesMap.get(edgeKey),
            ...edgesProps,
          });
        } else {
          edgesMap.set(edgeKey, {
            source: prevNode,
            target: attackNode,
            ...edgesProps,
          });
        }
      });
    });
  });

  if (nodesMap.has('The Internet')) {
    nodesMap.set('The Internet', {
      ...nodesMap.get('The Internet'),
      img: '',
      type: 'image',
      size: 10,
    });
  }

  return {
    nodes: [...nodesMap.values()],
    edges: [...edgesMap.values()],
  };
};

function getTooltipContent(node) {
  if (node.cve_attack_vector) {
    const hr = `<div style="border-bottom: 1px solid rgb(166, 166, 166);margin: 8px 0px;"></div>`;

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
  position: 'bottom',
  offset: 5,
  style: {
    stroke: 'black',
    lineWidth: 0,
    fill: 'rgb(192, 192, 192)',
    fontFamily: 'Source Sans Pro',
    fontSize: 6,
    background: {
      fill: '#ffffff',
      fillOpacity: 0.1,
      padding: [1, 1, 1, 1],
      radius: 1,
    },
  },
};
const data = {
  nodes: [
    {
      id: 'The Internet',
      label: 'The Internet',
      truncatedLabel: 'The Internet',
      originalLabel: 'The Internet',
      img: '3e9fbf2410f1aa9cd787.svg',
      type: 'image',
      size: 10,
    },
    {
      id: 'deepfence-poc-agent-2',
      label: 'deepfence-poc-a...',
      truncatedLabel: 'deepfence-poc-a...',
      originalLabel: 'deepfence-poc-agent-2',
      cve_attack_vector: 'network',
      cve_id: ['CVE-2021-44228', 'CVE-2021-45046', 'CVE-2018-20060'],
      ports: [],
      style: {
        fill: '#db2547',
      },
    },
    {
      id: 'deepfence-poc-agent-1',
      label: 'deepfence-poc-a...',
      truncatedLabel: 'deepfence-poc-a...',
      originalLabel: 'deepfence-poc-agent-1',
      cve_attack_vector: 'network',
      cve_id: ['CVE-2016-1585', 'CVE-2022-0318', 'CVE-2021-3918'],
      ports: [],
      style: {
        fill: '#db2547',
      },
    },
  ],
  edges: [
    {
      source: 'The Internet',
      target: 'deepfence-poc-agent-2',
      type: 'circles-running',
      style: {
        stroke: '#db2547',
        opacity: 0.5,
        shadowColor: 'white',
        endArrow: {
          fillOpacity: 0.5,
          strokeOpacity: 0.5,
          opacity: 0.5,
          fill: '#db2547',
          stroke: '#db2547',
        },
      },
    },
    {
      source: 'The Internet',
      target: 'deepfence-poc-agent-1',
      type: 'circles-running',
      style: {
        stroke: '#db2547',
        opacity: 0.5,
        shadowColor: 'white',
        endArrow: {
          fillOpacity: 0.5,
          strokeOpacity: 0.5,
          opacity: 0.5,
          fill: '#db2547',
          stroke: '#db2547',
        },
      },
    },
  ],
};

export const DagreGraph = ({ height, width, style, className }) => {
  const ref = useRef(null);
  const graphRef = useRef(null);

  useEffect(() => {
    if (!graphRef.current) {
      const tooltip = new G6.Tooltip({
        getContent(e) {
          const nodeType = e.item.getType();
          const outDiv = document.createElement('div');
          if (nodeType === 'node') {
            const model = e.item.getModel();
            outDiv.innerHTML = getTooltipContent(model);
            return outDiv;
          }
        },
        itemTypes: ['node'],
        className: 'dagre-node-tooltip',
      });

      const graph = new G6.Graph({
        container: ref.current,
        width: 500,
        height: 500,
        fitView: true,
        layout: {
          type: 'dagre',
          rankdir: 'TB',
          nodesepFunc: () => 0,
          ranksep: 15,
          controlPoints: true,
        },
        modes: {
          default: [],
        },
        plugins: [tooltip],
        defaultNode: {
          anchorPoints: [
            [0.5, 0],
            [0.5, 1],
          ],
          type: 'circle',
          size: 10,
          style: {
            opacity: 0.8,
            fillOpacity: 0.8,
            stroke: 'rgb(192, 192, 192)',
            fill: '#0079f2',
            lineWidth: 0.5,
          },
          labelCfg,
        },
        defaultEdge: {
          type: 'cubic-vertical',
          style: {
            stroke: '#55c1e9',
            lineWidth: 1.2,
            opacity: 0.4,
            endArrow: {
              opacity: 0.9,
              shadowBlur: 0,
              path: G6.Arrow.triangle(2, 3, 0),
              fill: '#55c1e9',
              stroke: '#55c1e9',
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
    <div
      style={{ position: 'relative', textAlign: 'left' }}
      //   className={styles.dagreGraphContainer}
    >
      {/* <AutoSizer> */}
      {/* {({ height: calculatedHeight, width: calculatedWidth }) => {
        if ((isNil(height) || isNil(width)) && graphRef.current) {
          graphRef.current.changeSize(
            width ?? calculatedWidth,
            height ?? calculatedHeight,
          );
          graphRef.current.render();
        }
    }} */}
      <div style={style} className={className} ref={ref} />
      {/* </AutoSizer> */}
    </div>
  );
};

const graphOptions = [
  {
    label: 'Most vulnerable attack paths',
    value: 'most_vulnerable_attack_paths',
    id: 'most_vulnerable_attack_paths',
  },
  {
    label: 'Paths with direct internet exposure',
    value: 'direct_internet_exposure',
    id: 'direct_internet_exposure',
  },
  {
    label: 'Paths with indirect internet exposure',
    value: 'indirect_internet_exposure',
    id: 'indirect_internet_exposure',
  },
];

export const DagreeSelector = () => {
  return (
    <div>
      <Radio name="attackPathSelection" options={graphOptions} />
    </div>
  );
};
