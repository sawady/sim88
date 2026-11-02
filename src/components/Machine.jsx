import React from 'react';
import { useSelector } from 'react-redux';

import CPU from './CPU';
import Memory from './Memory';

import '../styles/Machine.css';

const STATE_LABELS = {
  RUNNING: 'Ejecutando',
  PAUSED: 'Pausado',
  STOPPED: 'Detenido',
};

export default function Machine() {
  const assemblerError = useSelector((state) => state.editor.error);
  const { state, velocity, message, error, output } = useSelector((s) => s.machine);
  const shownError = assemblerError || (error && `Error de ejecución: ${error}`);

  return (
    <div className="machine">
      <div className="status">
        <span>Estado: {STATE_LABELS[state] || state}</span>
        <span>Velocidad: {velocity}ms</span>
      </div>
      {shownError && (
        <div className="error" role="alert">
          {shownError}
        </div>
      )}
      {!shownError && message && (
        <div className="message" role="status">
          {message}
        </div>
      )}
      <div className="layout">
        <CPU />
        <Memory />
      </div>
      <div className="console">
        <div className="title">Pantalla (INT 7)</div>
        <pre aria-label="Pantalla">{output}</pre>
      </div>
    </div>
  );
}
