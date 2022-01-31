import {Map} from 'immutable';
import ActionTypes from '../constants/action-types';

const initialState = Map();
const ReportDownloadReducer = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.VULNERABILITY_CSV_DOWNLOAD_REQUEST: {
      state = state.setIn(['cve', 'loading'], true);
      return state;
    }

    case ActionTypes.VULNERABILITY_CSV_DOWNLOAD_SUCCESS: {
      state = state.setIn(['cve', 'loading'], false);
      return state;
    }

    case ActionTypes.VULNERABILITY_CSV_DOWNLOAD_FAILURE: {
      state = state.setIn(['cve', 'loading'], false);
      state = state.setIn(['cve', 'info'], 'Report download failed');
      return state;
    }

    default: {
      return state;
    }
  }
};

export default ReportDownloadReducer;
