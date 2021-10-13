/* eslint-disable */
import { ROOT_NODE_ID } from "../../constants/topology-multicloud";
import { funnyTopologyTypeToModelType } from "../multi-cloud/LiveTopologyGraph";
import { getColumnsForType } from "./table-columns";

/* eslint-disable no-restricted-syntax */
export const topologyDataToTableDelta = (data) => {
  const len = (k) => (!data[k] ? 0 : data[k].length);
  if (len('add') === 0 && len('update') === 0 && len('remove') === 0) {
    return null;
  }

  const delta = {};
  const node_delta = (node_id) => {
    if (delta[node_id] === undefined) {
      delta[node_id] = { add: [], update: [], remove: [] };
    }
    return delta[node_id];
  };
  if (data.add) {
    for (const topo_node of data.add) {
      const node = topologyNodeToTableRow(topo_node);
      if (node) {
        let parent_id = topo_node.immediate_parent_id;
        if (parent_id === '') {
          parent_id = ROOT_NODE_ID;
        }
        node_delta(parent_id).add.push(node);
      }
    }
  }

  if (data.update) {
    for (const topo_node of data.update) {
      const node = topologyNodeToTableRow(topo_node);
      if (node) {
        let parent_id = topo_node.immediate_parent_id;
        if (parent_id === '') {
          parent_id = ROOT_NODE_ID;
        }
        node_delta(parent_id).update.push(node);
      }
    }
  }

  if (data.remove) {
    for (const topo_node_id of data.remove) {
      node_delta(ROOT_NODE_ID).remove.push(topo_node_id);
    }
  }

  return delta;
};

const topologyNodeToTableRow = (topo_node) => {
  const model = {};

  if (topo_node.id === undefined) {
    console.error("node doesn't have an id", topo_node);
    return;
  }
  model.id = topo_node.id;
  // this has got to be the worst API I've ever seen!?
  const [id, type] = topo_node.id.split(';', 2);
  topo_node.node_type = funnyTopologyTypeToModelType(type);
  if (topo_node.node_type == undefined) {
    if (type) {
        topo_node.node_type = 'process';
      if (topo_node.label === undefined) {
        console.warn("process doesn't have a label", model);
        return;
      }
    } else {
      return;
    }
  }

    // for hosts also add is_ui_vm
    if (topo_node.node_type === 'host') {
      const is_ui_vm = topo_node.metadata.find(m => m.id === 'is_ui_vm');
      model.is_ui_vm = is_ui_vm ? is_ui_vm.value : false;
    }

  const columns = getColumnsForType(topo_node.node_type);
  for (const column of columns) {
    model[column.accessor] = nodeToColumn(topo_node, column.accessor) || '';
  }
  return model;
};

const nodeToColumn = (topo_node, column) => {
  let columnValue = topo_node[column];
  if (columnValue === undefined && topo_node.metadata) {
    columnValue = topo_node.metadata.find(m => m.id === column);
    if (columnValue) {
      columnValue = columnValue.value;
    }
  }
  return columnValue;
}

export const nodeListWithType = (nodeIdList = []) => {
  const nodeListObject = {};
  for (const nodeId of nodeIdList) {
    const [id, type] = nodeId.split(';', 2);
    const node_type = funnyTopologyTypeToModelType(type);
    if (nodeListObject[node_type]) {
      nodeListObject[node_type] = [...nodeListObject[node_type], nodeId];
    } else {
      nodeListObject[node_type] = [nodeId];
    }
  }
  return nodeListObject;
};
