import React from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';

import './index.css';
import App from './components/App';
import reducers from './reducers';

const store = createStore(combineReducers(reducers), applyMiddleware(thunk));

createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <App />
  </Provider>
);
