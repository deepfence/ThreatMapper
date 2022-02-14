/* eslint-disable arrow-body-style */

import React, { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { LiveTopologyGraph } from '../../multi-cloud/LiveTopologyGraph';

import {
  setTopologyGraphAPI,
  topologyFilterAdded,
  topologyFilterRemoved,
  resetTopologyFilter,
  showTopologyPanel,
} from '../../../actions/app-actions';
import { getWebsocketUrl } from '../../../utils/web-api-utils';

export const K8sView = ({ onNodeClicked, showPanelForNode }) => {
  const dispatch = useDispatch();
  const graph = useRef(null);
  const wsURL = `${getWebsocketUrl()}/topology-api`;
  const apiKey = useSelector(state => state.get('userProfile')?.api_key);

  useEffect(() => {
    if (graph.current === null) {
      return;
    }
    dispatch(setTopologyGraphAPI(graph.current));
    return () => dispatch(resetTopologyFilter());
  }, [dispatch, graph.current, apiKey]);

  const onNodeClickedInner = useCallback(
    node => {
      onNodeClicked(node);

      if (showPanelForNode(node)) {
        dispatch(showTopologyPanel(true));
      }
    },
    [onNodeClicked]
  );
  return (
    <div className="nodes-chart">
      {apiKey && (
        <LiveTopologyGraph
          ref={graph}
          apiURL={wsURL}
          apiKey={apiKey}
          refreshInterval="5s"
          onNodeClicked={onNodeClickedInner}
          onFilterAdded={filter => dispatch(topologyFilterAdded(filter))}
          onFilterRemoved={filter => dispatch(topologyFilterRemoved(filter))}
          viewType="kubernetes-clusters"
        />
      )}
    </ div>
  );
};
