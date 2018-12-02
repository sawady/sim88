import React, { Component } from 'react'
import { connect } from 'react-redux'

import CPU from './CPU'
import Memory from './Memory'

import '../styles/Machine.css'

class Result extends Component {

  render() {
    return (
      <div className="machine">
        <div className="layout">
          <CPU />
          <Memory />
        </div>
        <div className="layout">
        <div>
          RESULTADO:
          {JSON.stringify(this.props.ast)}
        </div>
        <div>
          ERROR:
          {this.props.error}
        </div>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    ast: state.ast.ast,
    error: state.ast.error
  })
)(Result)
