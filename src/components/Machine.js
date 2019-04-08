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
            <span>RESULTADO:</span>
            {JSON.stringify(this.props.ast)}
          </div>
          <div>
            <span>ERROR:</span>
            {this.props.error}
          </div>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    ast: state.editor.ast,
    error: state.editor.error
  })
)(Result)
