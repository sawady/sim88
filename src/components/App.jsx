import React, { useCallback, useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Toolbar from './Toolbar';
import Editor from './Editor';
import Machine from './Machine';

import { MACHINE_STATES } from '../model/constants';
import {
  DEFAULT_FILE_NAME,
  setTitle,
  newFile,
  readFile,
  writeFile,
  writeNewFile,
  loadDefaultProgram,
} from '../actions/editor';
import {
  start,
  stop,
  pause,
  reset,
  resume,
  increaseVelocity,
  decreaseVelocity,
} from '../actions/machine';

import '../styles/App.css';

// Keyboard shortcuts (same bindings as the original NW.js app).
const matches = (ev, { key, ctrl = false, shift = false, alt = false }) =>
  ev.key.toLowerCase() === key &&
  (ev.ctrlKey || ev.metaKey) === ctrl &&
  ev.shiftKey === shift &&
  ev.altKey === alt;

export default function App() {
  const dispatch = useDispatch();
  const filepath = useSelector((state) => state.editor.filepath);
  const text = useSelector((state) => state.editor.text);
  const machineState = useSelector((state) => state.machine.state);
  const fileInput = useRef(null);

  const actions = {
    newFile: () => dispatch(newFile()),
    openFile: () => fileInput.current.click(),
    saveFile: () => dispatch(writeFile(filepath || DEFAULT_FILE_NAME, text)),
    saveFileAs: () => {
      const name = window.prompt('Guardar como', filepath || DEFAULT_FILE_NAME);
      if (name) dispatch(writeNewFile(name, text));
    },
    start: () => dispatch(start(text)),
    stop: () => dispatch(stop()),
    pause: () => dispatch(pause()),
    resume: () => dispatch(resume()),
    reset: () => dispatch(reset()),
    pauseOrResume: () => {
      if (machineState === MACHINE_STATES.RUNNING) dispatch(pause());
      if (machineState === MACHINE_STATES.PAUSED) dispatch(resume());
    },
    increase: () => dispatch(increaseVelocity()),
    decrease: () => dispatch(decreaseVelocity()),
  };

  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  const onKeyDown = useCallback((ev) => {
    const a = actionsRef.current;
    const bindings = [
      [{ key: 'n', ctrl: true }, a.newFile],
      [{ key: 'o', ctrl: true }, a.openFile],
      [{ key: 's', ctrl: true }, a.saveFile],
      [{ key: 'g', ctrl: true }, a.saveFile],
      [{ key: 's', ctrl: true, shift: true }, a.saveFileAs],
      [{ key: 'g', ctrl: true, shift: true }, a.saveFileAs],
      [{ key: 'f5' }, a.start],
      [{ key: 'f6' }, a.pauseOrResume],
      [{ key: 'f7' }, a.stop],
      [{ key: 'f8' }, a.reset],
      [{ key: 'i', ctrl: true, alt: true }, a.increase],
      [{ key: 'd', ctrl: true, alt: true }, a.decrease],
    ];
    const found = bindings.find(([binding]) => matches(ev, binding));
    if (found) {
      ev.preventDefault();
      found[1]();
    }
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onKeyDown]);

  useEffect(() => {
    setTitle(DEFAULT_FILE_NAME);
    dispatch(reset());
    dispatch(loadDefaultProgram());
  }, [dispatch]);

  const onFileChosen = (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    dispatch(readFile(file));
  };

  return (
    <div className="app">
      <input
        style={{ display: 'none' }}
        ref={fileInput}
        type="file"
        onChange={onFileChosen}
        accept=".txt,.asm"
      />
      <Toolbar {...actions} machineState={machineState} />
      <div className="main">
        <Editor />
        <Machine />
      </div>
    </div>
  );
}
