import React, { Component } from 'react'
import { connect } from 'react-redux'

import '../styles/Memory.css'

class Memory extends Component {

  render() {
    return (
      <div className="memory frame">
        <div className="title">
          Memoria
        </div>
        {
          this.props.memory.map(
            cell =>
              <div key={cell.dir} className={cell.dir === this.props.IP.L + this.props.IP.H ? "cell active" : "cell"}>
                <div className="dir">{cell.dir}</div>
                <div className="value">{cell.value}</div>
              </div>
          )
        }
      </div>
    )
  }
}

export default connect(
  state => ({
    memory: state.machine.memory,
    IP: state.machine.IP
  })
)(Memory)
