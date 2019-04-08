import React, { Component } from 'react'
import { connect } from 'react-redux'

import { HotKeys } from 'react-hotkeys';

import Toolbar from './Toolbar';
import Editor from './Editor';
import Machine from './Machine';

import { DEFAULT_FILE_NAME, setTitle, newFile, readFile, writeFile, writeNewFile } from '../actions/editor'
import { start, stop, pause, reset, resume } from '../actions/machine'

import '../styles/App.css'

class App extends Component {

  keyMap = {
    new: 'ctrl+n',
    open: 'ctrl+o',
    save: ['ctrl+s', 'ctrl+g'],
    saveAs: ['shift+ctrl+s', 'shift+ctrl+g'],
    start: 'f5',
    pause: 'f6',
    stop: 'f7',
    help: 'f1',
  }

  handlers = {
    new: (event) => this.newFile(),
    open: (event) => this.refs.toolbar.refs.openfile.click(),
    save: (event) => this.writeFile(this.refs.toolbar.refs.saveNewFile)(),
    saveAs: (event) => this.refs.toolbar.refs.saveNewFile.click(),
    start: (event) => this.start(),
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

  stop = () => {
    this.props.stop();
  }

  start = () => {
    this.props.start(this.props.text, this.editor);
  }
  
  reset = () => {
    this.props.reset();
  }

  pause = () => {
    this.props.pause();
  }

  resume = () => {
    this.props.resume();
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
            start={this.start}
            stop={this.stop}
            reset={this.reset}
            pause={this.pause}
            resume={this.resume}
            filepath={this.props.filepath}
            text={this.props.text}
            machineState={this.props.machineState}
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
    machineState: state.machine.state,
  }),
  dispatch => ({
    newFile: () => dispatch(newFile()),
    readFile: path => dispatch(readFile(path)),
    writeFile: (path, text) => dispatch(writeFile(path, text)),
    writeNewFile: (path, text) => dispatch(writeNewFile(path, text)),
    start: text => dispatch(start(text)),
    stop: () => dispatch(stop()),
    pause: () => dispatch(pause()),
    reset: () => dispatch(reset()),
    resume: () => dispatch(resume()),
  })
)(App)