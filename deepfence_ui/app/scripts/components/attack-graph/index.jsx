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
import {
  breadcrumbChange,
  getAttackGraphDataAction,
} from '../../actions/app-actions';
import { getNodeIcon } from '../multi-cloud/node-icons';
import { Sidepanel } from './sidepanel/sidepanel';
import { DetailsTable } from './sidepanel/details-table';
import { getAssetIcon } from './icons';
import AppLoader from '../common/app-loader/app-loader';
import styles from './index.module.scss';

const toolbar = new G6.ToolBar({
  className: 'g6-df-toolbar',
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
  const [detailsTableNode, setDetailsTableNode] = useState(null);
  const dispatch = useDispatch();

  const [graphData, setGraphData] = useState();

  const { attackGraphData, attackGraphDataLoading } = useSelector(state => {
    return {
      attackGraphData: state.getIn(['attackGraph', 'graphData', 'data'], null),
      attackGraphDataLoading: state.getIn(
        ['attackGraph', 'graphData', 'loading'],
        null
      ),
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
    dispatch(breadcrumbChange([{ name: 'Threat Graph' }]));
    const intervalId = setInterval(() => {
      dispatch(getAttackGraphDataAction());
    }, 5 * 60 * 1000);
    dispatch(getAttackGraphDataAction());
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    if (graphRef.current) return;
    if (!ref.current) return;

    const w = width ?? 1000;
    const h = height ?? 1000;

    const graph = new G6.Graph({
      fitView: true,
      container: ref.current,
      maxZoom: 4,
      height: w,
      width: h,
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
      defaultNode: {
        type: 'attack-path-node',
        labelCfg: {
          offset: 5,
          style: {
            fill: 'rgb(192, 192, 192)',
            fontFamily: 'Source Sans Pro',
            fontSize: 14,
            background: {
              fill: '#ffffff',
              fillOpacity: 0.1,
              padding: [2, 4, 2, 4],
              radius: 2,
            },
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
      if (!model?.nonInteractive) setDialogModel(model);
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
      <div className={styles.attackGraphWrapper}>
        <div ref={containerRef}>
          <div ref={ref} className={styles.canvasWrapper} />
        </div>
        {!graphData?.edges?.length && !graphData?.nodes?.length ? (
          <div className={styles.placeholder}>
            {attackGraphDataLoading ? (
              <AppLoader />
            ) : (
              'No attack paths discovered. Please run Vulnerability/Secret/Compliance scans to discover new attack paths.'
            )}
          </div>
        ) : null}
        {dialogModel ? (
          <Sidepanel
            model={dialogModel}
            onDismiss={() => {
              setDialogModel(null);
            }}
            onStatClick={info => {
              setDetailsTableNode(info);
            }}
          />
        ) : null}
        {detailsTableNode ? (
          <DetailsTable
            tableType={detailsTableNode.type}
            nodeData={detailsTableNode.nodeData}
            isSidepanelOpen={!!dialogModel}
            onDismiss={() => {
              setDetailsTableNode(null);
            }}
          />
        ) : null}
      </div>
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
  if (
    !attackGraphData ||
    (!attackGraphData?.aws?.resources?.length &&
      !attackGraphData?.azure?.resources?.length &&
      !attackGraphData?.gcp?.resources?.length &&
      !attackGraphData?.others?.resources?.length)
  ) {
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
    nonInteractive: true,
  });

  Object.keys(attackGraphData).forEach(cloudKey => {
    const cloudObj = attackGraphData[cloudKey];
    if (!cloudObj?.resources?.length) {
      return;
    }
    const cloudRootId = `cloud_root_${cloudKey}`;
    nodesMap.set(cloudRootId, {
      id: cloudRootId,
      label: cloudKey === 'others' ? 'private cloud' : cloudKey,
      complianceCount: cloudObj.compliance_count,
      count: 0,
      nodeType: cloudRootId,
      secretsCount: cloudObj.secrets_count,
      vulnerabilityCount: cloudObj.vulnerability_count,
      img: getAssetIcon(cloudRootId),
      nonInteractive: true,
    });
    edgesMap.set(`The Internet<->${cloudRootId}`, {
      source: 'The Internet',
      target: cloudRootId,
    });
    cloudObj?.resources?.forEach(singleGraph => {
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
              let prev = path[index - 1];
              if (prev === 'The Internet') prev = cloudRootId;
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
            img: getAssetIcon(singleGraph?.node_type),
          });
        }
      }
    });
  });

  res.nodes = Array.from(nodesMap.values());
  res.edges = Array.from(edgesMap.values());
  return res;
}
