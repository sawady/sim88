import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-assembly_x86';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

import '../styles/Editor.css';

import { changeText } from '../actions/editor';
import { MACHINE_STATES } from '../model/constants';

export default function Editor() {
  const dispatch = useDispatch();
  const text = useSelector((state) => state.editor.text);
  const errorLine = useSelector((state) => state.editor.errorLine);
  const currentLine = useSelector((state) => state.machine.currentLine);
  const machineState = useSelector((state) => state.machine.state);
  const aceRef = useRef(null);

  // Move the cursor to the line of an assembler error.
  useEffect(() => {
    const editor = aceRef.current && aceRef.current.editor;
    if (!editor || !errorLine) return;
    editor.gotoLine(errorLine);
    editor.focus();
  }, [errorLine]);

  // Line of the instruction being executed (the address -> line map of the assembler).
  const running = machineState !== MACHINE_STATES.STOPPED && currentLine;
  const markers = running
    ? [{ startRow: currentLine - 1, endRow: currentLine - 1, startCol: 0, endCol: 1, className: 'running-line', type: 'fullLine' }]
    : [];

  useEffect(() => {
    const editor = aceRef.current && aceRef.current.editor;
    if (editor && running) editor.scrollToLine(currentLine - 1, true, true, () => {});
  }, [running, currentLine]);

  return (
    <AceEditor
      ref={aceRef}
      className="editor"
      mode="assembly_x86"
      focus
      theme="monokai"
      onChange={(value) => dispatch(changeText(value))}
      name="ACE_EDITOR"
      value={text}
      fontSize={18}
      showPrintMargin={false}
      markers={markers}
      editorProps={{
        $blockScrolling: Infinity,
      }}
      setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        tabSize: 2,
      }}
    />
  );
}
