/* eslint-disable new-cap */
/* eslint-disable jsx-a11y/anchor-is-valid */
import React, { useRef, useEffect, useState } from 'react';
import G6 from '@antv/g6';
import useMeasure from 'react-use/lib/useMeasure';
import { DialogOverlay, DialogContent } from '@reach/dialog';
import { useDispatch, useSelector } from 'react-redux';
import { AuthenticatedLayout } from '../layouts/AuthenticatedLayout';
import '@reach/dialog/styles.css';
import { getSeverityColor } from '../../constants/colors';
import {
  computeEdgeColor,
  computeEdgeConfig,
  dataStore,
  serviceEdgeColor,
} from './dummy-data';
import './register-custom-node';
import { getAttackGraphDataAction } from '../../actions/app-actions';
import { getNodeIcon } from '../multi-cloud/node-icons';

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

export const AttackGraph = () => {
  const [containerRef, { width, height }] = useMeasure();
  const ref = useRef(null);
  const graphRef = useRef(null);
  const [dialogStack, setDialogStack] = useState([]);
  const dispatch = useDispatch();

  const [graphData, setGraphData] = useState();

  const { attackGraphData } = useSelector(state => {
    return {
      attackGraphData: state.getIn(['attackGraph', 'data'], null),
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
      plugins: [createLegend(), toolbar],
      layout: {
        type: 'dagre',
        rankdir: 'TB',
        nodesep: 50,
        ranksep: 80,
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
    // graph.data(graphData);
    graph.on('node:click', evt => {
      const { item } = evt;
      const model = item.getModel();
      setDialogStack(prev => {
        if (prev.find(prevItem => prevItem.id === model.id)) {
          return prev;
        }
        return [...prev, model];
      });
    });
    graph.render();
    graphRef.current = graph;
  }, []);

  useEffect(() => {
    if (width && height && graphRef.current) {
      graphRef.current.changeSize(width, height);

      // graphRef.current.zoomTo(40, {
      //   x: width / 2,
      //   y: 50,
      // });

      graphRef.current.render();
    }
  }, [width, height, graphRef]);

  function closeDialogFor(dialogStackItem) {
    setDialogStack(prev => {
      const indexToDelete = prev.findIndex(item => {
        return item.id === dialogStackItem.id;
      });
      if (indexToDelete === -1) return prev;
      return [
        ...prev.slice(0, indexToDelete),
        ...prev.slice(indexToDelete + 1),
      ];
    });
  }

  function openDialogFor(dialogStackItem) {
    setDialogStack(prev => {
      return [...prev, dialogStackItem];
    });
  }

  return (
    <AuthenticatedLayout>
      <div ref={containerRef}>
        <div
          ref={ref}
          style={{
            height: 'calc(100vh - 72px)',
            overflow: 'hidden',
          }}
        />
      </div>
      {dialogStack.map((dialogStackItem, index) => {
        return (
          <DialogOverlay
            key={dialogStackItem.id}
            style={{
              left: 'calc(100vw - 500px)',
              top: `${70 + index * 8}px`,
              bottom: 'auto',
              height: 'auto',
              background: 'transparent',
              overflowY: 'auto',
              maxHeight: `calc(100vh - ${70 + index * 8}px)`,
            }}
            isOpen
            onDismiss={() => {
              closeDialogFor(dialogStackItem);
            }}
            dangerouslyBypassScrollLock
          >
            <DialogContent
              style={{
                width: '100%',
                maxHeight: '100%',
                margin: 0,
                padding: 0,
                border: '1px solid grey',
                borderRadius: '8px ',
                overflow: 'hidden',
                overflowY: 'auto',
              }}
              aria-label="test"
            >
              <DialogHeader
                title={dialogStackItem.label}
                onCloseClick={() => {
                  closeDialogFor(dialogStackItem);
                }}
              />
              <DialogData
                data={dialogStackItem}
                openDialogFor={item => openDialogFor(item)}
              />
            </DialogContent>
          </DialogOverlay>
        );
      })}
    </AuthenticatedLayout>
  );
};

function DialogHeader({ title, onCloseClick }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: '46px',
        backgroundColor: '#252525',
        paddingLeft: '16px',
        color: '#ffffff',
        fontWeight: 600,
        position: 'sticky',
        top: 0,
      }}
    >
      <span>{title}</span>
      <span
        style={{
          height: '100%',
          paddingRight: '24px',
          paddingLeft: '16px',
          cursor: 'pointer',
        }}
        onClick={onCloseClick}
      >
        <i className="fa fa-times" />
      </span>
    </div>
  );
}

function DialogData({ data, openDialogFor }) {
  const { id } = data;
  const nodeData = dataStore[id];
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '16px',
        backgroundColor: '#000000',
      }}
    >
      {!nodeData ? (
        'No Data'
      ) : (
        <div>
          {nodeData.metadata
            ? Object.keys(nodeData.metadata).map(key => {
                return (
                  <div
                    key={key}
                    style={{
                      marginBottom: '8px',
                    }}
                  >
                    <div
                      style={{
                        fontWeight: 600,
                        textTransform: 'capitalize',
                      }}
                    >
                      {key}
                    </div>
                    <div>{nodeData.metadata[key]}</div>
                  </div>
                );
              })
            : null}
          {nodeData.vulnerabilities ? (
            <IssuesTable
              title="vulnerabilities"
              issues={nodeData.vulnerabilities}
            />
          ) : null}
          {nodeData.compliance ? (
            <IssuesTable
              title="compliance issues"
              issues={nodeData.compliance}
            />
          ) : null}
          {nodeData.secrets ? (
            <IssuesTable title="secrets discovered" issues={nodeData.secrets} />
          ) : null}
          {nodeData.resources ? (
            <IssuesTable
              title="non-compliant service resources"
              issues={nodeData.resources}
              onMoreDetailsClick={item => {
                openDialogFor(item);
              }}
            />
          ) : null}
        </div>
      )}
    </div>
  );
}

function IssuesTable({ title, issues, onMoreDetailsClick }) {
  return (
    <div>
      <div
        style={{
          fontWeight: 600,
          textTransform: 'capitalize',
        }}
      >
        {title}
      </div>
      <table width="100%" style={{ marginTop: '4px' }}>
        {issues.map(item => {
          return (
            <tr key={item.title}>
              <td>
                <div
                  style={{
                    maxWidth: '250px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {item.title ?? item.name ?? item.label}
                </div>
              </td>
              {item.severity ? (
                <td
                  style={{
                    color: getSeverityColor(item.severity),
                  }}
                >
                  {item.severity}
                </td>
              ) : null}

              {item.vector ? <td>{item.vector}</td> : null}
              {item.type ? <td>{item.type}</td> : null}
              <td style={{ textAlign: 'right' }}>
                <a
                  href="#"
                  onClick={e => {
                    e.preventDefault();
                    const _ = onMoreDetailsClick && onMoreDetailsClick(item);
                  }}
                >
                  details &gt;
                </a>
              </td>
            </tr>
          );
        })}
      </table>
      <div
        style={{
          marginTop: '4px',
          display: 'flex',
          justifyContent: 'flex-end',
          fontWeight: 600,
        }}
      >
        <a href="#">+ 5 more &gt;</a>
      </div>
    </div>
  );
}
