import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'

import '../styles/Registers.css'

export default class Memory extends PureComponent {
  static propTypes = {
    registers: PropTypes.array,
  }

  render() {
    return (
      <div className="registers">
        {
          Object.keys(this.props.registers).map(
            (k, i) =>
              <div key={i} className="register">
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
