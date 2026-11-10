import React, { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';

import { FrameBorders, Hot, hotkeyOf } from './Frame';

// The menu bar with its pull-down menus, as in Turbo Pascal: Alt + the
// highlighted letter opens a menu (Alt alone goes to the bar), arrows move,
// Enter runs, Esc closes. The mouse works too.
//
// menus: [{ id, label, items: [{ id, label, shortcut, action, disabled,
//   checked, separator }] }]. Labels carry a `~` before the hotkey letter.
const MenuBar = forwardRef(function MenuBar({ menus, title, onOpenChange }, ref) {
  const [open, setOpen] = useState(null);
  const [current, setCurrent] = useState(0); // bar item with tabIndex 0
  const bar = useRef(null);
  const barItems = useRef([]);
  const menuItems = useRef([]);
  const before = useRef(null); // element focused before the menu bar
  const focusItem = useRef(0);

  const remember = () => {
    const active = document.activeElement;
    if (active && !bar.current.contains(active)) before.current = active;
  };
  const restore = () => {
    const el = before.current;
    before.current = null;
    if (el && el.isConnected) el.focus();
  };

  // The menu is drawn and focused before the next key arrives.
  const openMenu = (i, item = 0) => {
    remember();
    focusItem.current = item;
    flushSync(() => {
      setCurrent(i);
      setOpen(i);
    });
  };
  const close = (refocus = true) => {
    setOpen(null);
    if (refocus) restore();
  };

  useImperativeHandle(ref, () => ({
    openByHotkey(letter) {
      const i = menus.findIndex((m) => hotkeyOf(m.label) === letter.toLowerCase());
      if (i >= 0) openMenu(i);
      return i >= 0;
    },
    focusBar() {
      remember();
      setOpen(null);
      barItems.current[current]?.focus();
    },
  }));

  useLayoutEffect(() => onOpenChange?.(open !== null), [open, onOpenChange]);

  // Focus the first (or last) usable item of the open menu.
  const enabled = (menu) =>
    menu.items.map((item, i) => (!item.separator && !item.disabled ? i : -1)).filter((i) => i >= 0);
  useLayoutEffect(() => {
    if (open === null) return;
    const usable = enabled(menus[open]);
    const target = focusItem.current === -1 ? usable[usable.length - 1] : usable[0];
    menuItems.current[target]?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // A click outside closes the menu.
  useEffect(() => {
    if (open === null) return undefined;
    const onDown = (ev) => {
      if (!bar.current.contains(ev.target)) close(false);
    };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  });

  const run = (item) => {
    if (item.disabled || item.separator) return;
    close();
    item.action();
  };

  const onBarKeyDown = (ev, i) => {
    const n = menus.length;
    if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
      ev.preventDefault();
      const next = (i + (ev.key === 'ArrowRight' ? 1 : n - 1)) % n;
      setCurrent(next);
      barItems.current[next].focus();
    } else if (ev.key === 'ArrowDown' || ev.key === 'Enter' || ev.key === ' ') {
      ev.preventDefault();
      openMenu(i);
    } else if (ev.key === 'ArrowUp') {
      ev.preventDefault();
      openMenu(i, -1);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      restore();
    } else if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) {
      const j = menus.findIndex((m) => hotkeyOf(m.label) === ev.key.toLowerCase());
      if (j >= 0) {
        ev.preventDefault();
        openMenu(j);
      }
    }
  };

  const onMenuKeyDown = (ev) => {
    const menu = menus[open];
    const usable = enabled(menu);
    const at = usable.indexOf(menuItems.current.indexOf(document.activeElement));
    const focus = (k) => menuItems.current[usable[(k + usable.length) % usable.length]].focus();
    const n = menus.length;
    switch (ev.key) {
      case 'ArrowDown':
        focus(at + 1);
        break;
      case 'ArrowUp':
        focus(at - 1);
        break;
      case 'Home':
        focus(0);
        break;
      case 'End':
        focus(usable.length - 1);
        break;
      case 'ArrowRight':
      case 'ArrowLeft':
        openMenu((open + (ev.key === 'ArrowRight' ? 1 : n - 1)) % n);
        break;
      case 'Escape':
        setOpen(null);
        barItems.current[open].focus();
        break;
      case 'Tab':
        close();
        break;
      default: {
        if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey) return;
        const item = menu.items.find((it) => !it.separator && !it.disabled && hotkeyOf(it.label) === ev.key.toLowerCase());
        if (!item) return;
        ev.preventDefault();
        ev.stopPropagation();
        run(item);
        return;
      }
    }
    ev.preventDefault();
    ev.stopPropagation();
  };

  const left = open !== null && barItems.current[open] ? barItems.current[open].offsetLeft : 0;

  return (
    <div className="menubar" ref={bar}>
      <div role="menubar" aria-label="SIM88" className="menubar-items">
        {menus.map((menu, i) => (
          <button
            key={menu.id}
            ref={(el) => (barItems.current[i] = el)}
            className="menubar-item"
            role="menuitem"
            aria-haspopup="true"
            aria-expanded={open === i}
            tabIndex={i === current ? 0 : -1}
            onKeyDown={(ev) => onBarKeyDown(ev, i)}
            onMouseDown={(ev) => {
              ev.preventDefault();
              if (open === i) close();
              else openMenu(i);
            }}
            // only a real mouse: after a tap, the mouse events that browsers
            // send would open the menu here and close it again in onMouseDown
            onPointerEnter={(ev) => ev.pointerType === 'mouse' && open !== null && open !== i && openMenu(i)}
          >
            <Hot text={menu.label} />
          </button>
        ))}
      </div>
      {title && <span className="menubar-title">{title}</span>}
      {open !== null && (
        <div
          className="frame menu"
          role="menu"
          aria-label={menus[open].label.replace('~', '')}
          style={{ left, top: 'var(--bar-h)' }}
          onKeyDown={onMenuKeyDown}
        >
          <FrameBorders double={false} />
          {menus[open].items.map((item, j) =>
            item.separator ? (
              <div key={`sep-${j}`} className="menu-separator" role="separator">
                <span aria-hidden="true">
                  <span>├</span>
                  <span className="frame-fill">{'─'.repeat(200)}</span>
                  <span>┤</span>
                </span>
              </div>
            ) : (
              <button
                key={item.id}
                ref={(el) => (menuItems.current[j] = el)}
                className="menu-item"
                role={item.checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
                aria-checked={item.checked === undefined ? undefined : item.checked}
                aria-disabled={item.disabled || undefined}
                aria-keyshortcuts={item.shortcut}
                tabIndex={-1}
                onClick={() => run(item)}
                onMouseEnter={(ev) => !item.disabled && ev.currentTarget.focus()}
              >
                <span className="label">
                  {item.checked !== undefined && (item.checked ? '√ ' : '  ')}
                  <Hot text={item.label} />
                </span>
                {item.shortcut && <span className="shortcut">{item.shortcut}</span>}
              </button>
            )
          )}
        </div>
      )}
    </div>
  );
});

export default MenuBar;
