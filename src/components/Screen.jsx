import React, { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { typeKey } from '../actions/machine';
import { useT } from '../i18n';

import '../styles/Screen.css';

// The screen of INT 7 and the keyboard of INT 6: while INT 6 waits for a
// key, the screen takes the keyboard focus.
export default function Screen() {
  const t = useT();
  const dispatch = useDispatch();
  const { output, waitingInput } = useSelector((s) => s.machine);
  const screen = useRef(null);

  useEffect(() => {
    if (waitingInput && screen.current) screen.current.focus();
  }, [waitingInput]);

  useEffect(() => {
    if (screen.current) screen.current.scrollTop = screen.current.scrollHeight;
  }, [output]);

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

  // The field for phones (see Screen.css). Their keyboards don't say which
  // key was pressed, only what was written, except for Enter and Backspace.
  const onSoftKeyDown = (ev) => {
    if (ev.key !== 'Enter' && ev.key !== 'Backspace') return;
    ev.preventDefault();
    dispatch(typeKey(ev.key === 'Enter' ? 13 : 8));
  };
  const onSoftInput = (ev) => {
    for (const char of ev.target.value) {
      if (char.charCodeAt(0) <= 255) dispatch(typeKey(char.charCodeAt(0)));
    }
    ev.target.value = '';
  };

  return (
    <div className="screen-panel">
      <pre
        ref={screen}
        className={waitingInput ? 'screen-output waiting' : 'screen-output'}
        tabIndex={0}
        aria-label={t('screen.label')}
        onKeyDown={onKeyDown}
      >
        {output}
        <span className="cursor" aria-hidden="true">
          _
        </span>
      </pre>
      <input
        className="field screen-keyboard"
        type="text"
        placeholder={t('screen.tapToType')}
        aria-label={t('screen.tapToType')}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        onKeyDown={onSoftKeyDown}
        onInput={onSoftInput}
      />
    </div>
  );
}
