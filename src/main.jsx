import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';

import './index.css';
import App from './components/App';
import reducers from './reducers';
import { persistProgram } from './actions/editor';

const store = createStore(combineReducers(reducers), applyMiddleware(thunk));
persistProgram(store);

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
);
