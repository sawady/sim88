import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import { MEMORY_SIZE } from '../model/cpu';
import { hex8, hex16 } from '../model/format';

import '../styles/Memory.css';

// The memory view is virtualized: of the 65536 cells, only the visible ones
// (plus a few above and below) are rendered.
const ROW_HEIGHT = 28; // px, must match .memory .cell in Memory.css
const OVERSCAN = 8;

export default function Memory() {
  const mem = useSelector((state) => state.machine.cpu.mem);
  const ip = useSelector((state) => state.machine.cpu.ip);
  const sp = useSelector((state) => state.machine.cpu.regs.SP);
  const activeMemory = useSelector((state) => state.machine.activeMemory);
  const viewport = useRef(null);
  const [scrollTop, setScrollTop] = useState(ip * ROW_HEIGHT);
  const [height, setHeight] = useState(400);
  const [goTo, setGoTo] = useState('');

  const scrollToAddress = (address, { onlyIfHidden = false } = {}) => {
    const el = viewport.current;
    if (!el) return;
    const top = address * ROW_HEIGHT;
    const visible = top >= el.scrollTop && top + ROW_HEIGHT <= el.scrollTop + el.clientHeight;
    if (onlyIfHidden && visible) return;
    el.scrollTop = Math.max(0, top - el.clientHeight / 3);
  };

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setHeight(el.clientHeight));
    observer.observe(el);
    scrollToAddress(ip);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Follow IP
  useEffect(() => {
    scrollToAddress(ip, { onlyIfHidden: true });
  }, [ip]);

  const first = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const last = Math.min(MEMORY_SIZE - 1, Math.ceil((scrollTop + height) / ROW_HEIGHT) + OVERSCAN);
  const rows = [];
  for (let address = first; address <= last; address++) {
    rows.push(
      <div
        key={address}
        className={classNames('cell', {
          ip: address === ip,
          sp: address === sp,
          accessed: activeMemory.includes(address),
        })}
        style={{ top: address * ROW_HEIGHT }}
        title={address === sp ? 'SP' : undefined}
      >
        <div className="dir">{hex16(address)}</div>
        <div className="value">{hex8(mem[address])}</div>
      </div>
    );
  }

  const onGoTo = (ev) => {
    ev.preventDefault();
    const address = parseInt(goTo.replace(/h$/i, ''), 16);
    if (!Number.isNaN(address) && address >= 0 && address < MEMORY_SIZE) {
      scrollToAddress(address);
    }
  };

  return (
    <div className="memory frame">
      <div className="title">
        <span>Memoria</span>
      </div>
      <form className="goto" onSubmit={onGoTo}>
        <input
          aria-label="Ir a la dirección"
          placeholder="Ir a… 1000h"
          value={goTo}
          onChange={(ev) => setGoTo(ev.target.value)}
        />
      </form>
      <div
        className="viewport"
        ref={viewport}
        onScroll={(ev) => setScrollTop(ev.currentTarget.scrollTop)}
      >
        <div className="cells" style={{ height: MEMORY_SIZE * ROW_HEIGHT }}>
          {rows}
        </div>
      </div>
    </div>
  );
}
