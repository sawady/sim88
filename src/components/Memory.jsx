import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import { MEMORY_SIZE } from '../model/cpu';
import { hex8, hex16 } from '../model/format';
import { useGrid } from './tui/grid';
import { useT } from '../i18n';

import '../styles/Memory.css';

// The memory view is virtualized: of the 65536 cells, only the visible ones
// (plus a few above and below) are rendered. One cell per text row.
const OVERSCAN = 8;

export default function Memory() {
  const t = useT();
  const { ch: rowHeight } = useGrid();
  const mem = useSelector((state) => state.machine.cpu.mem);
  const ip = useSelector((state) => state.machine.cpu.ip);
  const sp = useSelector((state) => state.machine.cpu.regs.SP);
  const activeMemory = useSelector((state) => state.machine.activeMemory);
  const viewport = useRef(null);
  const [scrollTop, setScrollTop] = useState(ip * rowHeight);
  const [height, setHeight] = useState(400);
  const [goTo, setGoTo] = useState('');
  const [invalid, setInvalid] = useState(false);

  const scrollToAddress = (address, { onlyIfHidden = false } = {}) => {
    const el = viewport.current;
    if (!el) return;
    const top = address * rowHeight;
    const visible = top >= el.scrollTop && top + rowHeight <= el.scrollTop + el.clientHeight;
    if (onlyIfHidden && visible) return;
    // Whole rows, so the cells stay on the text grid.
    const rows = Math.floor(el.clientHeight / rowHeight / 3);
    el.scrollTop = Math.max(0, (address - rows) * rowHeight);
  };

  useLayoutEffect(() => {
    const el = viewport.current;
    if (!el) return undefined;
    const observer = new ResizeObserver(() => setHeight(el.clientHeight));
    observer.observe(el);
    scrollToAddress(ip);
    // Text mode: after scrolling, whole rows.
    const snap = () => {
      const snapped = Math.round(el.scrollTop / rowHeight) * rowHeight;
      if (snapped !== el.scrollTop) el.scrollTop = snapped;
    };
    el.addEventListener('scrollend', snap);
    return () => {
      observer.disconnect();
      el.removeEventListener('scrollend', snap);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowHeight]);

  // Follow IP
  useEffect(() => {
    scrollToAddress(ip, { onlyIfHidden: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ip]);

  const first = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN);
  const last = Math.min(MEMORY_SIZE - 1, Math.ceil((scrollTop + height) / rowHeight) + OVERSCAN);
  const rows = [];
  for (let address = first; address <= last; address++) {
    const marks = [address === ip && '◄IP', address === sp && 'SP'].filter(Boolean).join(' ');
    rows.push(
      <div
        key={address}
        className={classNames('cell', {
          ip: address === ip,
          sp: address === sp,
          accessed: activeMemory.includes(address),
        })}
        style={{ top: address * rowHeight }}
      >
        <span className="dir">{hex16(address)}</span> <span className="value">{hex8(mem[address])}</span>
        {marks && <span className="mark"> {marks}</span>}
      </div>
    );
  }

  const onGoTo = (ev) => {
    ev.preventDefault();
    const address = parseInt(goTo.trim().replace(/h$/i, ''), 16);
    const ok = /^[0-9a-f]{1,4}h?$/i.test(goTo.trim()) && address >= 0 && address < MEMORY_SIZE;
    setInvalid(!ok);
    if (ok) scrollToAddress(address);
  };

  return (
    <div className="memory">
      <form className="goto" onSubmit={onGoTo}>
        <label htmlFor="memory-goto">{t('memory.goTo')} </label>
        <input
          id="memory-goto"
          className="field"
          style={{ '--size': 8 }}
          aria-label={t('memory.goToLabel')}
          aria-invalid={invalid || undefined}
          value={goTo}
          maxLength={5}
          spellCheck={false}
          autoComplete="off"
          onChange={(ev) => {
            setGoTo(ev.target.value);
            setInvalid(false);
          }}
        />
      </form>
      <div className={invalid ? 'goto-error' : 'rule'} role={invalid ? 'alert' : undefined} aria-hidden={!invalid}>
        {invalid ? t('memory.invalid') : '─'.repeat(40)}
      </div>
      <div
        className="viewport"
        ref={viewport}
        tabIndex={0}
        aria-label={t('memory.cells')}
        onScroll={(ev) => setScrollTop(ev.currentTarget.scrollTop)}
      >
        <div className="cells" style={{ height: MEMORY_SIZE * rowHeight }}>
          {rows}
        </div>
      </div>
    </div>
  );
}
