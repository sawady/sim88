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
  setStrict,
  loadStrictPreference,
} from '../actions/editor';
import {
  start,
  stop,
  pause,
  reset,
  resume,
  increaseVelocity,
  decreaseVelocity,
  stepPhase,
  stepInstruction,
  stepBack,
  pressF10,
  toggleSwitch,
  setConfig,
} from '../actions/machine';

import '../styles/App.css';

// Keyboard shortcuts. The ones MSX88 defines are kept: F6 runs one phase of
// the cycle, F7 one instruction, ESC ends the program, F10 interrupts (INT0
// of the PIC) and 0-7 flip the switches.

// Keys that must not be taken from the editor or the keyboard of INT 6.
const isTyping = (ev) =>
  ev.target && (ev.target.tagName === 'TEXTAREA' || ev.target.tagName === 'INPUT' || ev.target.tagName === 'PRE');

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
  const strict = useSelector((state) => state.editor.strict);
  const config = useSelector((state) => state.machine.bus.config);
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
    stepPhase: () => dispatch(stepPhase(text)),
    stepInstruction: () => dispatch(stepInstruction(text)),
    stepBack: () => dispatch(stepBack()),
    runPauseResume: () => {
      if (machineState === MACHINE_STATES.RUNNING) dispatch(pause());
      else if (machineState === MACHINE_STATES.PAUSED) dispatch(resume());
      else dispatch(start(text));
    },
    setStrict: (value) => dispatch(setStrict(value)),
    setConfig: (value) => dispatch(setConfig(value)),
    pressF10: () => dispatch(pressF10()),
    toggleSwitch: (n) => dispatch(toggleSwitch(n)),
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
      [{ key: 'f5' }, a.runPauseResume],
      [{ key: 'f6' }, a.stepPhase],
      [{ key: 'f7' }, a.stepInstruction],
      [{ key: 'f7', shift: true }, a.stepBack],
      [{ key: 'escape' }, a.stop],
      [{ key: 'f8' }, a.reset],
      [{ key: 'f10' }, a.pressF10],
      [{ key: 'i', ctrl: true, alt: true }, a.increase],
      [{ key: 'd', ctrl: true, alt: true }, a.decrease],
    ];
    // MSX88: + and - change the speed (not while typing)
    // and 0-7 flip the switches
    const typingBindings = [
      [{ key: '+' }, a.increase],
      [{ key: '+', shift: true }, a.increase],
      [{ key: '-' }, a.decrease],
      ...[0, 1, 2, 3, 4, 5, 6, 7].map((n) => [{ key: String(n) }, () => a.toggleSwitch(n)]),
    ];
    const found =
      bindings.find(([binding]) => matches(ev, binding)) ||
      (!isTyping(ev) && typingBindings.find(([binding]) => matches(ev, binding)));
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
    dispatch(setStrict(loadStrictPreference()));
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
      <Toolbar {...actions} machineState={machineState} strict={strict} config={config} />
      <div className="main">
        <Editor />
        <Machine />
      </div>
    </div>
  );
}
