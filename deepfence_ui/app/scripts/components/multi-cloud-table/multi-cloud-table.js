/* eslint-disable */
import React, {
  useCallback, useEffect, useRef, useState
} from 'react';
import { withRouter } from 'react-router';
import {
  modelNodeTypeToTopologyChildrenTypes,
  modelNodeTypeToTopologyType,
} from '../multi-cloud/LiveTopologyGraph';
import Select from 'react-select';
import 'react-table-6/react-table.css';
import { TopologyClient } from '../multi-cloud/topology-client-2';
import { NestedTable } from './nested-table';
import './styles.scss';
import { MultiCloudTable } from './table';
import { topologyDataToTableDelta } from './utils';
import {useSocketDisconnectHandler} from './../multi-cloud/hooks';
import { ShimmerLoaderRow } from '../shimmer-loader/shimmer-row';



const themeCb = theme => ({
  ...theme,
  borderRadius: 5,
  colors: {
    ...theme.colors,
    primary25: '#1c1c1c', // hover
    neutral20: '#c0c0c0', // border
    primary: '#000',
    neutral0: '#1c1c1c', // '#22252b', // background
    neutral80: '#bfbfbf', // placeholder
    neutral90: 'white',
  },
});

const styles = {
  option: (provided, state) => ({
    ...provided,
    color: state.isSelected ? '#0080ff' : '#999999',
    backgroundColor: state.isSelected ? '#1c1c1c' : provided.backgroundColor,
    '&:hover': {
      backgroundColor: '#333333',
    },
  }),
  control: provided => ({
    ...provided,
    width: 200,
    borderColor: '#1c1c1c',
  }),
  container: provided => ({
    ...provided,
    width: 200
  })
};

export const MultiCloudTreeTable = withRouter(({
  match,
  history,
  location,
  apiKey,
  apiURL,
  refreshInterval,
  onNodeClicked,
  setAction,
  viewType,
}) => {
  const client = useRef(null);
  const table = useRef(null);
  const [metadata, setMetadata] = useState({});
  const [count, setCount] = useState('');
  const [vulnerabilityfilter, setVulerabilityfilter] = useState("");
  const [, setReRender] = useState(0);
  const triggerSocketDisconnectHandler = useSocketDisconnectHandler();

  const options = [
    { label: 'Complete', value: 'complete' },
    { label: 'Show all', value: '' },
    { label: 'Never Scanned', value: 'never_scanned' }
  ]


  const addVulnerabilityFilter = e => {
      setVulerabilityfilter(e.value);
  }

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
      viewType || 'hosts',
      vulnerabilityfilter,
      (data) => {
        setMetadata(data.metadata);
        const nodes_delta = topologyDataToTableDelta(data.nodes);
        setCount(data.metadata?.children_count?.[""]?.[viewType]);
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
  }, [table, vulnerabilityfilter]);

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
      const removedExpandedChildren = table.current.removeChildren(node.children);
      // we need to tell server to collpase expanded children too,
      // so we can expand them again. Otherwise server would not know that the childrens are collpased
      // and when ui will try to expand them, server will return nothing and ui will hang in loading state
      for (const removedExpandedChild of removedExpandedChildren) {
        const topo_node_type = modelNodeTypeToTopologyType(removedExpandedChild.node_type);
        client.current.collapseNode(
          removedExpandedChild.id,
          topo_node_type,
          {},
        );
      }

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
    <div>
   {history.location.pathname.includes('hosts') && <div style={{margin: '25px'}}>
    <Select
    components={{
      IndicatorSeparator: null,
    }}
    styles={styles}
    theme={themeCb}
    placeholder={vulnerabilityfilter || "Vulnerability Status"}
    options={options}
    value={options.value}
    classNamePrefix="select"
    className="select-filter"
    onChange={addVulnerabilityFilter}
  />
    </div>}
    {count === 0 ? <div className="absolute-center" style={{fontSize: '25px'}}>
      No Rows Available
    </div> : (table.current === null)  ?  <ShimmerLoaderRow numberOfRows={3} />:
     <NestedTable
      metadata={metadata}
      data={data}
      onRowExpand={onNodeExpanded}
      onRowCollapse={onNodeCollapsed}
      onNodeClicked={onNodeClicked}
      setAction={setAction}
    />}
    </div>
  );
});
