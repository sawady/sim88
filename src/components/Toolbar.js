import React, { Component } from 'react'

import { MACHINE_STATES } from '../model/constants';
import { DEFAULT_FILE_NAME } from '../actions/editor'

import PlayIcon from 'mdi-react/PlayIcon';
import StopIcon from 'mdi-react/StopIcon';
import PauseIcon from 'mdi-react/PauseIcon';
import SyncIcon from 'mdi-react/SyncIcon';
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
        {
          this.props.machineState === MACHINE_STATES.RUNNING &&
          <button onClick={this.props.pause}>
            <PauseIcon size={24} />
            Pausar
          </button>
        }
        {
          this.props.machineState === MACHINE_STATES.PAUSED &&
          <button onClick={this.props.resume}>
            <PlayIcon size={24} />
            Reanudar
          </button>
        }
        {
          this.props.machineState === MACHINE_STATES.STOPPED &&
          <button onClick={this.props.start}>
            <PlayIcon size={24} />
            Ejecutar
          </button>
        }
        <button onClick={this.props.stop}>
          <StopIcon size={24} />
          Detener
        </button>
        <button onClick={this.props.reset}>
          <SyncIcon size={24} />
          Resetear
        </button>
      </div>
    )
  }
}
