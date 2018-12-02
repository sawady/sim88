import React, { Component } from 'react'

import Editor from './Editor';
import Machine from './Machine';

import '../styles/App.css'
import Toolbar from './Toolbar';

class App extends Component {
  render() {
    return (
      <div className="app">
        <Toolbar />
        <div className="main">
          <Editor />
          <Machine />
        </div>
      </div>
    );
  }
}

export default App