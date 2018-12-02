import React, { PureComponent } from 'react'

import '../styles/Flags.css'

export default class Flags extends PureComponent {
  render() {
    return (
      <div className="flags">
        {
          Object.keys(this.props.flags).map(
            (k, i) =>
              <div className={ this.props.flags[k] ? "on flag" : "off flag" }>
                {  
                  k
                }
              </div>
          )
        }
      </div>
    )
  }
}
