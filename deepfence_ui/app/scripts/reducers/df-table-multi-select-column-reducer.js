import { Map } from 'immutable';
import ActionTypes from '../constants/action-types';

function DFTableMultiSelectColumnReducer(state = Map(), action) {
  switch (action.type) {
    case ActionTypes.SET_ROW_SELECTION: {
      const name = action.input;
      state = state.setIn([name, 'selectedRowIndex'], action.payload);
      return state;
    }
    case ActionTypes.RESET_SELECTION: {
      const name = action.input;
      state = state.removeIn([name, 'selectedRowIndex']);
      return state;
    }
    default:
      return state;
  }
}

export default DFTableMultiSelectColumnReducer;
