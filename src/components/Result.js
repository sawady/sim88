import React, { Component } from 'react'
import { connect } from 'react-redux'

import '../styles/Result.css'

class Result extends Component {
  render() {
    return (
      <div className="Result">
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
