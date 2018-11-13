import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './components/App';
import registerServiceWorker from './registerServiceWorker';

import { Provider } from 'react-redux';
import { createStore } from 'redux';
import { combineReducers } from 'redux';
import reducers from './reducers';

const store = createStore(
  combineReducers(reducers),
);

const render = Component =>
  ReactDOM.render(
    <Provider store={store}>
      <Component />
    </Provider>
    ,
    document.getElementById('root')
  );

render(App);
if (module.hot) module.hot.accept('./components/App', () => render(App));
registerServiceWorker();
