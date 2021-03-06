import React, { Component } from 'react'
import { connect } from 'react-redux'

import AceEditor from 'react-ace'

import 'ace-builds/src-noconflict/mode-assembly_x86'
import 'ace-builds/src-noconflict/theme-monokai'
import 'ace-builds/src-noconflict/ext-language_tools'

import '../styles/Editor.css'

import { changeText } from '../actions/editor'

class Editor extends Component {

  componentDidMount() {
    this.changeLine();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.props.line && prevProps.line !== this.props.line) {
      this.changeLine();
    }
    if (!this.props.line) {
      this.focus();
    }
  }

  changeLine = () => {
    const editor = this.refs.aceEditor.editor;
    editor.gotoLine(this.props.line);
    editor.focus();
  }

  focus = () => {
    const editor = this.refs.aceEditor.editor;
    editor.focus();
  }

  render() {
    return (
      <AceEditor
        ref="aceEditor"
        className="editor"
        mode="assembly_x86"
        focus
        theme="monokai"
        onChange={this.props.changeText}
        name="ACE_EDITOR"
        value={this.props.text}
        fontSize={18}
        showPrintMargin={false}
        editorProps={{
          $blockScrolling: Infinity,
        }}
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
    text: state.editor.text,
    line: state.editor.line,
  }),
  dispatch => ({
    changeText: text => dispatch(changeText(text))
  })
)(Editor)
