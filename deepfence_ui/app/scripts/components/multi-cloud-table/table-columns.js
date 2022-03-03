/* eslint-disable max-len */
/* eslint-disable react/destructuring-assignment */
import React from 'react';
import { ScanStatus } from '../common/scan-status';

// offset in px, depends on padding-left of the table
const COLUMN_OFFSET = 25;
const COLUMN_WIDTH = 250;
// inset in px, because processes don't have expand buttons
const PROCESS_INSET = 32;


const commonColumnsDefault = [{
  Header: 'name',
  accessor: 'label',
},
{
  Header: 'type',
  accessor: 'node_type',
}];

const commonColumnsRestOfTable = [{
  Header: '',
  accessor: 'label',
},
{
  Header: '',
  accessor: 'node_type',
}];

const hostColumns = [
{
  Header: 'vulnerability scan',
  accessor: 'vulnerability_scan_status',
  Cell: ({ original }) => {

    const { vulnerability_scan_status, is_ui_vm } = original;
    // for UI VMs, vulnerability scan is not available
    if (is_ui_vm === 'true') {
      return <span className="scan-status not-available">Not Applicable</span>;
    }
    return <ScanStatus status={vulnerability_scan_status} />;
  },
},
{
  Header: 'secrets scan',
  accessor: 'secret_scan_status',
  Cell: ({ original }) => {

    const { secret_scan_status, is_ui_vm } = original;
    // for UI VMs, secrets scan is not available
    if (is_ui_vm === 'true') {
      return <span className="scan-status not-available">Not Applicable</span>;
    }
    return <ScanStatus status={secret_scan_status} />;
  },
},
{
  Header: 'OS',
  accessor: 'os',
  maxWidth: 60
},
{
  Header: 'k8s cluster',
  accessor: 'kubernetes_cluster_name',
},
{
  Header: 'agent version',
  accessor: 'version',
  maxWidth: 100
},
{
  Header: 'tags',
  accessor: 'tags',
  maxWidth: 100
}];

const processColumns = [{
  Header: 'host',
  accessor: 'host',
},
{
  Header: 'command',
  accessor: 'command',
},
{
  Header: 'pid',
  accessor: 'pid',
}];

const containerColumns = [{
  Header: 'image',
  accessor: 'image',
},
{
  Header: 'state',
  accessor: 'docker_container_state_human',
},
{
  Header: 'vulnerability scan',
  accessor: 'vulnerability_scan_status',
  Cell: ({ original }) => {
    const { vulnerability_scan_status } = original;
    return <ScanStatus status={vulnerability_scan_status} />;
  },
},
{
  Header: 'secrets scan',
  accessor: 'secret_scan_status',
  Cell: ({ original }) => {
    const { secret_scan_status } = original;
    return <ScanStatus status={secret_scan_status} />;
  },
}];

const setNameColumnWidth = (columns, depth, type) => {
  columns.map((column) => {
    if (column.accessor === 'label') {
      column.width = COLUMN_WIDTH - (depth * COLUMN_OFFSET);
      if (type === 'process') {
        column.width += PROCESS_INSET;
      }
    }
    return column;
  });
  return columns;
};

export const getColumnsForType = (type, depth) => {
  const columns = {
    cloud: [...setNameColumnWidth(commonColumnsDefault, depth, type)],
    region: [...setNameColumnWidth(commonColumnsRestOfTable, depth, type)],
    kubernetes_cluster: [...setNameColumnWidth(commonColumnsDefault, depth, type)],
    host: [...setNameColumnWidth(commonColumnsRestOfTable, depth, type), ...hostColumns],
    process: [...setNameColumnWidth(commonColumnsRestOfTable, depth, type), ...processColumns],
    container: [...setNameColumnWidth(commonColumnsRestOfTable, depth, type), ...containerColumns],
  };
  return columns[type];
};

export const getColumnsForTypes = (types, depth) => {
  const columns = [];
  types.forEach(type => columns.push(...getColumnsForType(type, depth)));
  // remove duplicate from array of objects
  const unique = columns.filter((v, i, a) => a.findIndex(t => (t.accessor === v.accessor)) === i);
  return unique;
};

export const addCheckbox = (cols, selections, Cb) => {
  // add checkbox column
  const checkbox = {
    Header: () => '',
    accessor: 'checkbox',
    maxWidth: 40,
    resizable: false,
    Cell: row => (
      <input
        type="checkbox"
        defaultChecked={selections.includes(row.original.id)}
        onChange={() => Cb(row)}
      />
    ),
  };
  return [...cols, checkbox];
};
