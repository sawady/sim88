import React, { Component } from 'react'
import PropTypes from 'prop-types'

import Editor from './Editor';
import Machine from './Machine';

import '../styles/App.css'
import Toolbar from './Toolbar';

class App extends Component {
  render() {
    return (
      <div className="app">
        <Toolbar />
        <div className="below">
          <Editor />
          <Machine />
        </div>
      </div>
    );
  }
}

export default App