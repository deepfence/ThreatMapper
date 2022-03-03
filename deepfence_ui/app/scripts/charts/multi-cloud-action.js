import { fromJS, Map } from 'immutable';
import React from 'react';
import { scanRegistryImagesAction, toaster } from '../actions/app-actions';
import { nodeListWithType } from '../components/multi-cloud-table/utils';
import { NodeActionModal } from './node-action-modal';

const actionOptionsIndex = fromJS({
  start_vulnerability_scan: {
    label: 'Start vulnerability scan',
    onClick: (param, triggerModal) => triggerCVEScanModal(param, triggerModal),
    enabled: false,
  },
  stop_vulnerability_scan: {
    label: 'Stop vulnerability scan',
    onClick: (param, triggerModal, dispatch) =>
      triggerStopCVEScanModal(param, triggerModal, dispatch),
    enabled: false,
  },
  start_secrets_scan: {
    label: 'Start secrets scan',
    onClick: (param, triggerModal, dispatch) =>
      triggerStartSecretsScanModal(param, triggerModal, dispatch),
    enabled: false,
  },
});

const actionOptionsByType = {
  host: ['start_vulnerability_scan', 'stop_vulnerability_scan', 'start_secrets_scan'],
  container: ['start_vulnerability_scan', 'stop_vulnerability_scan', 'start_secrets_scan'],
  container_image: ['start_vulnerability_scan', 'stop_vulnerability_scan', 'start_secrets_scan'],
};

const getIntersection = (array1, array2) =>
  array1.filter(value => array2.includes(value)) || [];

export const actionDropdownOptions = node_types => {
  if (node_types.length === 0) {
    return Object.values(actionOptionsIndex.toJS());
  }
  let actionOptionsIndex_copy = actionOptionsIndex;
  // get intersection of all node types
  const base = node_types[0];
  let intersection = actionOptionsByType[base] || [];
  node_types.map(node_type => {
    intersection = getIntersection(
      intersection,
      actionOptionsByType[node_type] || []
    );
    return intersection;
  });

  // eslint-disable-next-line no-unused-vars
  for (const actionName of intersection) {
    actionOptionsIndex_copy = actionOptionsIndex_copy.set(actionName, {
      ...actionOptionsIndex_copy.get(actionName).toJS(),
      enabled: true,
    });
  }
  return Object.values(actionOptionsIndex_copy.toJS());
};

const renderModalContent = props => {
  const { selectedDocIndex = {}, isCVE = false } = props;

  const resetSelection = false;
  return (
    <NodeActionModal
      selectedDocIndex={selectedDocIndex} // ['cos-vm:<host>',]
      resetSelection={resetSelection}
      isCVE={isCVE}
    />
  );
};

export const triggerCVEScanModal = (selectedDocIndex, triggerModal) => {
  const isCVE = true;
  const modalProps = {
    title: 'Vulnerability Scan',
    modalContent: renderModalContent,
    modalContentProps: {
      selectedDocIndex,
      isCVE,
    },
    contentStyles: {
      width: '400px',
    },
  };
  return triggerModal('GENERIC_MODAL', modalProps);
};

const triggerStopCVEScanModal = (selectedDocIndex, triggerModal, dispatch) => {
  const modalProps = {
    dialogTitle: 'Stop Vulnerability Scan',
    dialogBody:
      'This will only stop the scans that are in queued state. It will not stop scans that are currently running. Do you want to continue ?',
    confirmButtonText: 'Yes',
    cancelButtonText: 'No',
    onConfirmButtonClick: paramsIm =>
      bulkStopCVEScan(selectedDocIndex, paramsIm, dispatch),
  };
  return triggerModal('DIALOG_MODAL', modalProps);
};

const triggerStartSecretsScanModal = (selectedDocIndex, triggerModal, dispatch) => {
  const modalProps = {
    dialogTitle: 'Start Secrets Scan',
    dialogBody:
      'Start secrets scan on all selected nodes?',
    confirmButtonText: 'Start Scan',
    cancelButtonText: 'Cancel',
    onConfirmButtonClick: () =>
      bulkStartSecretsScan(selectedDocIndex, dispatch),
  };
  return triggerModal('DIALOG_MODAL', modalProps);
};

const bulkStartSecretsScan = async (selectedDocIndex, dispatch) => {
  const nodeListObject = nodeListWithType(selectedDocIndex);
  let successCount = 0;
  let errorCount = 0;
  // eslint-disable-next-line no-unused-vars
  for (const [node_type, node_id_list] of Object.entries(nodeListObject)) {
    const apiParams = {
      action: 'secret_scan_start',
      node_type,
      node_id_list,
    };
    try{
      // eslint-disable-next-line no-await-in-loop
      const response = await dispatch(scanRegistryImagesAction(apiParams));
      const { success } = response;
      if (success) {
        successCount += node_id_list.length;
      } else {
        errorCount += node_id_list.length;
      }
    } catch (e) {
      errorCount += node_id_list.length;
    }
  }
  dispatch(toaster(`Request to start secrets scan on ${successCount} nodes queued successfully${errorCount ? ` , failed on ${errorCount} nodes.` : '.'}`));
}

const bulkStopCVEScan = async (selectedDocIndex = [], paramsIm = Map(), dispatch) => {
  const params = paramsIm.toJS();
  const nodeListObject = nodeListWithType(selectedDocIndex);
  let successCount = 0;
  let errorCount = 0;
  // eslint-disable-next-line no-unused-vars
  for (const [node_type, node_id_list] of Object.entries(nodeListObject)) {
    const apiParams = {
      action: 'cve_scan_stop',
      node_type,
      node_id_list,
      action_args: {
        ...params,
      },
    };
    try{
      // eslint-disable-next-line no-await-in-loop
      const response = await dispatch(scanRegistryImagesAction(apiParams));
      const { success } = response;
      if (success) {
        successCount += node_id_list.length;
      } else {
        errorCount += node_id_list.length;
      }
    } catch (e) {
      errorCount += node_id_list.length;
    }
  }
  dispatch(toaster(`Request to stop vulnerability scan on ${successCount} nodes queued successfully${errorCount ? ` , failed on ${errorCount} nodes.` : '.'}`));
};
