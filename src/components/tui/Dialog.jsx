import React, { useEffect, useId, useRef } from 'react';

import { useGrid } from './grid';
import { FrameBorders, Hot, hotkeyOf } from './Frame';

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]';

// A modal dialog: double frame with the title centered, focus kept inside,
// Esc closes, Enter in a text field submits, and Alt + a highlighted letter
// (or the letter alone, outside text fields) goes to that control.
export default function Dialog({ title, width = 50, onClose, onSubmit, buttons, children }) {
  const { cols, rows } = useGrid();
  const titleId = useId();
  const box = useRef(null);

  useEffect(() => {
    const previous = document.activeElement;
    const first =
      box.current.querySelector('[data-autofocus]') ||
      box.current.querySelector('input[type="radio"]:checked') ||
      box.current.querySelector('.dialog-body input, .dialog-body button') ||
      box.current.querySelector('.dialog-buttons button') ||
      box.current.querySelector(FOCUSABLE);
    first?.focus();
    return () => {
      if (previous && previous.isConnected) previous.focus();
    };
  }, []);

  const onKeyDown = (ev) => {
    if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      onClose();
      return;
    }
    if (ev.key === 'Tab') {
      const items = [...box.current.querySelectorAll(FOCUSABLE)].filter((el) => !el.closest('[hidden]'));
      // Radio buttons of a group are one stop.
      const stops = items.filter((el) => el.type !== 'radio' || el.checked || !items.some((o) => o !== el && o.type === 'radio' && o.name === el.name && o.checked));
      const i = stops.indexOf(document.activeElement);
      const next = ev.shiftKey ? (i <= 0 ? stops.length - 1 : i - 1) : (i + 1) % stops.length;
      ev.preventDefault();
      stops[next]?.focus();
      return;
    }
    if (ev.key === 'Enter' && ev.target.tagName === 'INPUT' && ev.target.type !== 'checkbox' && onSubmit) {
      ev.preventDefault();
      onSubmit();
      return;
    }
    const typing = ev.target.tagName === 'INPUT' && ev.target.type === 'text';
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && (ev.altKey || !typing)) {
      const letter = (ev.altKey && ev.code?.startsWith('Key') ? ev.code.slice(3) : ev.key).toLowerCase();
      const target = box.current.querySelector(`[data-hotkey="${CSS.escape(letter)}"]`);
      if (target) {
        ev.preventDefault();
        ev.stopPropagation();
        if (target.tagName === 'BUTTON') target.click();
        else {
          const control = target.matches('input') ? target : target.querySelector('input:checked, input');
          control?.focus();
          if (control?.type === 'checkbox') control.click();
        }
      }
    }
  };

  const w = Math.min(width, cols - 4);
  return (
    <div className="modal" onMouseDown={(ev) => ev.target === ev.currentTarget && onClose()}>
      <div
        ref={box}
        className="frame dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ '--x': Math.max(1, Math.floor((cols - w) / 2)), '--y': Math.max(2, Math.floor(rows / 6)), '--w': w }}
        onKeyDown={onKeyDown}
      >
        <FrameBorders title={title} titleId={titleId} center />
        <div className="dialog-body">{children}</div>
        {buttons && <div className="dialog-buttons">{buttons}</div>}
      </div>
    </div>
  );
}

// A button with a `~` hotkey in its label.
export function Button({ label, onClick, autoFocus, ...rest }) {
  return (
    <button
      type="button"
      className="btn"
      data-hotkey={hotkeyOf(label) || undefined}
      data-autofocus={autoFocus || undefined}
      onClick={onClick}
      {...rest}
    >
      <Hot text={label} />
    </button>
  );
}

// A group of radio buttons: ( ) and (•).
export function RadioGroup({ label, name, value, options, onChange, columns = false }) {
  const id = useId();
  return (
    <div
      className="frame group"
      role="radiogroup"
      aria-labelledby={id}
      data-hotkey={hotkeyOf(label) || undefined}
    >
      <FrameBorders double={false} title={<Hot text={label} />} titleId={id} />
      <div className={columns ? 'choices columns' : 'choices'}>
        {options.map((option) => (
          <label key={String(option.value)} className="choice">
            <input
              type="radio"
              name={name}
              value={String(option.value)}
              aria-label={option.label}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            <span aria-hidden="true">{option.value === value ? '(•)' : '( )'}</span>
            <span>{option.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

// A check box: [ ] and [X].
export function Checkbox({ label, checked, onChange }) {
  return (
    <label className="choice" data-hotkey={hotkeyOf(label) || undefined}>
      <input
        type="checkbox"
        aria-label={label.replace('~', '')}
        checked={checked}
        onChange={(ev) => onChange(ev.target.checked)}
      />
      <span aria-hidden="true">{checked ? '[X]' : '[ ]'}</span>
      <span>
        <Hot text={label} />
      </span>
    </label>
  );
}
