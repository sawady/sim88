import React, { Component } from 'react'
import { connect } from 'react-redux'

import CPU from './CPU'
import Memory from './Memory'

import _find from 'lodash/find'

import '../styles/Machine.css'

class Result extends Component {

  render() {
    return (
      <div className="machine">
        <div className="velocity">
          Velocidad: {this.props.velocity}ms
        </div>
        <div className="layout">
          <CPU />
          <Memory />
        </div>
        <div>
          <div>
            <span>RESULTADO AST:</span>
            {JSON.stringify(this.props.ast)}
          </div>
          <div>
            <span>RESULTADO COMPILED:</span>
            {
              JSON.stringify(
                _find(
                  this.props.compiledProgram,
                  x => x.line === this.props.ast.line
                )
              )
            }
          </div>
          <div>
            {
              this.props.error &&
              <React.Fragment>
                <span>ERROR: </span>
                {this.props.error}
              </React.Fragment>
            }
          </div>
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    ast: state.editor.ast,
    currentLine: state.editor.line,
    error: state.editor.error,
    compiledProgram: state.machine.compiledProgram,
    velocity: state.machine.velocity,
  })
)(Result)
