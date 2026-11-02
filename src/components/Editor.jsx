import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import AceEditor from 'react-ace';

import 'ace-builds/src-noconflict/mode-assembly_x86';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';

import '../styles/Editor.css';

import { changeText } from '../actions/editor';

export default function Editor() {
  const dispatch = useDispatch();
  const text = useSelector((state) => state.editor.text);
  const line = useSelector((state) => state.editor.line);
  const aceRef = useRef(null);

  useEffect(() => {
    const editor = aceRef.current && aceRef.current.editor;
    if (!editor) return;
    if (line) editor.gotoLine(line);
    editor.focus();
  }, [line]);

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
