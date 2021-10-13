import {Map} from 'immutable';
import ActionTypes from '../constants/action-types';

const initialState = Map();
const ReportDownloadReducer = (state = initialState, action) => {
  switch (action.type) {
    case ActionTypes.REPORT_DOWNLOAD_REQUEST: {
      state = state.set('loading', true);
      return state;
    }

    case ActionTypes.REPORT_DOWNLOAD_SUCCESS: {
      state = state.set('loading', false);
      return state;
    }

    case ActionTypes.REPORT_DOWNLOAD_FAILURE: {
      state = state.set('loading', false);
      state = state.set('info', 'Report download failed');
      return state;
    }

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

    case ActionTypes.XLSX_REPORT_DOWNLOAD_REQUEST: {
      state = state.setIn(['xlsx', 'loading'], true);
      state = state.deleteIn(['xlsx', 'info']);
      return state;
    }

    case ActionTypes.XLSX_REPORT_DOWNLOAD_SUCCESS: {
      state = state.setIn(['xlsx', 'loading'], false);
      return state;
    }

    case ActionTypes.XLSX_REPORT_DOWNLOAD_FAILURE: {
      state = state.setIn(['xlsx', 'loading'], false);
      state = state.setIn(['xlsx', 'info'], 'Report download failed');
      return state;
    }

    case ActionTypes.XLSX_EMAIL_SCHEDULE_REQUEST: {
      state = state.setIn(['xlsx', 'loading'], true);
      state = state.deleteIn(['xlsx', 'info']);
      return state;
    }

    case ActionTypes.XLSX_EMAIL_SCHEDULE_SUCCESS: {
      state = state.setIn(['xlsx', 'loading'], false);
      state = state.setIn(['xlsx', 'info'], 'Schedule for email reports set successfully');
      return state;
    }

    case ActionTypes.XLSX_EMAIL_SCHEDULE_FAILURE: {
      state = state.setIn(['xlsx', 'loading'], false);
      state = state.setIn(['xlsx', 'info'], 'Error in scheduling email reports');
      return state;
    }

    case ActionTypes.XLSX_CLEAR_FORM_INFO_MESSAGE: {
      state = state.setIn(['xlsx', 'loading'], false);
      state = state.setIn(['xlsx', 'info'], '');
      return state;
    }

    default: {
      return state;
    }
  }
};

export default ReportDownloadReducer;
