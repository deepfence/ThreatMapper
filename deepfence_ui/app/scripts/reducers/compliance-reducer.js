import {
  Map
} from 'immutable';
import ActionTypes from '../constants/action-types';
import {
  excludeKeys,
} from '../utils/array-utils';

function ComplianceListViewReducer(state = Map(), action) {
  const {
    nodeId,
    checkType,
  } = action.input || {};
  switch (action.type) {
    case ActionTypes.COMPLIANCE_TEST_REMOVE: {
      const testIdList = action.payload;
      const currentIndex = state.getIn([nodeId, checkType, 'index']);
      const newIndex = excludeKeys(currentIndex, testIdList);
      state = state.setIn([nodeId, checkType, 'index'], newIndex);
      return state;
    }
    default:
      return state;
  }
}

const initialState = Map();

function ComplianceReducer(state = initialState, action) {
  const {
    checkType
  } = action.input || {};
  switch (action.type) {
    //
    case ActionTypes.GET_COMPLIANCE_TESTS_SUCCESS: {
      const {
        payload: {
          data: {
            rules = [],
          } = {},
        } = {},
      } = action;
      state = state.setIn(['compliance_tests', 'data', checkType], rules);
      return state;
    }
    //
    case ActionTypes.UPDATE_COMPLIANCE_TESTS_REQUEST: {
      state = state.deleteIn(['compliance_tests', 'error', checkType]);
      state = state.deleteIn(['compliance_tests', 'info', checkType]);
      return state;
    }
    //
    case ActionTypes.UPDATE_COMPLIANCE_TESTS_SUCCESS: {
      const {
        payload: {
          error,
          success,
        }
      } = action;
      if (error) {
        const errorMessage = error.message;
        state = state.setIn(['compliance_tests', 'error', checkType], `ERROR: ${errorMessage}`);
      }
      if (success) {
        state = state.setIn(['compliance_tests', 'info', checkType], 'Compliance controls updated successfuly');
      }
      return state;
    }
    //
    case ActionTypes.UPDATE_COMPLIANCE_TESTS_FAILURE: {
      state = state.setIn(['compliance_tests', 'error', checkType], 'Something went wrong while updating rules');
      return state;
    }
    default: {
      const currentListViewState = state.get('list_view');
      state = state.set('list_view', ComplianceListViewReducer(currentListViewState, action));

      return state;
    }
  }
}

export default ComplianceReducer;
