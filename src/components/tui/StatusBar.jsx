import React from 'react';

// The bottom line: function keys (clickable) and the state of the machine.
// keys: [{ key: 'F5', label, action }]
export default function StatusBar({ keys, state }) {
  return (
    <div className="statusbar">
      {keys.map(({ key, label, action }) => (
        <button key={key} tabIndex={-1} onClick={action} aria-keyshortcuts={key} title={`${key} ${label}`}>
          <span className="hot">{key}</span> {label}
        </button>
      ))}
      <span className="state">
        {state}
      </span>
    </div>
  );
}
