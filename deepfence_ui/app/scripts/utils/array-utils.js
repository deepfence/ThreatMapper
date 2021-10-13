/*eslint-disable*/

import { range } from 'lodash';
import {getHostNameWithoutSemicolon} from "./string-utils";
import {TOPOLOGY_ID_FOR_CONTAINER, TOPOLOGY_ID_FOR_HOST} from "../constants/naming";

// NOTE: All the array operations defined here should be non-mutating.

export function uniformSelect(array, size) {
  if (size > array.length) {
    return array;
  }

  return range(size).map(index =>
    array[parseInt(index * (array.length / (size - (1 - 1e-9))), 10)]
  );
}

export function insertElement(array, index, element) {
  return array.slice(0, index).concat([element], array.slice(index));
}

export function removeElement(array, index) {
  return array.slice(0, index).concat(array.slice(index + 1));
}

export function moveElement(array, from, to) {
  if (from === to) {
    return array;
  }
  return insertElement(removeElement(array, from), to, array[from]);
}

export function intersperse(items, value) {
  return [].concat(...items.map(e => [value, e])).slice(1);
}

export function getOrderedData(type, data) {
  const severityOrder = ['critical', 'high', 'medium', 'low', 'info'];
  const anomalyOrder = ['network_anomaly', 'behavioral_anomaly', 'system_audit', 'syscall_anomaly'];
  const resourceOrder = ['processes', 'files', 'network'];
  const result = [];
  if (type === 'severity') {
    severityOrder.forEach((orderedItem) => {
      data.forEach((item) => {
        if (orderedItem === item) {
          result.push(item);
        }
      });
    });
  } else if (type === 'anomaly') {
    anomalyOrder.forEach((orderedItem) => {
      data.forEach((item) => {
        if (orderedItem === item) {
          result.push(item);
        }
      });
    });
  } else if (type === 'resource_type') {
    resourceOrder.forEach(function (item) {
      data.forEach((orderedItem) => {
        if (orderedItem === item) {
          result.push(item);
        }
      });
    });
  }
  return result;
}

export function getLuceneQuery(queryArr) {
  return queryArr.join(' AND ');
}

export function luceneQueryChecker(queryCollection, newQuery) {
  let result;
  if (queryCollection.includes(newQuery)) {
    result = true;
  } else {
    result = false;
  }
  return result;
}

export function updateSearchQueryArr(queryCollection, newQuery) {
  const resultArr = [];
  for (let i = 0; i < queryCollection.length; i += 1) {
    resultArr.push(queryCollection[i]);
  }
  resultArr.push(newQuery);

  return resultArr;
}

export function getObjectKeys(data) {
  return Object.keys(data);
}

export function getUniqueValuesFromObject(containerMap) {
  let result = [];
  let resultantArr;
  for (let container in containerMap) {
    if (result.indexOf(containerMap[container]) === -1 && containerMap[container] != null) {
      result.push(containerMap[container]);
    }
  }
  if (result.length > 0) {
    resultantArr= result;
  } else {
    resultantArr = [];
  }
  return resultantArr;
}

export function getUniqueKeys(details, field) {
  let result = [];
  for (let i=0; i<details.length; i++){
    if (result.indexOf(details[i][field]) === -1){
      result.push(details[i][field]);
    }
  }
  return result;
}

export function getUniqueKeysForHost(details, field) {
  let result = [];
  for (let i=0; i<details.length; i++){
    if (result.indexOf(details[i][field]) === -1){
      result.push(getHostNameWithoutSemicolon(details[i][field]));
    }
  }
  return result;
}

export function getContainersByHost(details, host) {
  let result;
  let containers=[];
  for (let i=0; i<details.length; i++){
    if (details[i].labelMinor == host){
      containers.push(details[i].label);
    }
  }
  if (containers.length > 0) {
    result = containers;
  } else {
    result = [];
  }
  return result;
}

export function getAvailableSeverities(host_collection, topology_id) {
  let result = [];
  if (topology_id == TOPOLOGY_ID_FOR_HOST) {
    const unique_hosts = Object.keys(host_collection);
    for (let host=0; host<unique_hosts.length; host++){
      const host_severity = host_collection[unique_hosts[host]]['severity'];
      if ((result.indexOf(host_severity) === -1) && host_severity != null) {
        result.push(host_severity);
      }
    }
  } else if (topology_id == TOPOLOGY_ID_FOR_CONTAINER){
    const unique_hosts = Object.keys(host_collection);
    for (let host=0; host<unique_hosts.length; host++){
      const host_details = host_collection[unique_hosts[host]]['containers'];
      const unique_containers = Object.keys(host_details);
      for (let container=0; container<unique_containers.length; container++){
        if (result.indexOf(host_details[unique_containers[container]]) === -1 && host_details[unique_containers[container]] != null){
          result.push(host_details[unique_containers[container]]);
        }
      }
    }
  }

  let resultantArr = [];
  result.forEach((option)=> {
    resultantArr.push({name: option});
  });

  return resultantArr;
}

// returns ids of containers according to topologyId.
export function getContainersIds(idsForNodes, allNodes, topologyId) {
 let resultantArr = [];
  for (let i=0; i<idsForNodes.length; i++) {
    for (let j=0; j<allNodes.length; j++) {
      if (topologyId === 'containers') {
        if ((idsForNodes[i].container_name === allNodes[j].label) && (idsForNodes[i].host_name === allNodes[j].labelMinor)) {
          resultantArr.push(allNodes[j].id);
        }
      } else {
        /*if (idsForNodes[i].host_name === allNodes[j].label) {
          resultantArr.push(allNodes[j].id);
        }*/
        if (idsForNodes[i].host_name === getHostNameWithoutSemicolon(allNodes[j].id)) {
          resultantArr.push(allNodes[j].id);
        }
      }
    }
  }

  // If all containers has Internet node, then add it even if it is not present
  // in active containers. Scope doesn't send Internet node in delta.update, which
  // is why it is not preset in active containers.
  for (let i=0; i < allNodes.length; i++) {
    if (allNodes[i].id === "in-theinternet" || allNodes[i].id === "out-theinternet") {
      resultantArr.push(allNodes[i].id);
    }
  }
  return resultantArr;
}

export function getContainersToBeAdded(activeContainersIds, stateContainers) {
  // Take the containers we need to display and the current containers already displayed.
  let resultantArr = [];
  let stateContainersIds = [];
  for (let i=0; i < stateContainers.length; i++) {
    stateContainersIds.push(stateContainers[i]);
  }

  for (let i=0; i < activeContainersIds.length; i++) {
    let containerId = activeContainersIds[i];
    if (stateContainersIds.indexOf(containerId) === -1) {
      resultantArr.push(containerId);
    }
  }

  return resultantArr;
}

export function getContainersToBeRemoved(activeContainersIds, stateContainers) {
  // Take the containers we need to display and the current containers already displayed.
  // Remove any additional containers that are already displayed which are not there in stateContainers.
  let resultantArr = [];
  let stateContainersIds = [];
  for (let i=0; i < stateContainers.length; i++) {
    stateContainersIds.push(stateContainers[i]);
  }

  for (let i=0; i < stateContainersIds.length; i++) {
    let containerId = stateContainersIds[i];
    if (activeContainersIds.indexOf(containerId) === -1) {
      resultantArr.push(containerId);
    }
  }

  if (resultantArr.length === 0) {
    resultantArr = null;
  }
  return resultantArr;
}

export function excludeKeys(obj, excludeKeys) {
  if (!obj) {
    return 
  }
  return Object.keys(obj).filter(key => !(excludeKeys.indexOf(key) > -1)).reduce(
    (acc, key) => {
      return {
        ...acc,
        [key]: obj[key],
      }
    }, {});
}

export function mergeArraysByKey(arr1 = [], arr2 = [], key = '') {
  const union = [...arr1, ...arr2];
  const distinctValueMap = union.reduce((acc, el) => {
    const identity = el[key];
    if (acc[identity]) {
      const value = acc[identity];
      acc[identity] = {
        ...value,
        ...el
      };
    } else {
      acc[identity] = el;
    }
    return acc;
  }, {});
  return Object.keys(distinctValueMap).map(key => distinctValueMap[key]);
}

export const objectValueExtractor = (keyValue = 'value') => (el => el[keyValue] || el);
