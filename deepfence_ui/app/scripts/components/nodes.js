import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import NodesChart from '../charts/nodes-chart';
import { NodesGrid } from '../charts/nodes-grid';
import { setTopologyClickedNode } from '../actions/app-actions';
import { GRAPH_VIEW_MODE } from '../constants/naming';

export const Nodes = () => {
  const dispatch = useDispatch();

  const onNodeClicked = useCallback(node => {
    dispatch(setTopologyClickedNode(node));
  }, []);

  const isGraphView = useSelector(
    state => state.get('topologyViewMode') === GRAPH_VIEW_MODE
  );

  return (
    <div>
      {isGraphView ? (
        <NodesChart onNodeClicked={onNodeClicked} />
      ) : (
        <NodesGrid onNodeClicked={onNodeClicked} />
      )}
    </div>
  );
};
