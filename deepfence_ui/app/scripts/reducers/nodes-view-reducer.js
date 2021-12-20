import {Map} from 'immutable';
import ActionTypes from '../constants/action-types';

const initialState = Map();

function topologyNodesReducer(state = initialState, action) {
  switch (action.type) {
    case ActionTypes.ENUMERATE_NODES_REQUEST: {
      const {
        input: {
          initiatedByPollable,
        }
      } = action;
      if (!initiatedByPollable) {
        state = state.set('loading', true);
      }
      return state;
    }
    case ActionTypes.ENUMERATE_NODES_SUCCESS: {
      const {
        payload: {
          data: {
            data: nodes = [],
            total,
          } = {},
        } = {},
        input: {
          filters: {
            type: topologyNodeType,
          } = {},
        } = {},
      } = action;
      state = state.set('loading', false);
      state = state.setIn([topologyNodeType, 'data'], nodes);
      state = state.setIn([topologyNodeType, 'total'], total);
      return state;
    }
    default:
      return state;
  }
}

function topologyFiltersReducer(state = initialState, action) {
  switch (action.type) {
    case ActionTypes.ENUMERATE_FILTERS_SUCCESS: {
      const {
        payload: {
          data: {
            filters = [],
          } = {},
        } = {},
        input: {
          node_type: nodeType,
          resource_type: resourceType,
          formId
        },
      } = action;
      const type = resourceType || nodeType;
      if (formId) {
        state = state.setIn([type, formId], filters);
      } else {
        state = state.setIn([type], filters);
      }
      return state;
    }
    default:
      return state;
  }
}

const combineState = (currentGlobalState, reducerName, reducerFunc, action) => {
  const currentReducerState = currentGlobalState.get(reducerName);
  const newReducerState = reducerFunc(currentReducerState, action);
  const newGlobalState = currentGlobalState.set(reducerName, newReducerState);
  return newGlobalState;
};

function nodesViewReducer(state = initialState, action) {
  switch (action.type) {
    case ActionTypes.TOP_AFFECTED_NODES_REQUEST: {
      state = state.setIn(['top_affected_nodes', 'loading'], true);
      return state;
    }

    case ActionTypes.TOP_AFFECTED_NODES_SUCCESS: {
      state = state.setIn(['top_affected_nodes', 'loading'], false);
      const {
        payload: {
          data,
        } = {}
      } = action;
      state = state.setIn(['top_affected_nodes', 'data'], data);
      return state;
    }
    case ActionTypes.TOP_AFFECTED_NODES_FAILURE: {
      state = state.setIn(['top_affected_nodes', 'loading'], false);
      return state;
    }

    case ActionTypes.TOP_AFFECTED_NODES_CHART_REQUEST: {
      state = state.setIn(['top_affected_nodes_chart', 'loading'], true);
      return state;
    }

    case ActionTypes.TOP_AFFECTED_NODES_CHART_SUCCESS: {
      state = state.setIn(['top_affected_nodes_chart', 'loading'], false);
      const {
        payload: {
          data,
        } = {}
      } = action;
      state = state.setIn(['top_affected_nodes_chart', 'data'], data);
      return state;
    }
    case ActionTypes.TOP_AFFECTED_NODES_CHART_FAILURE: {
      state = state.setIn(['top_affected_nodes_chart', 'loading'], false);
      return state;
    }
    default: {
      const currentTopologyFiltersState = state.get('topologyFilters');
      state = state.set('topologyFilters', topologyFiltersReducer(
        currentTopologyFiltersState, action
      ));

      state = combineState(state, 'topologyNodes', topologyNodesReducer, action);

      return state;
    }
  }
}

export default nodesViewReducer;
