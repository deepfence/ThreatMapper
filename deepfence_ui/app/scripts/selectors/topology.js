import { createSelector } from 'reselect';

import { GRAPH_VIEW_MODE, TABLE_VIEW_MODE } from '../constants/naming';

export const isGraphViewModeSelector = createSelector(
  [state => state.get('topologyViewMode')],
  viewMode => viewMode === GRAPH_VIEW_MODE
);

export const isTableViewModeSelector = createSelector(
  [state => state.get('topologyViewMode')],
  viewMode => viewMode === TABLE_VIEW_MODE
);
