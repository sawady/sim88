import React, { Component } from 'react'
import { connect } from 'react-redux'
import PropTypes from 'prop-types'

import AceEditor from 'react-ace'

import 'brace/mode/assembly_x86'
import 'brace/theme/monokai'

import '../styles/Editor.css'

import { changeText } from '../actions/text'

class Editor extends Component {
  static propTypes = {
    changeText: PropTypes.func.isRequired,
    text: PropTypes.string,
  }

  render() {
    return (
      <AceEditor
        className="editor"
        mode="assembly_x86"
        theme="monokai"
        onChange={this.props.changeText}
        name="ACE_EDITOR"
        value={this.props.text}
        fontSize={18}
        showPrintMargin={false}
        setOptions={{
          enableBasicAutocompletion: true,
          enableLiveAutocompletion: true,
          tabSize: 2,
        }}
      />
    )
  }
}

export default connect(
  state => ({
    text: state.text.text
  }),
  dispatch => ({
    changeText: text => dispatch(changeText(text))
  })
)(Editor)
