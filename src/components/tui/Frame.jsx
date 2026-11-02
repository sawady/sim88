import React from 'react';

import { hotkey } from '../../i18n';

const LINES = {
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  single: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
};

const H_FILL = 400;
const V_FILL = 200;

// The borders of a box drawn with box characters, over its padding. The
// title is at the left (or centered), an optional number and footer at the
// right and left of the bottom line.
export function FrameBorders({ double = true, title, titleId, number, footer, center = false }) {
  const l = double ? LINES.double : LINES.single;
  const fill = l.h.repeat(H_FILL);
  const side = `${l.v}\n`.repeat(V_FILL);
  return (
    <>
      <div className={center ? 'frame-top frame-center' : 'frame-top'} aria-hidden={titleId ? undefined : true}>
        <span>{l.tl}</span>
        <span className="frame-fill left">{fill}</span>
        {title && (
          <span className="frame-title" id={titleId}>
            {' '}
            {title}{' '}
          </span>
        )}
        <span className="frame-fill">{fill}</span>
        {number !== undefined && (
          <span className="frame-title" aria-hidden="true">
            {String(number)}
          </span>
        )}
        {number !== undefined && <span>{l.h}</span>}
        <span>{l.tr}</span>
      </div>
      <div className="frame-side left" aria-hidden="true">
        {side}
      </div>
      <div className="frame-side right" aria-hidden="true">
        {side}
      </div>
      <div className="frame-bottom" aria-hidden="true">
        <span>{l.bl}</span>
        {footer ? (
          <>
            <span>{l.h.repeat(2)}</span>
            <span className="frame-title">{` ${footer} `}</span>
          </>
        ) : null}
        <span className="frame-fill">{fill}</span>
        <span>{l.br}</span>
      </div>
    </>
  );
}

// A box inside a window or a dialog, with a single line frame.
export function Group({ title, titleId, className = '', children, ...rest }) {
  return (
    <div className={`frame group ${className}`} {...rest}>
      <FrameBorders double={false} title={title} titleId={titleId} />
      {children}
    </div>
  );
}

// A text with a `~` hotkey mark: the letter after it is highlighted.
export function Hot({ text }) {
  const { before, key, after } = hotkey(text);
  if (!key) return before;
  return (
    <>
      {before}
      <span className="hot">{key}</span>
      {after}
    </>
  );
}

export const hotkeyOf = (text) => hotkey(text).key.toLowerCase();
