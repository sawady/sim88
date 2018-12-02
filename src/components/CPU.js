import React, { Component } from 'react'
import { connect } from 'react-redux'

import '../styles/CPU.css'

class CPU extends Component {

  renderRegister = reg => (
    <div key={reg.name} className="register">
      <div className="name">{reg.name}</div>
      <div className="values">
        <div className="value">{reg.value.L}</div>
        <div className="value">{reg.value.H}</div>
      </div>
    </div>
  )

  renderALU = () => (
    <div className="alu bluebox">
      <div className="title">
        ALU
    </div>
      {
        this.props.ALU.map(this.renderRegister)
      }
    </div>
  )

  renderFlags = () => (
    <div className="flags">
      {
        this.props.flags.map(
          flag =>
            <div key={flag.name} className={flag.value ? "on flag" : "off flag"}>
              {
                flag.name
              }
            </div>
        )
      }
    </div>
  )

  renderRegisters = () => (
    <div className="bluebox">
      {
        this.props.registers.map(this.renderRegister)
      }
    </div>
  )

  renderIP = () => (
    <div className="register">
      <div className="name">IP</div>
      <div className="values">
        <div className="value">{this.props.IP.L}</div>
        <div className="value">{this.props.IP.H}</div>
      </div>
    </div>
  );

  renderSP = () => (
    <div className="register">
      <div className="name">SP</div>
      <div className="values">
        <div className="value">{this.props.SP.L}</div>
        <div className="value">{this.props.SP.H}</div>
      </div>
    </div>
  )

  renderIR = () => (
    <div className="register ir">
      <div className="name">IR</div>
      <div className="values">
        <div className="value">{this.props.IR}</div>
      </div>
    </div>
  )

  renderOrders = () => (
    <div className="redbox orders">
      μORDENES
    </div>
  )

  renderDecoder = () => (
    <div className="redbox decoder">
      <div className="title">
        DECODIFICADOR
    </div>
      <div className="value">
        {this.props.decoder}
      </div>
    </div>
  )

  renderSequencer = () => (
    <div className="redbox sequencer">
      <div className="title">
        SECUENCIADOR
      </div>
    </div>
  )

  render() {
    return (
      <div className="frame cpu">
        <div className="title">
          CPU
        </div>
        <div className="layout">
          {this.renderALU()}
          {this.renderRegisters()}
        </div>
        <div className="layout">
          {this.renderFlags()}
        </div>
        <div className="layout">
          {this.renderIR()}
          <div className="pointers">
            {this.renderIP()}
            {this.renderSP()}
          </div>
        </div>
        <div className="layout">
          {this.renderDecoder()}
          {this.renderOrders()}
        </div>
        <div className="layout">
          {this.renderSequencer()}
        </div>
      </div>
    )
  }
}

export default connect(
  state => ({
    ALU: state.machine.ALU,
    flags: state.machine.flags,
    registers: state.machine.registers,
    IP: state.machine.IP,
    SP: state.machine.SP,
    IR: state.machine.IR,
    decoder: state.machine.decoder,
  })
)(CPU)
