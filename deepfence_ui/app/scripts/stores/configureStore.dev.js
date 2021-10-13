import { createStore, applyMiddleware } from 'redux';
import { composeWithDevTools } from 'redux-devtools-extension';
import thunkMiddleware from 'redux-thunk';

import { initialState, rootReducer } from '../reducers/root';

export default function configureStore() {
  const store = createStore(
    rootReducer,
    initialState,
    composeWithDevTools(applyMiddleware(thunkMiddleware))
  );

  if (module.hot) {
    // Enable Webpack hot module replacement for reducers
    module.hot.accept('../reducers/root', () => {
      const nextRootReducer = require('../reducers/root').default;
      store.replaceReducer(nextRootReducer);
    });
  }

  return store;
}
