import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { MultiCloudTreeTable } from "../../multi-cloud-table/multi-cloud-table"
import { DfDropDownMenu } from "../../common/df-dropdown";
import { actionDropdownOptions } from "../../../charts/multi-cloud-action"
import { funnyTopologyTypeToModelType } from "../../multi-cloud/LiveTopologyGraph";
import injectModalTrigger from "../../common/generic-modal/modal-trigger-hoc";
import { getWebsocketUrl } from '../../../utils/web-api-utils';


export const K8sTableView = injectModalTrigger(({onNodeClicked, triggerModal}) => {
  const dispatch = useDispatch();
  const wsURL = `${getWebsocketUrl()}/topology-api`;
  const [showActions, setShowAction] = useState(false);
  const [items, setShowItems] = useState([]);
  const [options, setOptions] = useState([]);
  const apiKey = useSelector(state => state.get('userProfile')?.api_key);

  const setAction = (items) => {
    const node_types = [];
    items.forEach(item => {
      const type = item.split(';', 2)[1];
      node_types.push(funnyTopologyTypeToModelType(type));
    });
    if(items.length > 0) {
      setShowAction(true);
    }
    setShowItems(items);
    setOptions(actionDropdownOptions(node_types))
  }

  return (
    <div className="nodes-grid">
      {apiKey && (
        <div>
          <div className="multiselect-actions">
            <DfDropDownMenu
              selectedObjectIndex={items}
              options={options}
              label="Actions"
              triggerModal={triggerModal}
              alignment="right"
              dispatch={dispatch}
              disabled={!showActions}
            />
          </div>
          <MultiCloudTreeTable
            apiURL={wsURL}
            apiKey={apiKey}
            refreshInterval="5s"
            onNodeClicked={onNodeClicked}
            setAction={setAction}
            viewType="kubernetes-clusters"
          />
        </div>
      )}
    </div>
  );
})