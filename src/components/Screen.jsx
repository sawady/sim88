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

  return (
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
  );
}
