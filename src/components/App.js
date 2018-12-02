import React, { Component } from 'react'
import { connect } from 'react-redux'

import { HotKeys } from 'react-hotkeys';

import Toolbar from './Toolbar';
import Editor from './Editor';
import Machine from './Machine';

import { DEFAULT_FILE_NAME, setTitle, changeText, newFile, readFile, writeFile, writeNewFile } from '../actions/editor'
import { execute } from '../actions/execute'

import '../styles/App.css'

class App extends Component {

  keyMap = {
    new: 'ctrl+n',
    open: 'ctrl+o',
    save: ['ctrl+s', 'ctrl+g'],
    saveAs: ['shift+ctrl+s', 'shift+ctrl+g'],
    execute: 'f5',
    pause: 'f6',
    stop: 'f7',
    help: 'f1',
  }

  handlers = {
    new: (event) => this.newFile(),
    open: (event) => this.refs.toolbar.refs.openfile.click(),
    save: (event) => this.writeFile(this.refs.toolbar.refs.saveNewFile)(),
    saveAs: (event) => this.refs.toolbar.refs.saveNewFile.click(),
    execute: (event) => this.execute(),
    pause: (event) => console.log('Pause hotkey called!'),
    stop: (event) => console.log('Stop hotkey called!'),
    help: (event) => console.log('Help hotkey called!'),
  };

  componentDidMount() {
    setTitle(DEFAULT_FILE_NAME);
  }

  newFile = () => {
    this.props.newFile();
  }

  readFile = (ev) => {
    const path = ev.target.value;
    ev.target.value = '';
    this.props.readFile(path);
  }

  writeFile = (ref) => () => {
    console.log(this.props.filepath);
    if (!this.props.filepath) {
      ref.click();
    } else {
      this.props.writeFile(this.props.filepath, this.props.text);
    }
  }

  writeNewFile = (ev) => {
    const path = ev.target.value;
    ev.target.value = '';
    this.props.writeNewFile(path, this.props.text);
  }

  execute = () => {
    this.props.execute(this.props.text);
  }

  render() {
    return (
      <HotKeys keyMap={this.keyMap} handlers={this.handlers}>
        <div className="app">
          <Toolbar
            ref="toolbar"
            newFile={this.newFile}
            readFile={this.readFile}
            writeFile={this.writeFile}
            writeNewFile={this.writeNewFile}
            execute={this.execute}
            filepath={this.props.filepath}
            text={this.props.text}
          />
          <div className="main">
            <Editor />
            <Machine />
          </div>
        </div>
      </HotKeys>
    );
  }
}

export default connect(
  state => ({
    filepath: state.editor.filepath,
    text: state.editor.text,
  }),
  dispatch => ({
    newFile: () => dispatch(newFile()),
    readFile: path => dispatch(readFile(path)),
    writeFile: (path, text) => dispatch(writeFile(path, text)),
    writeNewFile: (path, text) => dispatch(writeNewFile(path, text)),
    execute: text => dispatch(execute(text))
  })
)(App)