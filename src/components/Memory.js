import React, { Component } from 'react'
import { connect } from 'react-redux'

import '../styles/Memory.css'

const scrollWithOffset = (value) => value < 5 ? value : value - 5;

class Memory extends Component {

  componentDidMount() {
    this.refs.cell.scrollIntoView(false);
  }

  componentWillReceiveProps(props) {
    if (this.componentWillReceiveProps.IP !== props.IP) {
      this.refs.cell.scrollIntoView(false);
    }
  }

  renderCell = (IP) => cell =>
    <div
      key={cell.dir}
      ref={scrollWithOffset(cell.dir) === this.props.IP.value ? 'cell' : undefined}
      className={cell.dir === IP.value ? "cell active" : "cell"}
    >
      <div className="dir">{cell.renderDir()}</div>
      <div className="value">{cell.renderValue()}</div>
    </div>

  render() {
    const { memory, IP } = this.props;

    return (
      <div className="memory frame">
        <div className="title">
          <span>Memory</span>
        </div>
        {
          memory.map(this.renderCell(IP))
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
