import React, { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import MenuBar from './tui/MenuBar';
import StatusBar from './tui/StatusBar';
import Window from './tui/Window';
import { GridContext, layout, useTextGrid } from './tui/grid';
import CPU from './CPU';
import Memory from './Memory';
import Screen from './Screen';
import Peripherals from './Peripherals';
import {
  AboutDialog,
  AluDialog,
  AluHelpDialog,
  AppearanceDialog,
  ConfigDialog,
  ConfirmDialog,
  FrequencyDialog,
  KeysDialog,
  LanguageDialog,
  SaveAsDialog,
} from './Dialogs';

import { MACHINE_STATES } from '../model/constants';
import { EXAMPLES } from '../examples';
import { useT, translateMessage } from '../i18n';
import {
  DEFAULT_FILE_NAME,
  setTitle,
  newFile,
  readFile,
  writeFile,
  writeNewFile,
  loadInitialProgram,
  loadExample,
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
  timerPulse,
  toggleSwitch,
  setConfig,
} from '../actions/machine';
import { loadSavedSettings } from '../actions/settings';

import '../styles/tui.css';
import '../styles/Editor.css';

// The Ace editor is most of the bundle: it loads in its own chunk.
const Editor = lazy(() => import('./Editor'));

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

const WINDOW_NUMBERS = { editor: 1, cpu: 2, memory: 3, screen: 4, peripherals: 5 };

// What gets the focus when a window is chosen with Alt+number.
const focusWindow = (id) => {
  const win = document.querySelector(`[data-window="${id}"]`);
  if (!win) return;
  const target =
    win.querySelector('textarea') || win.querySelector('.viewport, pre, input, button') || win.querySelector('[tabindex]');
  target?.focus();
};

export default function App() {
  const t = useT();
  const dispatch = useDispatch();
  const filepath = useSelector((state) => state.editor.filepath);
  const text = useSelector((state) => state.editor.text);
  const assemblerError = useSelector((state) => state.editor.error);
  const errorLine = useSelector((state) => state.editor.errorLine);
  const { state: machineState, velocity, message, error, waitingInput, cpuHalted } = useSelector((s) => s.machine);
  const strict = useSelector((state) => state.editor.strict);
  const config = useSelector((state) => state.machine.bus.config);
  const settings = useSelector((state) => state.settings);
  const fileInput = useRef(null);
  const menuBar = useRef(null);
  const [dialog, setDialog] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeWindow, setActiveWindow] = useState('editor');
  const [cursor, setCursor] = useState({ line: 1, col: 1 });

  const grid = useTextGrid(settings.zoom);
  const { windows, mode, rows } = layout(grid.cols, grid.rows);

  // Theme, CRT effect, language and the size of the grid go on <html>.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = settings.theme;
    root.dataset.crt = settings.crt ? 'on' : 'off';
    root.lang = settings.lang;
    root.style.setProperty('--fs', `${grid.fs}px`);
    root.style.setProperty('--cw', `${grid.cw}px`);
    root.style.setProperty('--ch', `${grid.ch}px`);
    root.style.setProperty('--px', `${grid.fs / 16}px`);
    document.body.classList.toggle('stacked', mode === 'stacked');
  }, [settings.theme, settings.crt, settings.lang, grid.fs, grid.cw, grid.ch, mode]);

  const close = useCallback(() => setDialog(null), []);

  const runLabel =
    machineState === MACHINE_STATES.RUNNING ? 'pause' : machineState === MACHINE_STATES.PAUSED ? 'resume' : 'run';

  const actions = {
    newFile: () => dispatch(newFile()),
    openFile: () => fileInput.current.click(),
    saveFile: () => dispatch(writeFile(filepath || DEFAULT_FILE_NAME, text)),
    saveFileAs: () =>
      setDialog({ type: 'saveAs', name: filepath || DEFAULT_FILE_NAME, onSave: (name) => dispatch(writeNewFile(name, text)) }),
    stop: () => dispatch(stop()),
    reset: () => dispatch(reset()),
    stepPhase: () => dispatch(stepPhase(text)),
    stepInstruction: () => dispatch(stepInstruction(text)),
    stepBack: () => dispatch(stepBack()),
    runPauseResume: () => {
      if (machineState === MACHINE_STATES.RUNNING) dispatch(pause());
      else if (machineState === MACHINE_STATES.PAUSED) dispatch(resume());
      else dispatch(start(text));
    },
    toggleStrict: () => dispatch(setStrict(!strict)),
    loadExample: (example) => {
      const unsaved = text.trim() && !EXAMPLES.some((e) => e.source === text);
      const title = t(`example.${example.id}`);
      if (!unsaved) dispatch(loadExample(example.id));
      else {
        setDialog({
          type: 'confirm',
          title: t('dlg.replace.title'),
          text: t('dlg.replace.text', { title }),
          onYes: () => dispatch(loadExample(example.id)),
        });
      }
    },
    pressF10: () => dispatch(pressF10()),
    timerPulse: () => dispatch(timerPulse()),
    toggleSwitch: (n) => dispatch(toggleSwitch(n)),
    increase: () => dispatch(increaseVelocity()),
    decrease: () => dispatch(decreaseVelocity()),
    help: () => setDialog({ type: 'keys' }),
  };

  const menus = [
    {
      id: 'file',
      label: t.marked('menu.file'),
      items: [
        { id: 'new', label: t.marked('menu.file.new'), shortcut: 'Ctrl+N', action: actions.newFile },
        { id: 'open', label: t.marked('menu.file.open'), shortcut: 'Ctrl+O', action: actions.openFile },
        { id: 'save', label: t.marked('menu.file.save'), shortcut: 'Ctrl+S', action: actions.saveFile },
        { id: 'saveAs', label: t.marked('menu.file.saveAs'), shortcut: 'Ctrl+Shift+S', action: actions.saveFileAs },
      ],
    },
    {
      id: 'examples',
      label: t.marked('menu.examples'),
      items: EXAMPLES.map((example, i) => ({
        id: example.id,
        label: `~${i + 1} ${t(`example.${example.id}`)}`,
        action: () => actions.loadExample(example),
      })),
    },
    {
      id: 'run',
      label: t.marked('menu.run'),
      items: [
        { id: 'run', label: t.marked(`menu.run.${runLabel}`), shortcut: 'F5', action: actions.runPauseResume },
        { id: 'step', label: t.marked('menu.run.step'), shortcut: 'F7', action: actions.stepInstruction },
        { id: 'microStep', label: t.marked('menu.run.microStep'), shortcut: 'F6', action: actions.stepPhase },
        { id: 'back', label: t.marked('menu.run.back'), shortcut: 'Shift+F7', action: actions.stepBack },
        { id: 'stop', label: t.marked('menu.run.stop'), shortcut: 'Esc', action: actions.stop },
        { id: 'reset', label: t.marked('menu.run.reset'), shortcut: 'F8', action: actions.reset },
        { separator: true },
        { id: 'interrupt', label: t.marked('menu.run.interrupt'), shortcut: 'F10', action: actions.pressF10 },
        { id: 'pulse', label: t.marked('menu.run.pulse'), action: actions.timerPulse },
        { separator: true },
        { id: 'faster', label: t.marked('menu.run.faster'), shortcut: '+', action: actions.increase },
        { id: 'slower', label: t.marked('menu.run.slower'), shortcut: '-', action: actions.decrease },
      ],
    },
    {
      id: 'options',
      label: t.marked('menu.options'),
      items: [
        { id: 'config', label: t.marked('menu.options.config'), action: () => setDialog({ type: 'config' }) },
        { id: 'strict', label: t.marked('menu.options.strict'), checked: strict, action: actions.toggleStrict },
        { id: 'frequencies', label: t.marked('menu.options.simulation'), action: () => setDialog({ type: 'frequency' }) },
        { id: 'alu', label: t.marked('menu.options.alu'), action: () => setDialog({ type: 'alu' }) },
        { separator: true },
        { id: 'appearance', label: t.marked('menu.options.appearance'), action: () => setDialog({ type: 'appearance' }) },
        { id: 'language', label: t.marked('menu.options.language'), action: () => setDialog({ type: 'language' }) },
      ],
    },
    {
      id: 'help',
      label: t.marked('menu.help'),
      items: [
        { id: 'keys', label: t.marked('menu.help.keys'), shortcut: 'F1', action: actions.help },
        { id: 'alu', label: t.marked('menu.help.alu'), action: () => setDialog({ type: 'aluHelp' }) },
        { id: 'about', label: t.marked('menu.help.about'), action: () => setDialog({ type: 'about' }) },
      ],
    },
  ];

  const actionsRef = useRef(actions);
  actionsRef.current = actions;
  const blocked = useRef(false);
  blocked.current = dialog !== null || menuOpen;
  const altAlone = useRef(false);

  const onKeyDown = useCallback((ev) => {
    const a = actionsRef.current;
    if (ev.key === 'Alt') {
      altAlone.current = true;
      return;
    }
    altAlone.current = false;
    if (blocked.current) return;
    // Alt + the hotkey of a menu, Alt + the number of a window.
    if (ev.altKey && !ev.ctrlKey && !ev.metaKey) {
      const letter = ev.code?.startsWith('Key') ? ev.code.slice(3).toLowerCase() : ev.key.toLowerCase();
      const digit = ev.code?.startsWith('Digit') ? ev.code.slice(5) : ev.key;
      const id = Object.keys(WINDOW_NUMBERS).find((w) => String(WINDOW_NUMBERS[w]) === digit);
      if (id) {
        ev.preventDefault();
        ev.stopPropagation();
        setActiveWindow(id);
        focusWindow(id);
        return;
      }
      if (menuBar.current?.openByHotkey(letter)) {
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
    }
    const bindings = [
      [{ key: 'n', ctrl: true }, a.newFile],
      [{ key: 'o', ctrl: true }, a.openFile],
      [{ key: 's', ctrl: true }, a.saveFile],
      [{ key: 'g', ctrl: true }, a.saveFile],
      [{ key: 's', ctrl: true, shift: true }, a.saveFileAs],
      [{ key: 'g', ctrl: true, shift: true }, a.saveFileAs],
      [{ key: 'f1' }, a.help],
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
      // Handled here: the editor must not get it too (Ace has its own Alt and F keys).
      ev.preventDefault();
      ev.stopPropagation();
      found[1]();
    }
  }, []);

  // Alt pressed and released alone goes to the menu bar.
  const onKeyUp = useCallback((ev) => {
    if (ev.key === 'Alt' && altAlone.current && !blocked.current) {
      ev.preventDefault();
      menuBar.current?.focusBar();
    }
    altAlone.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
    };
  }, [onKeyDown, onKeyUp]);

  useEffect(() => {
    setTitle(DEFAULT_FILE_NAME);
    dispatch(loadSavedSettings());
    dispatch(reset());
    dispatch(loadInitialProgram());
    dispatch(setStrict(loadStrictPreference()));
  }, [dispatch]);

  const onFileChosen = (ev) => {
    const file = ev.target.files[0];
    ev.target.value = '';
    dispatch(readFile(file));
  };

  // Errors of the assembler (with the line) and of the simulator, and its
  // messages, in the language of the UI.
  const lang = t.lang;
  let shownError = null;
  if (assemblerError) {
    const translated = translateMessage(lang, assemblerError);
    shownError = errorLine ? t('editor.errorAt', { line: errorLine, message: translated }) : translated;
  } else if (error) {
    shownError = t('editor.runtimeError', { message: translateMessage(lang, error) });
  }
  const shownMessage = !shownError && message ? translateMessage(lang, message) : null;

  // After HLT the CPU waits for an interrupt (as MSX88, even when none can
  // come): the status bar says so for as long as it lasts, and keeps only
  // the two keys that end the wait (F10 interrupts, Esc stops), so the whole
  // text fits.
  const halted = cpuHalted && machineState !== MACHINE_STATES.STOPPED;
  const allKeys = [
    { key: 'F1', label: t('keys.help'), action: actions.help },
    { key: 'F5', label: t(`keys.${runLabel}`), action: actions.runPauseResume },
    { key: 'F6', label: t('keys.microStep'), action: actions.stepPhase },
    { key: 'F7', label: t('keys.step'), action: actions.stepInstruction },
    { key: 'F10', label: t('keys.interrupt'), action: actions.pressF10 },
    { key: 'Esc', label: t('keys.stop'), action: actions.stop },
  ];
  const keys = halted ? allKeys.filter(({ key }) => key === 'F10' || key === 'Esc') : allKeys;
  const stateText = (
    halted
      ? [t('state.halted'), machineState === MACHINE_STATES.PAUSED && t('state.PAUSED')]
      : [
          t(`state.${machineState}`),
          t('state.speed', { ms: velocity }),
          strict && t('state.strict'),
          settings.aluMode === '8086' && t('state.alu8086'),
        ]
  )
    .filter(Boolean)
    .join(' │ ');

  const win = (id, title, props, children) => (
    <Window
      id={id}
      number={WINDOW_NUMBERS[id]}
      title={title}
      rect={windows[id]}
      active={activeWindow === id}
      onActivate={setActiveWindow}
      {...props}
    >
      {children}
    </Window>
  );

  const fileName = (filepath || DEFAULT_FILE_NAME).toUpperCase();
  const desktopText = '░'.repeat(grid.cols * rows);

  return (
    <GridContext.Provider value={{ ...grid, rows }}>
      <div className="screen" style={{ '--cols': grid.cols, '--rows': rows }}>
        <div className="desktop" aria-hidden="true">
          {desktopText}
        </div>
        <input style={{ display: 'none' }} ref={fileInput} type="file" onChange={onFileChosen} accept=".txt,.asm" />
        <MenuBar ref={menuBar} menus={menus} title="SIM88" onOpenChange={setMenuOpen} />
        <main>
          {win(
            'editor',
            fileName,
            { className: 'editor', bodyClassName: 'editor-window', footer: t('win.position', cursor) },
            <>
              {shownError && (
                <div className="editor-bar error" role="alert">
                  {shownError}
                </div>
              )}
              {shownMessage && (
                <div className="editor-bar message" role="status">
                  {shownMessage}
                </div>
              )}
              <div className="editor-host">
                <Suspense fallback={<div className="editor-loading">{t('app.loadingEditor')}</div>}>
                  <Editor onCursor={setCursor} />
                </Suspense>
              </div>
            </>
          )}
          {win('cpu', t('win.cpu'), {}, <CPU />)}
          {win('memory', t('win.memory'), {}, <Memory />)}
          {win(
            'screen',
            t('win.screen'),
            { className: 'console', footer: waitingInput ? t('screen.waiting') : undefined },
            <Screen />
          )}
          {win('peripherals', t('win.peripherals'), { bodyClassName: 'scroll' }, <Peripherals />)}
        </main>
        <StatusBar keys={keys} state={stateText} halted={halted} />
        {dialog?.type === 'config' && (
          <ConfigDialog config={config} onChoose={(c) => dispatch(setConfig(c))} onClose={close} />
        )}
        {dialog?.type === 'frequency' && <FrequencyDialog onClose={close} />}
        {dialog?.type === 'alu' && <AluDialog onClose={close} />}
        {dialog?.type === 'aluHelp' && <AluHelpDialog onClose={close} />}
        {dialog?.type === 'appearance' && <AppearanceDialog onClose={close} />}
        {dialog?.type === 'language' && <LanguageDialog onClose={close} />}
        {dialog?.type === 'keys' && <KeysDialog onClose={close} />}
        {dialog?.type === 'about' && <AboutDialog onClose={close} />}
        {dialog?.type === 'confirm' && <ConfirmDialog {...dialog} onClose={close} />}
        {dialog?.type === 'saveAs' && <SaveAsDialog {...dialog} onClose={close} />}
      </div>
    </GridContext.Provider>
  );
}
