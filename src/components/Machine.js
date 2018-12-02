import React, { Component } from 'react'
import { connect } from 'react-redux'

import CPU from './CPU'
import Memory from './Memory'

import '../styles/Machine.css'

class Result extends Component {

  render() {
    return (
      <div className="machine">
        <div className="top">
          <CPU />
          <Memory memory={['11FC', '1FFD', '1FFE', '1FFF', '2000', '2001', '2002', '2003', '2004']} active={3} />
        </div>
        <div className="bottom">
        <div>
          RESULTADO:
          {JSON.stringify(this.props.result)}
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
    result: state.result.result,
    error: state.result.error
  })
)(Result)
