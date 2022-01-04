/* eslint-disable */
import React, {
  useCallback, useEffect, useRef, useState
} from 'react';
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

export const MultiCloudTreeTable = ({
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
  const triggerSocketDisconnectHandler = useSocketDisconnectHandler();

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
  }, [table]);

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
    <NestedTable
      metadata={metadata}
      data={data}
      onRowExpand={onNodeExpanded}
      onRowCollapse={onNodeCollapsed}
      onNodeClicked={onNodeClicked}
      setAction={setAction}
    />
  );
};
