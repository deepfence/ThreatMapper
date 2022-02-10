/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
import React from 'react';
import { useDispatch } from 'react-redux';
import {
  scanRegistryImagesAction,
} from '../actions/app-actions';
import CVEScanForm from '../components/vulnerability-view/registry-scan/cve-scan-form';
import { nodeListWithType } from '../components/multi-cloud-table/utils';

export const NodeActionModal = ({selectedDocIndex = {}, resetSelection, isCVE}) => {
  const dispatch = useDispatch();

  const startBulkCVEScan = (params) => {
    const { priority } = params;
    const priorityValueCheck = !!(priority && priority.length > 0);
    const nodeListObject = nodeListWithType(params.selectedDocIndex);

    let apiAction = 'cve_scan_start';
    let actionArgs = {
      priority: priorityValueCheck,
      scan_type: params.scanType,
      resources: [],
    };
    if (params.scheduleInterval) {
      apiAction = 'schedule_vulnerability_scan';
      actionArgs = {
        cron: `0 0 */${params.scheduleInterval} * *`,
        priority: priorityValueCheck,
        scan_type: params.scanType,
        resources: [],
      };
    }

    let promise = new Promise(() => {});
    for (const [node_type, node_id_list] of Object.entries(nodeListObject)) {
      const apiParams = {
        action: apiAction,
        node_type,
        node_id_list,
        action_args: actionArgs,
      };

      promise = dispatch(scanRegistryImagesAction(apiParams));
    }
    return promise;
  };

  const showCVEForm = isCVE;
  return (
    <div className="node-action-modal">
      {showCVEForm && (
        <CVEScanForm
          onSubmit={(valuesIm) => {
            const {
              scanType,
              scheduleInterval,
              priority
            } = valuesIm.toJS();
            const params = {
              selectedDocIndex,
              resetSelection,
              scanType,
              scheduleInterval,
              priority
            };
            startBulkCVEScan(params);
          }}
          />
      )}
    </div>
  );
};
