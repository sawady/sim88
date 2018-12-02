import React, { PureComponent } from 'react'

import '../styles/CPU.css'

import Registers from './Registers'
import ALU from './ALU'
import Flags from './Flags'

export default class CPU extends PureComponent {
  render() {
    return (
      <div className="frame cpu">
        <div className="title">
          CPU
        </div>
        <div className="top">
          <ALU registers={{ "op1": ["00", "00"], "res": ["00", "00"], "op2": ["00", "00"] }} />
          <Registers registers={{ "ax": ["00", "00"], "bx": ["00", "00"], "cx": ["00", "00"], "dx": ["00", "00"] }} />
        </div>
        <div className="top">
          <Flags flags={{ i: true, z: false, s: false, o: false, c: false, a: false, p: false }}/>
        </div>
      </div>
    )
  }
}
