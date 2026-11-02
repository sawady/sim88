import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { legacy_createStore as createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';

import reducers from '..';
import { setStrict } from '../../actions/editor';
import {
  start,
  stepInstruction,
  stepPhase,
  stepBack,
  pause,
  resume,
  reset,
  setConfig,
  pressF10,
  toggleSwitch,
} from '../../actions/machine';
import { readReg } from '../../model/cpu';

const PROGRAM = 'ORG 2000h\nMOV AL, 1\nMOV AL, 2\nMOV AL, 3\nHLT\nEND';

const newStore = () => createStore(combineReducers(reducers), applyMiddleware(thunk));
const AL = (store) => readReg(store.getState().machine.cpu, 'AL');

describe('machine controls (actions + reducer)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  test('start runs one phase per velocity tick until HLT', () => {
    const store = newStore();
    store.dispatch(start(PROGRAM));
    expect(store.getState().machine.state).toBe('RUNNING');
    const { velocity } = store.getState().machine;
    vi.advanceTimersByTime(velocity * 5); // one instruction = 5 phases
    expect(AL(store)).toBe(1);
    vi.advanceTimersByTime(velocity * 100);
    expect(AL(store)).toBe(3);
    expect(store.getState().machine.state).toBe('STOPPED');
    expect(store.getState().machine.message).toMatch(/HLT/);
  });

  test('pause stops the timer and resume continues', () => {
    const store = newStore();
    store.dispatch(start(PROGRAM));
    const { velocity } = store.getState().machine;
    vi.advanceTimersByTime(velocity * 5);
    store.dispatch(pause());
    vi.advanceTimersByTime(velocity * 100);
    expect(AL(store)).toBe(1);
    store.dispatch(resume());
    vi.advanceTimersByTime(velocity * 100);
    expect(AL(store)).toBe(3);
  });

  test('"step" assembles when stopped and runs one instruction, leaving it paused', () => {
    const store = newStore();
    store.dispatch(stepInstruction(PROGRAM));
    expect(AL(store)).toBe(1);
    expect(store.getState().machine.state).toBe('PAUSED');
    store.dispatch(stepInstruction(PROGRAM));
    expect(AL(store)).toBe(2);
    vi.advanceTimersByTime(10000);
    expect(AL(store)).toBe(2); // no timer while stepping
  });

  test('"micro-step" runs one phase of the cycle', () => {
    const store = newStore();
    store.dispatch(stepPhase(PROGRAM));
    expect(store.getState().machine.phase).toBe(1);
    expect(store.getState().machine.IR).toBe(0xb0);
    for (let i = 0; i < 4; i++) store.dispatch(stepPhase(PROGRAM));
    expect(AL(store)).toBe(1);
    expect(store.getState().machine.phase).toBe(0);
  });

  test('"back" undoes the last instruction', () => {
    const store = newStore();
    store.dispatch(stepInstruction(PROGRAM));
    store.dispatch(stepInstruction(PROGRAM));
    store.dispatch(stepBack());
    expect(AL(store)).toBe(1);
    expect(store.getState().machine.cpu.ip).toBe(0x2002);
  });

  test('stepping through HLT stops the machine', () => {
    const store = newStore();
    for (let i = 0; i < 4; i++) store.dispatch(stepInstruction(PROGRAM));
    expect(store.getState().machine.state).toBe('STOPPED');
  });

  test('an assembler error is shown with its line and the machine stays stopped', () => {
    const store = newStore();
    store.dispatch(start('ORG 2000h\nMOV AL, 300\nEND'));
    expect(store.getState().editor.error).toBe('300 does not fit in 8 bits.');
    expect(store.getState().editor.errorLine).toBe(2);
    expect(store.getState().machine.state).toBe('STOPPED');
  });

  test('MSX88 strict mode is applied when assembling', () => {
    const store = newStore();
    store.dispatch(setStrict(true));
    store.dispatch(start("ORG 2000h\nMOV AL, 'A'\nHLT\nEND"));
    expect(store.getState().editor.error).toMatch(/strict mode/);
    store.dispatch(setStrict(false));
    store.dispatch(start("ORG 2000h\nMOV AL, 'A'\nHLT\nEND"));
    expect(store.getState().editor.error).toBe(undefined);
  });

  test('configuration, switches, F10 and the 1 Hz timer clock', () => {
    const store = newStore();
    store.dispatch(setConfig(2));
    expect(store.getState().machine.bus.config).toBe(2);
    store.dispatch(reset());
    expect(store.getState().machine.bus.config).toBe(2); // reset keeps it
    store.dispatch(setConfig(0));
    store.dispatch(toggleSwitch(1));
    expect(store.getState().machine.devices.switches).toBe(2);
    store.dispatch(pressF10());
    expect(store.getState().machine.devices.pic.irr).toBe(1);

    store.dispatch(start('ORG 2000h\nL: JMP L\nEND'));
    vi.advanceTimersByTime(3000);
    expect(store.getState().machine.devices.timer.cont).toBe(3);
    store.dispatch(pause());
    vi.advanceTimersByTime(3000);
    expect(store.getState().machine.devices.timer.cont).toBe(3); // no clock while paused
  });

  test('reset clears the machine but keeps the speed', () => {
    const store = newStore();
    store.dispatch(stepInstruction(PROGRAM));
    store.dispatch(reset());
    expect(AL(store)).toBe(0);
    expect(store.getState().machine.program).toBe(null);
  });
});
