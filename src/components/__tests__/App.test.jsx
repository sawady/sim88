// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { Provider } from 'react-redux';
import { legacy_createStore as createStore, applyMiddleware, combineReducers } from 'redux';
import { thunk } from 'redux-thunk';

import reducers from '../../reducers';
import { persistProgram } from '../../actions/editor';
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

const renderApp = async ({ settings = { lang: 'es' } } = {}) => {
  if (settings) window.localStorage.setItem('sim88.settings', JSON.stringify(settings));
  const store = createStore(combineReducers(reducers), applyMiddleware(thunk));
  persistProgram(store);
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

const key = (k, options = {}) => fireEvent.keyDown(window, { key: k, ...options });

// Opens a menu of the menu bar and runs one of its items.
const menu = (bar, item) => {
  fireEvent.mouseDown(screen.getByRole('menuitem', { name: bar }));
  const open = within(screen.getByRole('menu'));
  const items = [...open.queryAllByRole('menuitem'), ...open.queryAllByRole('menuitemcheckbox')];
  const found = items.find((el) => (typeof item === 'string' ? el.textContent.includes(item) : item.test(el.textContent)));
  if (!found) throw new Error(`no item ${item} in ${bar}`);
  fireEvent.click(found);
};

describe('App', () => {
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

  test('the first visit shows the default example', async () => {
    await renderApp();
    expect(screen.getByLabelText('Programa').value).toMatch(/TABLA/);
  });

  test('runs the default example to HLT, where the CPU waits (as MSX88)', async () => {
    const store = await renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'F5 Ejecutar' }));
    for (let i = 0; i < 60 && !store.getState().machine.cpuHalted; i++) {
      await act(async () => {
        vi.advanceTimersByTime(store.getState().machine.velocity * 10);
      });
    }
    expect(screen.getByRole('status').textContent).toMatch(/HLT: la CPU espera una interrupción/);
    expect(registerValue('AX')).toBe('00 0F');
  });

  test('shows assembler errors with the line, in Spanish', async () => {
    await renderApp();
    fireEvent.change(screen.getByLabelText('Programa'), { target: { value: 'ORG 2000h\nMOVE AL, 1\nEND' } });
    fireEvent.click(screen.getByRole('button', { name: 'F5 Ejecutar' }));
    expect(screen.getByRole('alert').textContent).toBe('Línea 2: Instrucción desconocida: MOVE.');
  });

  test('steps one instruction (F7) and back (Shift+F7)', async () => {
    await renderApp();
    fireEvent.click(screen.getByRole('button', { name: 'F7 Paso' }));
    expect(registerValue('IP')).toBe('20 02');
    act(() => key('F7')); // MOV CL, CANT: 4 bytes
    expect(registerValue('IP')).toBe('20 06');
    act(() => key('F7', { shiftKey: true }));
    expect(registerValue('IP')).toBe('20 02');
    menu('Ejecutar', 'Paso atrás');
    expect(registerValue('IP')).toBe('20 00');
  });

  test('the switches of configuration 0 respond to clicks and keys', async () => {
    const store = await renderApp();
    fireEvent.click(screen.getByRole('button', { name: '3' }));
    expect(store.getState().machine.devices.switches).toBe(8);
    act(() => key('0'));
    expect(store.getState().machine.devices.switches).toBe(9);
  });

  test('menus open with Alt + letter and move with the arrows', async () => {
    await renderApp();
    act(() => key('o', { code: 'KeyO', altKey: true }));
    expect(screen.getByRole('menu', { name: 'Opciones' })).toBeTruthy();
    expect(document.activeElement.textContent).toMatch(/Conexionado/);
    fireEvent.keyDown(document.activeElement, { key: 'ArrowDown' });
    expect(document.activeElement.textContent).toMatch(/Modo estricto MSX88/);
    fireEvent.keyDown(document.activeElement, { key: 'ArrowRight' });
    expect(screen.getByRole('menu', { name: 'Ayuda' })).toBeTruthy();
    expect(screen.getAllByRole('menu')).toHaveLength(1);
    fireEvent.keyDown(document.activeElement, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBe(null);
  });

  test('strict mode is a check item of the Options menu', async () => {
    const store = await renderApp();
    menu('Opciones', /Modo estricto/);
    expect(store.getState().editor.strict).toBe(true);
    expect(screen.getByText(/MSX88 estricto/)).toBeTruthy();
  });

  test('the configuration dialog changes the peripherals', async () => {
    const store = await renderApp();
    menu('Opciones', 'Conexionado…');
    const dialog = screen.getByRole('dialog', { name: 'Conexionado' });
    fireEvent.click(within(dialog).getByLabelText(/^2:/));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }));
    expect(store.getState().machine.bus.config).toBe(2);
    expect(screen.queryByRole('dialog')).toBe(null);
    expect(screen.getByText(/HAND: impresora por interrupciones/)).toBeTruthy();
  });

  test('loading an example over a changed program asks first', async () => {
    const store = await renderApp();
    fireEvent.change(screen.getByLabelText('Programa'), { target: { value: 'ORG 2000h\nHLT\nEND' } });
    menu('Ejemplos', /Timer/);
    const dialog = screen.getByRole('dialog', { name: 'Ejemplo' });
    fireEvent.click(within(dialog).getByRole('button', { name: 'No' }));
    expect(store.getState().editor.text).toBe('ORG 2000h\nHLT\nEND');
    menu('Ejemplos', /Timer/);
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Sí' }));
    expect(store.getState().editor.text).toMatch(/Timer/);
  });
});

describe('language', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('defaults to the language of the browser', async () => {
    const languages = vi.spyOn(window.navigator, 'languages', 'get').mockReturnValue(['es-AR', 'es']);
    await renderApp({ settings: null });
    expect(screen.getByRole('button', { name: 'F5 Ejecutar' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('es');
    languages.mockReturnValue(['en-US']);
    cleanup();
    window.localStorage.clear();
    vi.useRealTimers();
    await renderApp({ settings: null });
    expect(screen.getByRole('button', { name: 'F5 Run' })).toBeTruthy();
    languages.mockRestore();
  });

  test('the language dialog switches the whole UI, errors included, and is remembered', async () => {
    await renderApp();
    fireEvent.change(screen.getByLabelText('Programa'), { target: { value: 'ORG 2000h\nMOV AL, 300\nEND' } });
    fireEvent.click(screen.getByRole('button', { name: 'F5 Ejecutar' }));
    expect(screen.getByRole('alert').textContent).toBe('Línea 2: 300 no entra en 8 bits.');
    menu('Opciones', /Idioma/);
    fireEvent.click(within(screen.getByRole('dialog')).getByLabelText('English'));
    expect(screen.getByRole('alert').textContent).toBe('Line 2: 300 does not fit in 8 bits.');
    expect(screen.getByRole('menuitem', { name: 'Options' })).toBeTruthy();
    expect(document.documentElement.lang).toBe('en');
    expect(JSON.parse(window.localStorage.getItem('sim88.settings')).lang).toBe('en');
  });
});

describe('theme and frequencies', () => {
  beforeEach(() => window.localStorage.clear());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  test('the appearance dialog picks a theme, shows it at once and remembers it', async () => {
    await renderApp();
    expect(document.documentElement.dataset.theme).toBe('borland');
    menu('Opciones', 'Apariencia…');
    const dialog = screen.getByRole('dialog', { name: 'Apariencia' });
    fireEvent.click(within(dialog).getByLabelText('Fósforo ámbar'));
    expect(document.documentElement.dataset.theme).toBe('amber');
    fireEvent.click(within(dialog).getByLabelText(/Efecto CRT/));
    expect(document.documentElement.dataset.crt).toBe('on');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }));
    expect(JSON.parse(window.localStorage.getItem('sim88.settings'))).toMatchObject({ theme: 'amber', crt: true });
  });

  test('Cancel in the appearance dialog puts the theme back', async () => {
    await renderApp();
    menu('Opciones', 'Apariencia…');
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText('MSX88'));
    expect(document.documentElement.dataset.theme).toBe('msx88');
    fireEvent.keyDown(dialog, { key: 'Escape' });
    expect(document.documentElement.dataset.theme).toBe('borland');
    expect(screen.queryByRole('dialog')).toBe(null);
  });

  test('a saved theme is used at startup', async () => {
    await renderApp({ settings: { lang: 'es', theme: 'green' } });
    expect(document.documentElement.dataset.theme).toBe('green');
  });

  test('the frequencies dialog sets the timer and the printer', async () => {
    const store = await renderApp();
    menu('Opciones', 'Frecuencias…');
    let dialog = screen.getByRole('dialog', { name: 'Frecuencias' });
    expect(within(dialog).getByLabelText('1 Hz').checked).toBe(true);
    fireEvent.click(within(dialog).getByLabelText('2 Hz'));
    fireEvent.click(within(dialog).getByLabelText('1 cada 4'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }));
    expect(store.getState().settings).toMatchObject({ timerHz: 2, printInterval: 4 });
    expect(store.getState().machine.devices.printer.interval).toBe(4);

    menu('Opciones', 'Frecuencias…');
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getAllByLabelText('Otro')[0]);
    fireEvent.change(within(dialog).getByLabelText(/Otra frecuencia/), { target: { value: '0,25' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }));
    expect(store.getState().settings.timerHz).toBe(0.25);
  });

  test('an out of range frequency is not accepted', async () => {
    const store = await renderApp();
    menu('Opciones', 'Frecuencias…');
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getAllByLabelText('Otro')[0]);
    fireEvent.change(within(dialog).getByLabelText(/Otra frecuencia/), { target: { value: '500' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }));
    expect(within(dialog).getByRole('alert').textContent).toMatch(/fuera de rango/);
    expect(store.getState().settings.timerHz).toBe(1);
  });
});

describe('HLT and the ALU mode in the interface', () => {
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

  const stateBar = () => document.querySelector('.statusbar .state');
  const barKeys = () => [...document.querySelectorAll('.statusbar button .hot')].map((el) => el.textContent);
  const phaseLine = () => document.querySelector('.cpu .phase');

  test('after HLT the status bar and the CPU say the CPU is halted until Esc', async () => {
    const store = await renderApp();
    fireEvent.change(screen.getByLabelText('Programa'), { target: { value: 'ORG 2000h\nHLT\nEND' } });
    expect(stateBar().classList.contains('halted')).toBe(false);
    expect(phaseLine().textContent).toMatch(/Próxima fase/);

    act(() => key('F7'));
    expect(store.getState().machine.cpuHalted).toBe(true);
    expect(stateBar().textContent).toBe(
      'CPU detenida (HLT): esperando interrupción — Esc para terminar │ Pausado'
    );
    expect(stateBar().classList.contains('halted')).toBe(true);
    expect(barKeys()).toEqual(['F10', 'Esc']);
    expect(phaseLine().textContent).toBe('■ HLT: esperando interrupción');
    expect(phaseLine().classList.contains('halted')).toBe(true);

    // Running, it stays halted (time passes for the peripherals only)
    act(() => key('F5'));
    await act(async () => {
      vi.advanceTimersByTime(store.getState().machine.velocity * 20);
    });
    expect(stateBar().textContent).toBe('CPU detenida (HLT): esperando interrupción — Esc para terminar');

    act(() => key('Escape'));
    expect(stateBar().textContent).toMatch(/^Detenido/);
    expect(stateBar().classList.contains('halted')).toBe(false);
    expect(barKeys()).toEqual(['F1', 'F5', 'F6', 'F7', 'F10', 'Esc']);
    expect(phaseLine().classList.contains('halted')).toBe(false);
  });

  test('the halted state in English', async () => {
    await renderApp({ settings: { lang: 'en' } });
    fireEvent.change(screen.getByLabelText('Programa'), { target: { value: 'ORG 2000h\nHLT\nEND' } });
    act(() => key('F7'));
    expect(stateBar().textContent).toBe('CPU halted (HLT): waiting for an interrupt — Esc to stop │ Paused');
    expect(phaseLine().textContent).toBe('■ HLT: waiting for an interrupt');
  });

  test('Options › ALU switches between MSX88 (the default) and the 8086', async () => {
    const store = await renderApp();
    expect(stateBar().textContent).not.toMatch(/ALU 8086/);
    menu('Opciones', /ALU/);
    let dialog = screen.getByRole('dialog', { name: 'ALU: MSX88 u 8086' });
    expect(within(dialog).getByLabelText('Como MSX88 (predeterminado)').checked).toBe(true);
    expect(within(dialog).getByText('PUSH SP')).toBeTruthy();
    expect(within(dialog).getByText('Apila 0000h.')).toBeTruthy();
    fireEvent.click(within(dialog).getByLabelText('Como un 8086 real'));
    expect(store.getState().machine.aluMode).toBe('msx88'); // only on OK
    fireEvent.click(within(dialog).getByRole('button', { name: 'Aceptar' }));
    expect(store.getState().settings.aluMode).toBe('8086');
    expect(store.getState().machine.aluMode).toBe('8086');
    expect(JSON.parse(window.localStorage.getItem('sim88.settings')).aluMode).toBe('8086');
    expect(stateBar().textContent).toMatch(/ALU 8086/);

    // PUSH SP now pushes SP - 2
    fireEvent.change(screen.getByLabelText('Programa'), { target: { value: 'ORG 2000h\nPUSH SP\nPOP AX\nINT 0\nEND' } });
    act(() => key('F7'));
    act(() => key('F7'));
    expect(registerValue('AX')).toBe('7F FE');

    menu('Opciones', /ALU/);
    dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByLabelText('Como MSX88 (predeterminado)'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Cancelar' }));
    expect(store.getState().machine.aluMode).toBe('8086');
  });

  test('Help › Differences from the 8086 explains the four cases and the current mode', async () => {
    await renderApp({ settings: { lang: 'en', aluMode: '8086' } });
    menu('Help', /Differences/);
    const dialog = screen.getByRole('dialog', { name: 'Differences between MSX88 and the 8086' });
    for (const row of ['INC, DEC', 'ADC, SBB (C = 1)', 'NOT', 'PUSH SP']) {
      expect(within(dialog).getByRole('rowheader', { name: row })).toBeTruthy();
    }
    expect(dialog.textContent).toMatch(/MSX88 is the default because it gives the same results as the original/);
    expect(dialog.textContent).toMatch(/Current mode: As a real 8086\./);
  });
});
