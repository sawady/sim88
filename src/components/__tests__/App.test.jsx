// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';

import reducers from '../../reducers';
import App from '../App';

// Ace does not run in jsdom: a plain textarea stands in for the editor.
vi.mock('../Editor', async () => {
  const { useDispatch, useSelector } = await import('react-redux');
  const { changeText } = await import('../../actions/editor');
  return {
    default: function FakeEditor() {
      const dispatch = useDispatch();
      const text = useSelector((state) => state.editor.text);
      return <textarea aria-label="Programa" value={text} onChange={(ev) => dispatch(changeText(ev.target.value))} />;
    },
  };
});

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const renderApp = async () => {
  const store = createStore(combineReducers(reducers), applyMiddleware(thunk));
  await act(async () => {
    render(
      <Provider store={store}>
        <App />
      </Provider>
    );
  });
  await screen.findByLabelText('Programa');
  vi.useFakeTimers(); // after rendering: the lazy editor needs real timers to appear
  return store;
};

const registerValue = (name) => {
  const label = screen.getAllByText(name, { selector: '.register .name' })[0];
  return label.parentElement.querySelector('.values').textContent;
};

describe('App (smoke test)', () => {
  beforeEach(() => {
    globalThis.ResizeObserver = class {
      observe() {}
      disconnect() {}
    };
    window.localStorage.clear();
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('runs the default example to HLT', async () => {
    const store = await renderApp();
    expect(screen.getByLabelText('Programa').value).toMatch(/TABLA/);
    fireEvent.click(screen.getByRole('button', { name: /Ejecutar/ }));
    for (let i = 0; i < 60 && store.getState().machine.state === 'RUNNING'; i++) {
      await act(async () => {
        vi.advanceTimersByTime(store.getState().machine.velocity * 10);
      });
    }
    expect(screen.getByRole('status').textContent).toMatch(/Programa terminado \(HLT\)/);
    expect(registerValue('AX')).toBe('000F');
  });

  test('shows assembler errors with the line', async () => {
    await renderApp();
    fireEvent.change(screen.getByLabelText('Programa'), { target: { value: 'ORG 2000h\nMOVE AL, 1\nEND' } });
    fireEvent.click(screen.getByRole('button', { name: /Ejecutar/ }));
    expect(screen.getByRole('alert').textContent).toMatch(/línea 2: Unknown instruction MOVE/);
  });

  test('steps one instruction and back', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^Paso$/ }));
    expect(registerValue('IP')).toBe('2002');
    fireEvent.click(screen.getByRole('button', { name: /Atrás/ }));
    expect(registerValue('IP')).toBe('2000');
  });

  test('the switches of configuration 0 respond to clicks', async () => {
    const store = await renderApp();
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(store.getState().machine.devices.switches).toBe(8);
  });
});
