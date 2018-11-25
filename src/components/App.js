import React, { Component } from 'react'
import PropTypes from 'prop-types'

import Editor from './Editor';
import '../styles/App.css'
import Toolbar from './Toolbar';

class App extends Component {
  static propTypes = {
    changeText: PropTypes.func.isRequired,
    text: PropTypes.string.isRequired,
  }

  render() {
    return (
      <div className="App">
        <Toolbar />
        <Editor />
      </div>
    );
  }
}

export default App