// Printer (MSX88 manual 7.9): ASCII, 20 columns, a buffer of 4 characters
// (on MSX88 V-3.1 BUSY goes to 1 when the 4th character arrives before
// anything is printed: tests/fidelity, exp-printer-buffer).
// It is driven through a Centronics interface: STROBE (data valid) and
// BUSY (it cannot take data: the buffer is full).
//
// CR is ignored and only LF starts a new line, as on MSX88.
//
// It prints one character from the buffer every `interval` instructions
// (PRINT_INTERVAL by default; the UI lets the user change it), so a fast
// program has to wait for BUSY.

import type { Devices, PrinterState } from './types';

export const PRINTER_COLUMNS = 20;
export const PRINTER_BUFFER = 4;
export const PRINT_INTERVAL = 8; // instructions per printed character, by default

export const initialPrinter = (interval: number = PRINT_INTERVAL): PrinterState => ({
  buffer: [],
  paper: '',
  column: 0,
  interval,
  countdown: interval,
});

// Changes the speed of the printer: one character every `interval` instructions.
// A character being printed is not delayed by a slower speed.
export const setPrintInterval = (devices: Devices, interval: number): Devices => ({
  ...devices,
  printer: {
    ...devices.printer,
    interval,
    countdown: devices.printer.buffer.length
      ? Math.min(devices.printer.countdown, interval)
      : interval,
  },
});

export const printerBusy = (devices: Devices): boolean => devices.printer.buffer.length >= PRINTER_BUFFER;

// A character arrives (on the rising edge of STROBE). Lost if busy.
export function printerReceive(devices: Devices, byte: number): Devices {
  if (printerBusy(devices)) return devices;
  return { ...devices, printer: { ...devices.printer, buffer: [...devices.printer.buffer, byte & 0xff] } };
}

function print(printer: PrinterState, byte: number): PrinterState {
  let { paper, column } = printer;
  if (byte === 13) return printer; // MSX88 ignores CR (tests/fidelity: printer-crlf)
  if (byte === 10) {
    // only LF starts a new line
    paper += '\n';
    column = 0;
  } else {
    if (column === PRINTER_COLUMNS) {
      paper += '\n';
      column = 0;
    }
    paper += String.fromCharCode(byte);
    column += 1;
  }
  return { ...printer, paper, column };
}

export function printerTick(devices: Devices): Devices {
  const { printer } = devices;
  if (printer.buffer.length === 0) return devices;
  if (printer.countdown > 1) {
    return { ...devices, printer: { ...printer, countdown: printer.countdown - 1 } };
  }
  const [byte, ...buffer] = printer.buffer;
  const interval = printer.interval ?? PRINT_INTERVAL;
  return { ...devices, printer: { ...print(printer, byte), buffer, countdown: interval } };
}
