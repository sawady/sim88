import React, { Component } from 'react'
import { connect } from 'react-redux'

import '../styles/Memory.css'

const scrollWithOffset = (value) => value < 5 ? value : value - 5;

class Memory extends Component {

  componentDidMount() {
    document.getElementById(`cell-${scrollWithOffset(this.props.IP.value)}`).scrollIntoView();
  }

  render() {
    const { memory, IP } = this.props;

    return (
      <div className="memory frame">
        <div className="title">
          Memoria
        </div>
        {
          memory.cells.map(
            cell =>
              <div key={cell.dir} id={`cell-${cell.dir}`} className={cell.dir === IP.value ? "cell active" : "cell"}>
                <div className="dir">{cell.renderDir()}</div>
                <div className="value">{cell.renderValue()}</div>
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
