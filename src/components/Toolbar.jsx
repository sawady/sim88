import React from 'react';

import {
  mdiPlay,
  mdiStop,
  mdiPause,
  mdiSync,
  mdiFile,
  mdiFolderOpen,
  mdiContentSave,
} from '@mdi/js';

import { MACHINE_STATES } from '../model/constants';

import '../styles/Toolbar.css';

const Icon = ({ path }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d={path} fill="currentColor" />
  </svg>
);

const ToolbarButton = ({ icon, onClick, children }) => (
  <button onClick={onClick}>
    <Icon path={icon} />
    {children}
  </button>
);

export default function Toolbar(props) {
  return (
    <div className="toolbar">
      <ToolbarButton icon={mdiFile} onClick={props.newFile}>Nuevo</ToolbarButton>
      <ToolbarButton icon={mdiFolderOpen} onClick={props.openFile}>Abrir</ToolbarButton>
      <ToolbarButton icon={mdiContentSave} onClick={props.saveFile}>Guardar</ToolbarButton>
      <ToolbarButton icon={mdiContentSave} onClick={props.saveFileAs}>Guardar como...</ToolbarButton>
      {props.machineState === MACHINE_STATES.RUNNING && (
        <ToolbarButton icon={mdiPause} onClick={props.pause}>Pausar</ToolbarButton>
      )}
      {props.machineState === MACHINE_STATES.PAUSED && (
        <ToolbarButton icon={mdiPlay} onClick={props.resume}>Reanudar</ToolbarButton>
      )}
      {props.machineState === MACHINE_STATES.STOPPED && (
        <ToolbarButton icon={mdiPlay} onClick={props.start}>Ejecutar</ToolbarButton>
      )}
      <ToolbarButton icon={mdiStop} onClick={props.stop}>Detener</ToolbarButton>
      <ToolbarButton icon={mdiSync} onClick={props.reset}>Resetear</ToolbarButton>
    </div>
  );
}
