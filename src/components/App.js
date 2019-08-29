import React, { Component } from 'react'
import { connect } from 'react-redux'
import { bindActionCreators } from 'redux';

import { HotKeys } from 'react-hotkeys';

import Toolbar from './Toolbar';
import Editor from './Editor';
import Machine from './Machine';

import { MACHINE_STATES } from '../model/machine';
import { DEFAULT_FILE_NAME, setTitle, newFile, readFile, writeFile, writeNewFile } from '../actions/editor'
import { start, stop, pause, reset, resume, increaseVelocity, decreaseVelocity } from '../actions/machine'

import '../styles/App.css'

class App extends Component {

  keyMap = {
    new: 'ctrl+n',
    open: 'ctrl+o',
    save: ['ctrl+s', 'ctrl+g'],
    saveAs: ['shift+ctrl+s', 'shift+ctrl+g'],
    start: 'f5',
    pauseOrResume: 'f6',
    stop: 'f7',
    reset: 'f8',
    help: 'f1',
    increase: 'ctrl+alt+i',
    decrease: 'ctrl+alt+d',
  }

  handlers = {
    new: (event) => this.newFile(),
    open: (event) => this.refs.toolbar.refs.openfile.click(),
    save: (event) => this.writeFile(this.refs.toolbar.refs.saveNewFile)(),
    saveAs: (event) => this.refs.toolbar.refs.saveNewFile.click(),
    start: (event) => this.start(),
    increase: (event) => this.increaseVelocity(),
    decrease: (event) => this.decreaseVelocity(),
    pauseOrResume: (event) => this.pauseOrResume(),
    stop: (event) => this.stop(),
    reset: (event) => this.reset(),
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

  increaseVelocity = () => {
    this.props.increaseVelocity();
  }

  decreaseVelocity = () => {
    this.props.decreaseVelocity();
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

  pauseOrResume = () => {
    if (this.props.machineState === MACHINE_STATES.RUNNING) {
      this.pause();
    }
    if (this.props.machineState === MACHINE_STATES.PAUSED) {
      this.resume();
    }
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
  dispatch =>
    bindActionCreators({
      newFile,
      readFile,
      writeFile,
      writeNewFile,
      start,
      stop,
      pause,
      reset,
      resume,
      increaseVelocity,
      decreaseVelocity
    }, dispatch),
)(App)