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
  const error = useSelector((state) => state.editor.error);
  const machineState = useSelector((state) => state.machine.state);
  const velocity = useSelector((state) => state.machine.velocity);

  return (
    <div className="machine">
      <div className="status">
        <span>Estado: {STATE_LABELS[machineState] || machineState}</span>
        <span>Velocidad: {velocity}ms</span>
      </div>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="layout">
        <CPU />
        <Memory />
      </div>
    </div>
  );
}
