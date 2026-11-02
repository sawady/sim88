import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { typeKey } from '../actions/machine';

import CPU from './CPU';
import Memory from './Memory';
import Peripherals from './Peripherals';

import '../styles/Machine.css';

const STATE_LABELS = {
  RUNNING: 'Ejecutando',
  PAUSED: 'Pausado',
  STOPPED: 'Detenido',
};

export default function Machine() {
  const assemblerError = useSelector((state) => state.editor.error);
  const { state, velocity, message, error, output, waitingInput } = useSelector((s) => s.machine);
  const dispatch = useDispatch();
  const screen = useRef(null);

  // INT 6 waits for a key: the screen takes the keyboard.
  useEffect(() => {
    if (waitingInput && screen.current) screen.current.focus();
  }, [waitingInput]);

  const onKeyDown = (ev) => {
    if (ev.ctrlKey || ev.metaKey || ev.altKey) return;
    let code;
    if (ev.key.length === 1) code = ev.key.charCodeAt(0);
    else if (ev.key === 'Enter') code = 13;
    else if (ev.key === 'Backspace') code = 8;
    if (code === undefined || code > 255) return;
    ev.preventDefault();
    dispatch(typeKey(code));
  };
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
      <div className={waitingInput ? 'console waiting' : 'console'}>
        <div className="title">
          Pantalla (INT 7) y teclado (INT 6)
          {waitingInput && <span className="hint"> · Esperando una tecla…</span>}
        </div>
        <pre ref={screen} tabIndex={0} aria-label="Pantalla" onKeyDown={onKeyDown}>
          {output}
        </pre>
      </div>
      <Peripherals />
    </div>
  );
}
