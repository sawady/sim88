import React, { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';

import '../styles/Memory.css';

// Keep a few cells of context above the current instruction when scrolling.
const SCROLL_OFFSET = 5;

export default function Memory() {
  const memory = useSelector((state) => state.machine.memory);
  const IP = useSelector((state) => state.machine.IP);
  const scrollTarget = useRef(null);

  useEffect(() => {
    if (scrollTarget.current) scrollTarget.current.scrollIntoView({ block: 'nearest' });
  }, [IP.value]);

  return (
    <div className="memory frame">
      <div className="title">
        <span>Memory</span>
      </div>
      {memory.map((cell) => (
        <div
          key={cell.dir}
          ref={cell.dir - SCROLL_OFFSET === IP.value ? scrollTarget : undefined}
          className={cell.dir === IP.value ? 'cell active' : 'cell'}
        >
          <div className="dir">{cell.renderDir()}</div>
          <div className="value">{cell.renderValue()}</div>
        </div>
      ))}
    </div>
  );
}
