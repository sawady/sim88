import React, { Component } from 'react'

import { DEFAULT_FILE_NAME } from '../actions/editor'

import PlayIcon from 'mdi-react/PlayIcon';
import StopIcon from 'mdi-react/StopIcon';
import FileIcon from 'mdi-react/FileIcon';
import FolderOpenIcon from 'mdi-react/FolderOpenIcon';
import ContentSaveIcon from 'mdi-react/ContentSaveIcon';

import '../styles/Toolbar.css';

export default class Toolbar extends Component {

  render() {
    return (
      <div className="toolbar">
        <input style={{ display: 'none' }} ref="openfile" type="file" onChange={this.props.readFile} accept=".txt,.asm" />
        <input style={{ display: 'none' }} ref="saveNewFile" type="file" nwsaveas={this.props.filepath || DEFAULT_FILE_NAME} onChange={this.props.writeNewFile} accept=".txt,.asm" />
        <button onClick={this.props.newFile}>
          <FileIcon size={24} />
          Nuevo
        </button>
        <button onClick={() => this.refs.openfile.click()}>
          <FolderOpenIcon size={24} />
          Abrir
        </button>
        <button onClick={this.props.writeFile(this.refs.saveNewFile)}>
          <ContentSaveIcon size={24} />
          Guardar
        </button>
        <button onClick={() => this.refs.saveNewFile.click()}>
          <ContentSaveIcon size={24} />
          Guardar como...
        </button>
        <button onClick={this.props.execute}>
          <PlayIcon size={24} />
          Ejecutar
        </button>
        <button onClick={this.props.stop}>
          <StopIcon size={24} />
          Detener
        </button>
      </div>
    )
  }
}
