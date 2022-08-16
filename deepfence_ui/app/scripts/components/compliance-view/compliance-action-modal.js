/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */
/* eslint-disable max-len */
import React from 'react';
import { useDispatch } from 'react-redux';
import {
  scanRegistryImagesAction,
} from '../../actions/app-actions';
import ComplianceCheckForm from './compliance-check-form-bulk-start';
import { nodeListWithType } from '../multi-cloud-table/utils';

export const ComplianceActionModal = ({resetSelection, isCVE}) => {
  const dispatch = useDispatch();

  const startBulkComplianceScan = (params) => {
    const nodeListObject = nodeListWithType(params.selectedDocIndex);
    const complianceChecktypeList = Object.keys(params.selectedChecktypes).filter(el => params.selectedChecktypes[el] === true);
    let apiAction = 'start_compliance_scan';
    let actionArgs = {
      compliance_check_type: complianceChecktypeList,
      resources: [],
    };
    if (params.scheduleInterval) {
      apiAction = 'schedule_compliance_scan';
      actionArgs = {
        cron: `0 0 */${params.scheduleInterval} * *`,
        compliance_check_type: complianceChecktypeList,
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
  const showComplianceForm = !isCVE;
  return (
    <div className="node-action-modal">
      {showComplianceForm && (
        <ComplianceCheckForm
          onSubmit={(selectedChecktypesIm) => {
            const formValues = selectedChecktypesIm.toJS();
            const {
              scheduleInterval,
              ...selectedChecktypes
            } = formValues;
            const params = {
              resetSelection,
              selectedChecktypes,
              scheduleInterval,
            };
            startBulkComplianceScan(params);
          }}
        />
      )}
    </div>
  );
};
