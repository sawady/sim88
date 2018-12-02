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
        <div className="title">
          CPU
        </div>
        {
          this.props.registers.map(
            (content, i) =>
              <div key={i} className="register">
                <div>{content}</div>
                <div>00</div>
              </div>
          )
        }
      </div>
    )
  }
}
