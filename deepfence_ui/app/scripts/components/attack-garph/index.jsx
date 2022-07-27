/* eslint-disable new-cap */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useRef, useEffect, useState } from 'react';
import G6 from '@antv/g6';
import useMeasure from 'react-use/lib/useMeasure';
import { useDispatch, useSelector } from 'react-redux';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import '@reach/dialog/styles.css';
import {
  computeEdgeColor,
  computeEdgeConfig,
  serviceEdgeColor,
} from './graph-components';
import './register-custom-node';
import { getAttackGraphDataAction } from '../../actions/app-actions';
import { getNodeIcon } from '../multi-cloud/node-icons';
import { Sidepanel } from './sidepanel/sidepanel';

const toolbar = new G6.ToolBar({
  className: 'g6-df-toolbar g6-attack-path-toolbar',
  getContent: () => {
    const outDiv = document.createElement('div');
    outDiv.innerHTML = `<ul>
        <li code="zoom-out" title="Zoom Out"><i class="fa fa-lg fa-search-plus"></i></li>
        <li code="zoom-in" title="Zoom In"><i class="fa fa-lg fa-search-minus"></i></li>
        <li code="actual-size" title="Re-center"><i class="fa fa-lg fa-compress"></i></li>
      </ul>`;
    return outDiv;
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
        y: height / 2,
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
        y: height / 2,
      });
    } else if (code === 'actual-size') {
      graph.fitView();
    }
  },
});

export const AttackGraph = () => {
  const [containerRef, { width, height }] = useMeasure();
  const ref = useRef(null);
  const graphRef = useRef(null);
  const [dialogModel, setDialogModel] = useState(null);
  const dispatch = useDispatch();

  const [graphData, setGraphData] = useState();

  const { attackGraphData } = useSelector(state => {
    return {
      attackGraphData: state.getIn(['attackGraph', 'graphData', 'data'], null),
    };
  });

  useEffect(() => {
    if (attackGraphData) {
      setGraphData(processData(attackGraphData));
    }
  }, [attackGraphData]);

  useEffect(() => {
    if (graphRef.current && graphData) {
      graphRef.current.data(graphData);
      graphRef.current.render();
    }
  }, [graphData]);

  useEffect(() => {
    dispatch(getAttackGraphDataAction());
  }, []);

  useEffect(() => {
    if (graphRef.current) return;
    if (!ref.current) return;

    const w = width ?? 1000;
    const h = height ?? 1000;

    const graph = new G6.Graph({
      fitView: true,
      // animate: true,
      // animateCfg: {
      //   duration: 10000,
      // },
      container: ref.current,
      height: w,
      width: h,
      // groupByTypes: false,
      modes: {
        default: ['drag-canvas', 'zoom-canvas'],
      },
      plugins: [/* createLegend(), */ toolbar],
      layout: {
        type: 'dagre',
        rankdir: 'TB',
        nodesep: 50,
        ranksep: 60,
        preventOverlap: true,
      },
      // defaultCombo: {
      // color: '#a5a5a5',
      // anchorPoints: [[0.5, -0.13]],
      // // offset: [100, 100],
      // style: {
      // radius: 10,
      // fillOpacity: 0,
      // lineWidth: 1,
      // opacity: 0.5,
      // },
      // },
      defaultNode: {
        type: 'attack-path-node',
        // size: [40],
        labelCfg: {
          offset: 5,
          style: {
            fill: 'rgb(192, 192, 192)',
            fontFamily: 'Source Sans Pro',
            fontSize: 14,
          },
        },
      },
      defaultEdge: computeEdgeConfig,
    });
    graph.read({
      nodes: [],
      edges: [],
    });
    graph.on('node:click', evt => {
      const { item } = evt;
      const model = item.getModel();
      setDialogModel(model);
    });
    graph.render();
    graphRef.current = graph;
  }, []);

  useEffect(() => {
    if (width && height && graphRef.current) {
      graphRef.current.changeSize(width, height);
      graphRef.current.render();
    }
  }, [width, height, graphRef]);

  return (
    <AuthenticatedLayout>
      <div ref={containerRef}>
        <div
          ref={ref}
          style={{
            height: 'calc(100vh - 72px)',
            width: '100%',
            overflow: 'hidden',
            userSelect: 'none'
          }}
        />
      </div>
      {dialogModel ? (
        <Sidepanel
          model={dialogModel}
          onDismiss={() => {
            setDialogModel(null);
          }}
        />
      ) : null}
    </AuthenticatedLayout>
  );
};


function createLegend() {
  return new G6.Legend({
    data: {
      edges: [
        {
          id: 'compute',
          label: 'Compute',
          order: 0,
          style: {
            fill: computeEdgeColor,
            width: 14,
            lineWidth: 3,
            stroke: computeEdgeColor,
          },
          labelCfg: {
            style: {
              stroke: 'black',
              lineWidth: 0,
              fill: 'rgb(192, 192, 192)',
              fontFamily: 'Source Sans Pro',
              fontSize: 22,
            },
          },
        },
        {
          id: 'service',
          label: 'Service',
          order: 1,
          style: {
            fill: serviceEdgeColor,
            width: 14,
            // opacity: 0.7,
            lineWidth: 3,
            stroke: serviceEdgeColor,
          },
          labelCfg: {
            style: {
              stroke: 'black',
              lineWidth: 0,
              fill: 'rgb(192, 192, 192)',
              fontFamily: 'Source Sans Pro',
              fontSize: 22,
            },
          },
        },
      ],
    },
    align: 'center',
    layout: 'horizontal',
    position: 'bottom-right',
    containerStyle: {
      fill: '#000000',
      fillOpacity: 0,
    },
  });
}

function processData(attackGraphData) {
  const res = {
    nodes: [],
    edges: [],
  };
  if (!attackGraphData) {
    return res;
  }
  const nodesMap = new Map();
  const edgesMap = new Map();

  nodesMap.set('The Internet', {
    id: 'The Internet',
    label: 'The Internet',
    img: getNodeIcon('cloud'),
    type: 'image',
    size: 30,
  });

  attackGraphData.forEach(singleGraph => {
    if (singleGraph?.attack_path?.length) {
      const paths = singleGraph.attack_path;
      paths.forEach(path => {
        path.forEach((node, index) => {
          if (!nodesMap.has(node)) {
            nodesMap.set(node, {
              id: node,
              label: node,
            });
          }
          if (index) {
            const prev = path[index - 1];
            if (!edgesMap.has(`${prev}<->${node}`)) {
              edgesMap.set(`${prev}<->${node}`, {
                source: prev,
                target: node,
              });
            }
          }
        });
      });
      if (nodesMap.has(singleGraph.id)) {
        nodesMap.set(singleGraph.id, {
          id: singleGraph.id,
          label: singleGraph.label,
          complianceCount: singleGraph.compliance_count,
          count: singleGraph.count,
          nodeType: singleGraph.node_type,
          secretsCount: singleGraph.secrets_count,
          vulnerabilityCount: singleGraph.vulnerability_count,
          img: getNodeIcon('s3'),
        });
      }
    }
  });

  res.nodes = Array.from(nodesMap.values());
  res.edges = Array.from(edgesMap.values());
  return res;
}
