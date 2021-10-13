import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';

import '../styles/main.scss';
import '../images/favicon.ico';
import configureStore from './stores/configureStore.dev';

// installDevTools(Immutable);
const store = configureStore();

function renderApp() {
  const DeepFenceApp = require('./components/app-deepfence').default;
  ReactDOM.render(
    <Provider store={store}>
      <DeepFenceApp />
    </Provider>,
    document.getElementById('app')
  );
}

renderApp();
if (module.hot) {
  module.hot.accept('./components/app-deepfence', renderApp);
}
