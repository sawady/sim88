import React, { Component } from 'react'
import { connect } from 'react-redux'

import Memory from './Memory'

import '../styles/Machine.css'

class Result extends Component {

  render() {
    return (
      <div className="machine">
        <Memory memory={['11FC','1FFD','1FFE','1FFF','2000','2001','2002','2003','2004']} active={3} />
        <div>
          RESULTADO:
          {JSON.stringify(this.props.result)}
        </div>
        <div>
          ERROR:
          {this.props.error}
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
