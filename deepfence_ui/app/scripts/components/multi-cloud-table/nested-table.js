import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import ReactTable from 'react-table-6';
import { showTopologyPanel } from '../../actions';
import { NODE_TYPE } from '../../constants/topology-multicloud';
import { ShimmerLoaderRow } from '../shimmer-loader/shimmer-row';
import './styles.scss';
import { addCheckbox, getColumnsForTypes } from './table-columns';


const ShimmerWithTimeout = ({ message = 'No Data' }) => {
  const [timeoutExpired, setTimeoutExpired] = useState(false);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setTimeoutExpired(true);
    }, 15000);

    return () => {
      clearTimeout(timeoutId);
    }
  }, []);

  if (timeoutExpired) {
    return (
      <div className="empty-row">
        {message}
      </div>
    );
  }
  return <ShimmerLoaderRow numberOfRows={1} />
}


let selectedItems = [];
const RecursiveTable = ({
  data, onRowExpand, onRowCollapse, onNodeClicked, setAction, depth, metadata, parent = {}
}) => {
  if (!data || data.length === 0) {
    // check for cloud_region, if host count is 0
    // do not show shimmer loader
    const parentNodeType = parent.node_type;
    const childrenCount = metadata?.children_count || {};
    const hostCountForRegion = childrenCount[parent.id]?.hosts;
    if (parentNodeType === NODE_TYPE.REGION
      && hostCountForRegion === 0) {
      return (
        <div className="empty-row">
          No hosts found for this region.
        </div>
      );
    }
    return (
      <ShimmerWithTimeout />
    );
  }

  const dispatch = useDispatch();
  const nodeTypes = new Set(data.map(node => node.node_type));
  const cols = getColumnsForTypes(nodeTypes, depth);
  const emptyHeaderTables = [NODE_TYPE.REGION];
  const columns = addCheckbox(cols, selectedItems, (row) => {
    if (selectedItems.indexOf(row.original.id) > -1) {
      selectedItems.splice(selectedItems.indexOf(row.original.id), 1);
    } else {
      selectedItems.push(row.original.id);
    }
    setAction(selectedItems);
  });

  const onExpandedChange = (newExpanded, index, event, cellInfo) => (newExpanded[index]
    ? onRowExpand(cellInfo.original)
    : onRowCollapse(cellInfo.original));

  const TheadComponent = () => null;
  let headerProp = {};

  nodeTypes.forEach((key) => {
    if (emptyHeaderTables.includes(key)) {
      headerProp = {
        TheadComponent
      };
    }
  });

  return (
    <ReactTable
      showPagination={false}
      // default is 20
      defaultPageSize={10000}
      showPageJump={false}
      freezeWhenExpanded={false}
      collapseOnDataChange={false}
      data={data}
      columns={columns}
      minRows={0}
      onExpandedChange={(newExpanded, index, event, cellInfo) => {
        onExpandedChange(newExpanded, index, event, cellInfo);
      }}
      getTrProps={(state, rowInfo) => (
        {
          onClick: (e) => {
            // show sidebar panel when click on row item except checkbox or expand button click
            if (
              !e.target.className.includes('rt-expander') &&
              !e.target.className.includes('action-checkbox')
            ) {
              dispatch(showTopologyPanel(true));
            }
            return onNodeClicked({ id: rowInfo.original.id, label: rowInfo.original.label });
          },
        }
      )}
      SubComponent={nodeTypes.has('process') ? null : row => (
        <RecursiveTable
          data={row.original.children}
          onRowExpand={onRowExpand}
          onRowCollapse={onRowCollapse}
          onNodeClicked={onNodeClicked}
          setAction={setAction}
          depth={depth + 1}
          metadata={metadata}
          parent={row.original}
        />
      )}
      {...headerProp}
    />
  );
};

export const NestedTable = ({
  data, onRowExpand, onRowCollapse, onNodeClicked, setAction, metadata
}) => {
  useEffect(() => { selectedItems = []; }, []);

  return (
    <RecursiveTable
      metadata={metadata}
      data={data}
      onRowExpand={onRowExpand}
      onRowCollapse={onRowCollapse}
      onNodeClicked={onNodeClicked}
      setAction={setAction}
      depth={1}
    />
  );
}
