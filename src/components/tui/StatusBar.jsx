import React from 'react';
import classNames from 'classnames';

// The bottom line: function keys (clickable) and the state of the machine.
// keys: [{ key: 'F5', label, action }]. `halted` marks the state as the CPU
// waiting after HLT (shown in colors of its own, and read by screen readers).
export default function StatusBar({ keys, state, halted = false }) {
  return (
    <div className="statusbar">
      {keys.map(({ key, label, action }) => (
        <button key={key} tabIndex={-1} onClick={action} aria-keyshortcuts={key} title={`${key} ${label}`}>
          <span className="hot">{key}</span> {label}
        </button>
      ))}
      <span className={classNames('state', { halted })} title={state} aria-live="polite">
        {state}
      </span>
    </div>
  );
}
