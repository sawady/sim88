// TIMER: event counter (MSX88 manual 7.5), ports 10h-11h.
//
//   10h CONT  counts the pulses of a 1 Hz clock
//   11h COMP  when CONT reaches COMP, the timer requests INT1 from the PIC
//
// CONT is not reset by the timer: the interrupt routine writes 0 to it, as
// the course programs do.

import { requestInterrupt } from './pic';

export const TIMER_BASE = 0x10;

export const initialTimer = () => ({ cont: 0, comp: 0 });

const withTimer = (devices, changes) => ({ ...devices, timer: { ...devices.timer, ...changes } });

export const timer = {
  name: 'timer',
  ports: [TIMER_BASE, TIMER_BASE + 1],
  read: (devices, port) => (port === TIMER_BASE ? devices.timer.cont : devices.timer.comp),
  write: (devices, port, value) =>
    withTimer(devices, port === TIMER_BASE ? { cont: value } : { comp: value }),
};

// One pulse of the 1 Hz clock.
export function timerPulse(devices) {
  const cont = (devices.timer.cont + 1) & 0xff;
  const next = withTimer(devices, { cont });
  return cont === devices.timer.comp ? requestInterrupt(next, 1) : next;
}
