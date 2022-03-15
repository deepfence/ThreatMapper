import { Map } from "immutable";
import ActionTypes from "../constants/action-types";

const initialState = Map();

// Server side statuses that are possible
// QUEUED, IN_PROGRESS, COMPLETE, ERROR
// Client side statuses are NEVER_SCANNED and LOADING and STATUS_ERROR
const getProcessedStatusCode = (status) => {
  if (!status) {
    return "NEVER_SCANNED";
  }
  return status;
}

export function SecretScannerReducer(state = initialState, action) {
  switch (action.type) {
    case ActionTypes.SECRET_SCAN_STATUS_REQUEST: {
      const { imageId } = action.input;
      state = state.setIn(['status', imageId, 'loading'], true);
      state = state.setIn(['status', imageId, 'error'], {});
      if (!state.getIn(['status', imageId, 'statusCode'], null)) {
        state = state.setIn(['status', imageId, 'statusCode'], getProcessedStatusCode('LOADING'));
      }
      return state;
    }
    case ActionTypes.SECRET_SCAN_STATUS_SUCCESS: {
      const { imageId } = action.input;
      const holdStatusUpdateTill = state.getIn(['status', imageId, 'holdStatusUpdateTill']);
      if (holdStatusUpdateTill && (holdStatusUpdateTill > new Date().getTime())) {
        return state;
      }
      state = state.setIn(['status', imageId, 'loading'], false);
      state = state.setIn(['status', imageId, 'response'], action.payload.data);
      state = state.setIn(['status', imageId, 'statusCode'], getProcessedStatusCode(action.payload.data?.scan_status));
      return state;
    }
    case ActionTypes.SECRET_SCAN_STATUS_FAILURE: {
      const { imageId } = action.input;
      state = state.setIn(['status', imageId, 'loading'], false);
      state = state.setIn(['status', imageId, 'error'], action.payload.error);
      state = state.setIn(['status', imageId, 'statusCode'], getProcessedStatusCode('STATUS_ERROR'));
      return state;
    }
    case ActionTypes.START_SECRET_SCAN_REQUEST: {
      const { nodeId: imageId } = action.input;
      state = state.setIn(['status', imageId, 'holdStatusUpdateTill'], new Date().getTime() + 5000);
      state = state.setIn(['status', imageId, 'statusCode'], getProcessedStatusCode('QUEUED'));
      return state;
    }
    default: {
      return state;
    }
  }
}
