import React, { Component } from 'react'
import { connect } from 'react-redux'

import PlayIcon from 'mdi-react/PlayIcon';
import StopIcon from 'mdi-react/StopIcon';
import FileIcon from 'mdi-react/FileIcon';
import FolderOpenIcon from 'mdi-react/FolderOpenIcon';
import ContentSaveIcon from 'mdi-react/ContentSaveIcon';

import fs from 'fs';

import { changeText } from '../actions/text'
import { run } from '../actions/result'

import '../styles/Toolbar.css';

const DEFAULT_FILE_NAME = 'newfile.asm'

function setTitle(title) {
  document.title = `${title} - SIM88`
}

class Toolbar extends Component {

  componentDidMount() {
    setTitle(DEFAULT_FILE_NAME);
  }

  state = {
    filepath: ''
  }

  changeFilePath = (name, cb) => {
    this.setState({ filepath: name }, cb);
    setTitle(name || DEFAULT_FILE_NAME);
  }

  newFile = () => {
    this.props.changeText('');
    this.changeFilePath(undefined);
  }

  readFile = (ev) => {
    const path = ev.target.value;
    ev.target.value = '';
    fs.readFile(path, 'utf8', (err, data) => {
      console.log(path);
      this.changeFilePath(path);
      this.props.changeText(data);
    });
  }

  writeFile = () => {
    console.log(this.state.filepath);
    if (!this.state.filepath) {
      this.refs.saveNewFile.click();
    }
    fs.writeFile(this.state.filepath, this.props.text, (err) => {

    });
  }

  writeNewFile = (ev) => {
    const path = ev.target.value;
    ev.target.value = '';
    this.changeFilePath(path, this.writeFile);
  }

  run = () => {
    this.props.run(this.props.text);
  }

  render() {
    return (
      <div className="toolbar">
        <input style={{ display: 'none' }} ref="openfile" type="file" onChange={this.readFile} accept=".txt,.asm" />
        <input style={{ display: 'none' }} ref="saveNewFile" type="file" nwsaveas={this.state.filepath || DEFAULT_FILE_NAME} onChange={this.writeNewFile} accept=".txt,.asm" />
        <button onClick={this.newFile}>
          <FileIcon size={24} />
          Nuevo
        </button>
        <button onClick={() => this.refs.openfile.click()}>
          <FolderOpenIcon size={24} />
          Abrir
        </button>
        <button onClick={this.writeFile}>
          <ContentSaveIcon size={24} />
          Guardar
        </button>
        <button onClick={() => this.refs.saveNewFile.click()}>
          <ContentSaveIcon size={24} />
          Guardar como...
        </button>
        <button onClick={this.run}>
          <PlayIcon size={24} />
          Ejecutar
        </button>
        <button>
          <StopIcon size={24} />
          Detener
        </button>
      </div>
    )
  }
}

export default connect(
  state => ({
    text: state.text.text,
  }),
  dispatch => ({
    changeText: text => dispatch(changeText(text)),
    run: text => dispatch(run(text))
  })
)(Toolbar)
