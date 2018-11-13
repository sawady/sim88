import React, { Component } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'

import { changeText } from '../actions/text'

import logo from '../images/logo.svg'
import '../styles/App.css'

class App extends Component {

  static propTypes = {
    changeText: PropTypes.func.isRequired,
    text: PropTypes.string.isRequired,
  }

  render() {
    const { text, changeText } = this.props;
    return (
      <div className="App">
        <header className="App-header">
          <img src={logo} className="App-logo" alt="logo" />
          <h1 className="App-title">Welcome to NW.js React</h1>
        </header>
        <p className="App-intro">
          To get started, edit <code>src/App.js</code> and save to reload.
        </p>
        <p className="App-intro">
          I render this {text}
        </p>
        <button onClick={() => changeText('good bye')}>Click me</button>
      </div>
    );
  }
}

export default connect(
  state => ({
    text: state.text.text
  }),
  dispatch => ({
    changeText: text => dispatch(changeText(text))
  })
)(App)
