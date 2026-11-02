import React from 'react';

import {
  mdiPlay,
  mdiStop,
  mdiPause,
  mdiSync,
  mdiFile,
  mdiFolderOpen,
  mdiContentSave,
  mdiDebugStepOver,
  mdiDebugStepInto,
  mdiStepBackward,
} from '@mdi/js';

import { MACHINE_STATES } from '../model/constants';

import '../styles/Toolbar.css';

const Icon = ({ path }) => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true">
    <path d={path} fill="currentColor" />
  </svg>
);

const ToolbarButton = ({ icon, onClick, title, children }) => (
  <button onClick={onClick} title={title}>
    <Icon path={icon} />
    {children}
  </button>
);

export default function Toolbar(props) {
  return (
    <div className="toolbar">
      <ToolbarButton icon={mdiFile} onClick={props.newFile} title="Ctrl+N">Nuevo</ToolbarButton>
      <ToolbarButton icon={mdiFolderOpen} onClick={props.openFile} title="Ctrl+O">Abrir</ToolbarButton>
      <ToolbarButton icon={mdiContentSave} onClick={props.saveFile} title="Ctrl+S">Guardar</ToolbarButton>
      <ToolbarButton icon={mdiContentSave} onClick={props.saveFileAs} title="Ctrl+Shift+S">Guardar como...</ToolbarButton>
      {props.machineState === MACHINE_STATES.RUNNING && (
        <ToolbarButton icon={mdiPause} onClick={props.pause} title="F5">Pausar</ToolbarButton>
      )}
      {props.machineState === MACHINE_STATES.PAUSED && (
        <ToolbarButton icon={mdiPlay} onClick={props.resume} title="F5">Reanudar</ToolbarButton>
      )}
      {props.machineState === MACHINE_STATES.STOPPED && (
        <ToolbarButton icon={mdiPlay} onClick={props.start} title="F5">Ejecutar</ToolbarButton>
      )}
      <ToolbarButton icon={mdiDebugStepOver} onClick={props.stepInstruction} title="F7: una instrucción">Paso</ToolbarButton>
      <ToolbarButton icon={mdiDebugStepInto} onClick={props.stepPhase} title="F6: una fase del ciclo">Micro-paso</ToolbarButton>
      <ToolbarButton icon={mdiStepBackward} onClick={props.stepBack} title="Shift+F7: deshace la última instrucción">Atrás</ToolbarButton>
      <ToolbarButton icon={mdiStop} onClick={props.stop} title="Esc">Detener</ToolbarButton>
      <ToolbarButton icon={mdiSync} onClick={props.reset} title="F8">Resetear</ToolbarButton>
      <label className="strict" title="Rechaza las extensiones de SIM88: 'A', [1000h], * y /">
        <input
          type="checkbox"
          checked={props.strict}
          onChange={(ev) => props.setStrict(ev.target.checked)}
        />
        MSX88 estricto
      </label>
    </div>
  );
}
