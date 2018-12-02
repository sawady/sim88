import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'

import '../styles/Memory.css'

export default class Memory extends PureComponent {
  static propTypes = {
    memory: PropTypes.array,
    active: PropTypes.number
  }

  render() {
    return (
      <div className="frame memory">
        <div className="title">
          Memoria
        </div>
        {
          this.props.memory.map(
            (content, i) =>
              <div key={i} className={i === this.props.active ? "cell active" : "cell"}>
                <div>{content}</div>
                <div>00</div>
              </div>
          )
        }
        {
          this.props.memory.map(
            (content, i) =>
              <div key={i} className={i === this.props.active ? "cell active" : "cell"}>
                <div>{content}</div>
                <div>00</div>
              </div>
          )
        }
      </div>
    )
  }
}
