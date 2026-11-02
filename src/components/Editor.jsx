import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import ace from 'ace-builds';
import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-assembly_x86';
import 'ace-builds/src-noconflict/ext-language_tools';

import '../styles/Editor.css';

import { changeText } from '../actions/editor';
import { MACHINE_STATES } from '../model/constants';
import { useGrid } from './tui/grid';
import { useT } from '../i18n';

// A text mode theme whose colors are the CSS variables of the current theme
// (see Editor.css), so it follows the theme selector.
ace.define('ace/theme/sim88', ['require', 'exports', 'module'], (require, exports) => {
  exports.isDark = true;
  exports.cssClass = 'ace-sim88';
  exports.cssText = '';
});

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

// The Ace editor inside the editor window. Reports the cursor position.
export default function Editor({ onCursor }) {
  const dispatch = useDispatch();
  const t = useT();
  const { fs, ch } = useGrid();
  const text = useSelector((state) => state.editor.text);
  const errorLine = useSelector((state) => state.editor.errorLine);
  const currentLine = useSelector((state) => state.machine.currentLine);
  const machineState = useSelector((state) => state.machine.state);
  const aceRef = useRef(null);
  const [, setReady] = useState(false);

  // Move the cursor to the line of an assembler error.
  useEffect(() => {
    const editor = aceRef.current && aceRef.current.editor;
    if (!editor || !errorLine) return;
    editor.gotoLine(errorLine);
    editor.focus();
  }, [errorLine]);

  // Line of the instruction being executed (the address -> line map of the assembler).
  const running = machineState !== MACHINE_STATES.STOPPED && currentLine;
  const markers = [];
  if (running) {
    markers.push({ startRow: currentLine - 1, endRow: currentLine - 1, startCol: 0, endCol: 1, className: 'running-line', type: 'fullLine' });
  }
  if (errorLine) {
    markers.push({ startRow: errorLine - 1, endRow: errorLine - 1, startCol: 0, endCol: 1, className: 'error-line', type: 'fullLine' });
  }

  // Bring the running line into view (a third from the top), in whole rows.
  useEffect(() => {
    const editor = aceRef.current && aceRef.current.editor;
    if (!editor || !running) return;
    const row = currentLine - 1;
    const { renderer } = editor;
    if (row >= renderer.getFirstFullyVisibleRow() && row <= renderer.getLastFullyVisibleRow()) return;
    const rows = Math.floor(renderer.$size.scrollerHeight / renderer.lineHeight);
    renderer.scrollToRow(Math.max(0, row - Math.floor(rows / 3)));
  }, [running, currentLine]);

  // Size of the grid: the font changes with the zoom.
  useEffect(() => {
    const editor = aceRef.current && aceRef.current.editor;
    if (!editor) return;
    editor.container.style.lineHeight = `${ch}px`;
    editor.renderer.updateFontSize();
    editor.resize();
  }, [fs, ch]);

  const onLoad = (editor) => {
    editor.container.style.lineHeight = `${ch}px`;
    editor.textInput.getElement().setAttribute('aria-label', t('editor.label'));
    if (reducedMotion()) editor.setOption('animatedScroll', false);
    const report = () => {
      const { row, column } = editor.getCursorPosition();
      onCursor?.({ line: row + 1, col: column + 1 });
    };
    editor.selection.on('changeCursor', report);
    // Text mode: scrolling moves whole lines.
    editor.session.on('changeScrollTop', (top) => {
      const { lineHeight } = editor.renderer;
      const snapped = Math.round(top / lineHeight) * lineHeight;
      if (lineHeight && snapped !== top) editor.session.setScrollTop(snapped);
    });
    report();
    setReady(true);
  };

  useEffect(() => {
    const editor = aceRef.current && aceRef.current.editor;
    if (editor) editor.textInput.getElement().setAttribute('aria-label', t('editor.label'));
  }, [t]);

  return (
    <AceEditor
      ref={aceRef}
      className="editor"
      mode="assembly_x86"
      theme="sim88"
      focus
      onChange={(value) => dispatch(changeText(value))}
      onLoad={onLoad}
      name="ACE_EDITOR"
      value={text}
      width="100%"
      height="100%"
      fontSize={fs}
      showPrintMargin={false}
      highlightActiveLine={false}
      markers={markers}
      editorProps={{
        $blockScrolling: Infinity,
      }}
      setOptions={{
        fontFamily: "'IBM VGA 8x16', monospace",
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        tabSize: 8,
        useSoftTabs: false,
        fixedWidthGutter: true,
        showFoldWidgets: false,
        cursorStyle: 'wide',
        scrollPastEnd: 0,
        vScrollBarAlwaysVisible: false,
      }}
    />
  );
}
