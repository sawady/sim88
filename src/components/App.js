import React, { Component } from 'react'
import PropTypes from 'prop-types'

import Editor from './Editor';
import Result from './Result';
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
        <div className="Below">
          <Editor />
          <Result />
        </div>
      </div>
    );
  }
}

export default App