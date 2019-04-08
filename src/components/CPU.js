import React, { Component } from 'react'
import { connect } from 'react-redux'

import classNames from 'classnames';

import { renderRegister } from '../model/machine';

import '../styles/CPU.css'

class CPU extends Component {

  registerClass = (activeComponent, reg) => classNames('register', {
    active: activeComponent === reg,
  })

  renderRegister = (reg) => {
    const { activeComponent } = this.props;
    const r = renderRegister(reg);
    return (
      <div key={reg.name} className={this.registerClass(activeComponent, reg.name)}>
        <div className="name">{r.name}</div>
        <div className="values">
          <div className="value">{r.L}</div>
          <div className="value">{r.H}</div>
        </div>
      </div>
    );
  }

  flagsClass = (flag) => classNames('flag', {
    on: flag.value,
  })

  renderFlags = () => (
    <div className="flags">
      {
        this.props.flags.map(
          flag =>
            <div key={flag.name} className={this.flagsClass(flag)}>
              {
                flag.name
              }
            </div>
        )
      }
    </div>
  )

  renderRegisters = (registers) => Object.keys(registers).map(k => this.renderRegister(registers[k]))

  renderALU = () => (
    <div className="alu bluebox">
      <div className="title">
        <span>ALU</span>
      </div>
      {
        this.renderRegisters(this.props.ALU)
      }
    </div>
  )

  renderCPURegisters = () => (
    <div className="bluebox">
      {
        this.renderRegisters(this.props.registers)
      }
    </div>
  )

  renderIP = () => this.renderRegister(this.props.IP)

  renderSP = () => this.renderRegister(this.props.SP)

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
          {this.renderCPURegisters()}
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
    activeComponent: state.machine.activeComponent,
  })
)(CPU)
