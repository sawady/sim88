import React, { PureComponent } from 'react'

import '../styles/ALU.css'

export default class ALU extends PureComponent {
  render() {
    return (
      <div className="alu">
        <div className="title">
          ALU
        </div>
        {
          Object.keys(this.props.registers).map(
            (k, i) =>
              <div key={i} className={k === "res" ? "res register" : "op register"}>
                <div className="name">{k}</div>
                <div className="values">
                  <div className="value">{this.props.registers[k][0]}</div>
                  <div className="value">{this.props.registers[k][1]}</div>
                </div>
              </div>
          )
        }
      </div>
    )
  }
}
