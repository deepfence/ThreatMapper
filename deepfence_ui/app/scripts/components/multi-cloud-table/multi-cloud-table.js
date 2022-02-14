/* eslint-disable */
import React, {
  useCallback, useEffect, useRef, useState
} from 'react';
import { withRouter } from 'react-router';
import {
  modelNodeTypeToTopologyChildrenTypes,
  modelNodeTypeToTopologyType,
} from '../multi-cloud/LiveTopologyGraph';
import 'react-table-6/react-table.css';
import { TopologyClient } from '../multi-cloud/topology-client-2';
import { NestedTable } from './nested-table';
import './styles.scss';
import { MultiCloudTable } from './table';
import { topologyDataToTableDelta } from './utils';
import {useSocketDisconnectHandler} from './../multi-cloud/hooks';
import { ShimmerLoaderRow } from '../shimmer-loader/shimmer-row';

export const MultiCloudTreeTable = withRouter(({
  match,
  history,
  location,
  apiKey,
  apiURL,
  refreshInterval,
  onNodeClicked,
  setAction,
}) => {
  const client = useRef(null);
  const table = useRef(null);
  const [metadata, setMetadata] = useState({});
  const [, setReRender] = useState(0);
  let viewType = '';
  const triggerSocketDisconnectHandler = useSocketDisconnectHandler();
  
  useEffect(() => {
    const url = location.pathname;
    if (url.includes('cloud')) {
      viewType = 'cloud-providers'
    } else if (url.includes('hosts')){
      viewType = 'hosts'
    } else if( url.includes('k8s')) {
      viewType = 'kubernetes-clusters'
    } else {
      viewType = 'cloud-providers'
    }
  }, []);


  useEffect(() =>{
    const pathname = history.location.pathname;
    if (pathname.includes('cloud')) {
      viewType = 'cloud-providers'
    } else if (pathname.includes('hosts')){
      viewType = 'hosts'
    } else if( pathname.includes('k8s')) {
      viewType = 'kubernetes-clusters'
    } else {
      viewType = 'cloud-providers'
    }
  }, [history.location.pathname]);

  useEffect(() => {
    table.current = new MultiCloudTable(
      [],
      () => setReRender(count => count + 1),
      {}
    );
    client.current = new TopologyClient(
      apiURL,
      apiKey,
      refreshInterval,
      viewType,
      (data) => {
        setMetadata(data.metadata);
        const nodes_delta = topologyDataToTableDelta(data.nodes);
        if (nodes_delta !== null) {
          for (const parent_id of Object.keys(nodes_delta)) {
            table.current.updateData(parent_id, nodes_delta[parent_id]);
          }
        }
      },
      () => {
        triggerSocketDisconnectHandler();
      }
    );

    client.current.open();

    return () => {
      client.current.close();
    };
  }, [table, history.location.pathname]);

  const onNodeExpanded = useCallback(
    (node) => {
      if (table.current === null) {
        return;
      }

      const topo_node_type = modelNodeTypeToTopologyType(node.node_type);
      if (!topo_node_type) {
        return;
      }
      const topo_children_types = modelNodeTypeToTopologyChildrenTypes(
        node.node_type
      ) || [];

      if (topo_children_types.length === 0) {
        return;
      }

      client.current.expandNode(
        node.id,
        topo_node_type,
        {},
        topo_children_types
      );
    },
    [table]
  );
  const onNodeCollapsed = useCallback(
    (node) => {
      if (table.current === null) {
        return;
      }
      table.current.removeChildren(node.children);

      const topo_node_type = modelNodeTypeToTopologyType(node.node_type);
      client.current.collapseNode(
        node.id,
        topo_node_type,
        {},
      );
    },
    [table]
  );

  const data = table.current?.getTableTreeData() || [];

  return (
    <>{ (table.current === null)  ?  <ShimmerLoaderRow numberOfRows={3} />:
     <NestedTable
      metadata={metadata}
      data={data}
      onRowExpand={onNodeExpanded}
      onRowCollapse={onNodeCollapsed}
      onNodeClicked={onNodeClicked}
      setAction={setAction}
    />}
    </>
  );
});
