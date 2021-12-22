import debug from 'debug';
import React, { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';


import ActionTabGroup from './node-details/action-tab-group';

import { formatDataType } from '../utils/string-utils';
import NodeDetailsHealth from './node-details/node-details-health';
import NodeDetailsInfo from './node-details/node-details-info';
import NodeDetailsTable from './node-details/node-details-table';
import { NodeDetailsMostExploitablePathsGraph } from './node-details/node-details-exploitable-paths-graph';
import CVESeverityChart from './node-details/node-details-cve-severity';
import Warning from './warning';
import DonutView from './topology-view/donut-chart-view/donut-view';
import {
  LOCAL_NETWORKS_FOR_HOSTS,
  DESTINATION_IP_KEY_FOR_HOST,
} from '../constants/naming';
import TUX_LOGO from '../../images/tux.png';
import WINDOWS_LOGO from '../../images/windows-logo.png';
import { doRequest, getApiPath } from '../utils/web-api-utils';
import { ShimmerLoaderRow } from './shimmer-loader/shimmer-row';
import {
  receiveNodeDetails,
  setTopologyPanelNavStack,
  showTopologyPanel,
} from '../actions';
import { getNodeIcon } from './multi-cloud/node-icons';

const log = debug('scope:node-details');

function getTruncationText(count) {
  return (
    'This section was too long to be handled efficiently and has been truncated' +
    ` (${count} extra entries not included). We are working to remove this limitation.`
  );
}

const findMetadataIndex = (metadata, key) => {
  for (let i = 0; i < metadata.length; i += 1) {
    const meta = metadata[i];
    if (meta.id === key) {
      return i;
    }
  }

  return -1;
};

const findMetadata = (metadata, key) => {
  const index = findMetadataIndex(metadata, key);
  return index >= 0 ? metadata[index] : null;
};

const findMetadataValue = (metadata, key) => {
  const meta = findMetadata(metadata, key);
  return meta !== null ? meta.value : null;
};

export const NodeDetails = () => {
  const dispatch = useDispatch();

  const navStack = useSelector(state => state.get('topologyPanelNavStack'));

  const [details, setDetails] = useState(null);
  const [fetchError, setFetchError] = useState(false);

  const navNodeId = navStack[0] || null;

  const setNavStack = useCallback(
    stack => {
      dispatch(setTopologyPanelNavStack(stack));
    },
    [dispatch, setTopologyPanelNavStack]
  );

  const pushNavStack = useCallback(
    node_id => {
      setNavStack([node_id, ...navStack]);
    },
    [navStack, setNavStack]
  );

  const popNavStack = useCallback(() => {
    if (navStack.length === 1) {
      // eslint-disable-next-line no-console
      console.error('invalid side panel nav stack pop');
      return;
    }

    // eslint-disable-next-line no-unused-vars
    const [_top, ...rest] = navStack;
    setNavStack(rest);
  }, [navStack, setNavStack]);

  const navigateToNode = useCallback(
    (event, node) => {
      if (details?.id === node.nodeId) {
        return;
      }

      if (!canNavigateToNode(node)) {
        return;
      }

      pushNavStack(node.nodeId);
    },
    [details]
  );

  const goBack = navStack.length > 1 ? popNavStack : null;

  useEffect(() => {
    if (navNodeId === null) {
      return;
    }

    setDetails(null);
    setFetchError(false);

    const url = topologyUrlForId(navNodeId);
    doRequest({
      url,
      success: res => {
        dispatch(receiveNodeDetails(res.node, 0));
        setDetails(res.node);
      },
      error: err => {
        // eslint-disable-next-line no-console
        console.error(
          'error retrieving node data',
          navNodeId,
          err.responseText
        );
        setFetchError(true);
      },
    });
  }, [navNodeId]);

  if (navNodeId === null) {
    return <NoNodeSelected />;
  }

  if (fetchError) {
    return <DetailsError goBack={goBack} />;
  }

  if (details === null) {
    return <Loading />;
  }

  const nodeId = details.id;

  const topologyId = nodeIdToTopologyId(nodeId);
  let nodeName = details.label;
  const hostName = details.labelMinor;
  let destinationIp = null;
  let localNetworkIp = null;
  let containerId = null;

  const metadata = details.metadata
    ? details.metadata.map(el => ({
      ...el,
    }))
    : [];

  if (topologyId === 'hosts') {
    [nodeName] = details.id.split(';');
    destinationIp = findMetadataValue(metadata, DESTINATION_IP_KEY_FOR_HOST);
    localNetworkIp = findMetadataValue(metadata, LOCAL_NETWORKS_FOR_HOSTS);
  } else if (topologyId === 'containers') {
    [containerId] = details.id.split(';');
  }

  const isHost = nodeId.indexOf('<host>') !== -1;
  const isContainer = nodeId.indexOf('<container>') !== -1;
  const isPod = nodeId.indexOf('<pod>') !== -1;
  const isPodService = nodeId.indexOf('<service>') !== -1;
  const isContainerImage = nodeId.indexOf('<container_image>') !== -1;

  const showActionsTab =
    metadata.length > 0 &&
    (isHost || isContainer || isPod || isPodService || isContainerImage);
  const showCVESeverity = isHost || isContainer || isContainerImage;
  const showTopAttackPaths = isHost || isContainer || isContainerImage;
  if (isHost) {
    details.type = 'host';
  }
  if (isContainer) {
    details.type = 'container';
  }
  if (isContainerImage) {
    details.type = 'container_image';
  }

  let headerImage;
  if (isHost) {
    const meta = findMetadataValue(metadata, 'os');
    if (meta) {
      const os = meta.toLowerCase();
      if (os === 'linux') {
        headerImage = TUX_LOGO;
      } else if (os === 'windows') {
        headerImage = WINDOWS_LOGO;
      }
    }
  } else {
    headerImage = getNodeIcon(details.shape);
  }

  const cp_meta = findMetadata(metadata, 'cloud_provider');
  if (cp_meta !== null && cp_meta.value === '') {
    cp_meta.value = 'Private/On Prem';
  }

  const cm_index = findMetadataIndex(metadata, 'cloud_metadata');
  if (cm_index >= 0) {
    const meta = metadata[cm_index];
    metadata.splice(cm_index, 1);
    const obj = JSON.parse(meta.value);
    /* eslint-disable */
    for (const k of Object.keys(obj)) {
      if (k === 'cloud_provider' || k === 'region') {
        continue;
      }

      metadata.push({
        id: k,
        label: `Cloud ${k.replace('_', ' ')}`,
        value: obj[k],
      });
    }
    /* eslint-enable */
  }

  return (
    <>
      <Header title={details.label} iconSrc={headerImage} goBack={goBack} />
      <div className="node-details-content">
        {showActionsTab && (
          <ActionTabGroup
            details={details}
            topologyId={topologyId}
            nodeId={nodeId}
            destinationIp={destinationIp}
          />
        )}
        {details.metrics && (
          <div className="node-details-content-section">
            <div className="node-details-content-section-header">
              Availability
            </div>
            <NodeDetailsHealth
              metrics={details.metrics}
              topologyId={topologyId}
            />
          </div>
        )}
        <DonutView
          nodeName={nodeName}
          hostName={hostName}
          destinationIp={destinationIp}
          localNetworkIp={localNetworkIp}
          containerId={containerId}
          topologyType={topologyId}
        />
        {showCVESeverity && details && <CVESeverityChart details={details} />}
        {showTopAttackPaths && details && <div className="node-details-content-section">
          <div className="node-details-content-section-header">
            Top 5 Attack Paths
          </div>
          <NodeDetailsMostExploitablePathsGraph
            details={details}
          />
        </div>}
        {details.connections &&
          details.connections
            .filter(cs => cs.connections.length > 0)
            .map(connections => (
              <div
                className="node-details-content-section"
                key={connections.id}
              >
                <NodeDetailsTable
                  {...connections}
                  nodes={connections.connections}
                  onClickRow={navigateToNode}
                  nodeIdKey="nodeId"
                />
              </div>
            ))}

        {details.children &&
          details.children.map(children => {
            if (children.nodes?.length) {
              return (
                <div
                  className="node-details-content-section"
                  key={children.topologyId}
                >
                  <NodeDetailsTable {...children} onClickRow={navigateToNode} />
                </div>
              );
            }
            return null;
          })}

        {details.tables &&
          details.tables.length > 0 &&
          details.tables.map(table => {
            if (table.rows.length > 0) {
              return (
                <div className="node-details-content-section" key={table.id}>
                  <div className="node-details-content-section-header">
                    {table.label && table.label.length > 0 && table.label}
                    {table.truncationCount > 0 && (
                      <span className="node-details-content-section-header-warning">
                        <Warning
                          text={getTruncationText(table.truncationCount)}
                        />
                      </span>
                    )}
                  </div>
                  <Table table={table} />
                </div>
              );
            }
            return null;
          })}
        <NodeDetailsInfo rows={metadata} />
      </div>
    </>
  );
};

const Table = ({ table }) => {
  if (table) {
    return (
      <div>
        {table.rows.map(field => {
            const { title } = formatDataType(field);
            return (
              <div className="node-details-info-field" key={field.id}>
                <div
                  className="node-details-info-field-label truncate"
                  title={field.entries.label}
                >
                  {field.entries.label}
                </div>
                <div
                  className="node-details-info-field-value truncate"
                  title={title}
                >
                  {field.entries.value}
                </div>
              </div>
            );
          })}
      </div>
    );
  }
  log(`Undefined type '${table.type}' for table ${table.id}`);
  return null;
};

const nodeTopologyTypeToTopologyId = topo_type => {
  const vals = {
    '<cloud_provider>': 'cloud-providers',
    '<cloud_region>': 'cloud-regions',
    '<kubernetes_cluster>': 'kubernetes-clusters',
    '<host>': 'hosts',
    '<container>': 'containers',
    '<container_image>': 'containers-by-image',
    '<pod>': 'pods',
    // FIXME: add more
  };

  const val = vals[topo_type];
  if (val === undefined) {
    // eslint-disable-next-line no-console
    console.error('unknown topology id', topo_type);
  }

  return val;
};

const nodeIdToTopologyId = node_id => {
  const topo_type = node_id.split(';')[1];
  if (topo_type === undefined) {
    return 'hosts';
  }
  if (!Number.isNaN(parseInt(topo_type, 10))) {
    // processes don't have a ;<topo_type> part
    return 'processes';
  }
  return nodeTopologyTypeToTopologyId(topo_type);
};

const topologyUrlForId = node_id => {
  [node_id] = node_id.split('---');
  const topo_type = node_id.split(';')[1];
  let path;
  if (topo_type === undefined) {
    path = 'hosts';
  } else if (!Number.isNaN(parseInt(topo_type, 10))) {
    // processes don't have a ;<topo_type> part
    path = 'processes';
  } else {
    path = nodeTopologyTypeToTopologyId(topo_type);
  }

  return `${getApiPath()}/topology-api/topology/${path}/${encodeURIComponent(
    node_id
  )}`;
};

const Loading = () => (
  <div>
    <Header title="Loading" />
    <div className="node-details-content">
      <div className="node-details-content-loading">
        <ShimmerLoaderRow numberOfRows={3} />
      </div>
    </div>
  </div>
);

const DetailsError = ({ goBack = null }) => (
  <div>
    <Header title="Error" goBack={goBack} />
    <div className="node-details-content">
      <p className="node-details-content-error">
        An error occurred while retrieving the node data.
      </p>
    </div>
  </div>
);

const NoNodeSelected = () => (
  <div>
    <Header title="Node details" />
    <div className="node-details-content">
      <p className="node-details-content-error">No node selected.</p>
    </div>
  </div>
);

const Header = ({ title, iconSrc = null, goBack = null }) => {
  const dispatch = useDispatch();

  const closePanel = useCallback(() => {
    dispatch(showTopologyPanel(false));
  }, []);

  return (
    <div className="node-details-header">
      {iconSrc && (
        <img alt="" className="node-details-header-icon" src={iconSrc} />
      )}
      <div className="node-details-header-label-wrapper">
        <span className="node-details-header-label-text" title={title}>
          {title}
        </span>
      </div>
      {goBack && (
        // eslint-disable-next-line jsx-a11y/anchor-is-valid
        <a
          alt="back"
          className="node-details-header-back-link"
          onClick={goBack}
        >
          <i className="fa fa-arrow-left" aria-hidden="true" />
          Back
        </a>
      )}
      <div
        alt="close"
        className="node-details-header-close-button"
        onClick={closePanel}
      >
        <i className="fa fa-times" aria-hidden="true" />
      </div>
    </div>
  );
};

const canNavigateToNode = node => {
  if (node.nodeId === 'out-theinternet') {
    return false;
  }

  return true;
};
