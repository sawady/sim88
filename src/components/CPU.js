import React, { Component } from 'react'
import { connect } from 'react-redux'

import classNames from 'classnames'

import { fromReg } from '../model/conversions'

import '../styles/CPU.css'

class CPU extends Component {

  componentClass = (baseClass, componentName, className) => {
    const { activeComponents } = this.props;
    return classNames(baseClass, {
      active: activeComponents.includes(componentName),
    }, className)
  }

  renderRegister = (reg) => {
    const r = fromReg(reg.name, reg.value);
    return (
      <div key={reg.name} className={this.componentClass('register', reg.name)}>
        <div className="name">{r.name}</div>
        <div className="values">
          <div className="value">{r.H}</div>
          <div className="value">{r.L}</div>
        </div>
      </div>
    );
  }

  render8Register = (reg) => {
    const r = fromReg(reg.name, reg.value);
    return (
      <div key={reg.name} className={this.componentClass('register', reg.name, 'ir')}>
        <div className="name">{r.name}</div>
        <div className="values">
          <div className="value">{r.L}</div>
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

  renderIR = () => this.render8Register(this.props.IR)

  renderOrders = () => (
    <div className="redbox orders">
      μORDENES
    </div>
  )

  renderDecoder = () => (
    <div className={this.componentClass('redbox decoder', 'decoder')}>
      <div className="title">
        INSTRUCTION
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
          {/* {this.renderOrders()} */}
        </div>
        {/* <div className="layout">
          {this.renderSequencer()}
        </div> */}
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
    activeComponents: state.machine.activeComponents,
  })
)(CPU)
