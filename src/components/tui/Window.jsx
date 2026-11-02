import React from 'react';

import { FrameBorders } from './Frame';

// A window of the desktop, placed on the grid. Clicking or focusing anything
// inside makes it the active window (double frame).
export default function Window({
  id,
  number,
  title,
  rect,
  active,
  onActivate,
  footer,
  className = '',
  bodyClassName = '',
  children,
}) {
  const titleId = `win-${id}-title`;
  return (
    <section
      className={`frame win ${className} ${active ? 'active' : ''}`}
      style={{ '--x': rect.x, '--y': rect.y, '--w': rect.w, '--h': rect.h }}
      aria-labelledby={titleId}
      data-window={id}
      onMouseDownCapture={() => onActivate(id)}
      onFocusCapture={() => onActivate(id)}
    >
      <FrameBorders double={active} title={title} titleId={titleId} number={number} footer={footer} center />
      <div className={`win-body ${bodyClassName}`}>{children}</div>
    </section>
  );
}
