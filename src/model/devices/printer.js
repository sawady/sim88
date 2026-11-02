// Printer (MSX88 manual 7.9): ASCII, 20 columns, a buffer of 5 characters.
// It is driven through a Centronics interface: STROBE (data valid) and
// BUSY (it cannot take data: the buffer is full).
//
// It prints one character from the buffer every PRINT_INTERVAL instructions,
// so a fast program has to wait for BUSY.

export const PRINTER_COLUMNS = 20;
export const PRINTER_BUFFER = 5;
export const PRINT_INTERVAL = 8; // instructions per printed character

export const initialPrinter = () => ({ buffer: [], paper: '', column: 0, countdown: PRINT_INTERVAL });

export const printerBusy = (devices) => devices.printer.buffer.length >= PRINTER_BUFFER;

// A character arrives (on the rising edge of STROBE). Lost if busy.
export function printerReceive(devices, byte) {
  if (printerBusy(devices)) return devices;
  return { ...devices, printer: { ...devices.printer, buffer: [...devices.printer.buffer, byte & 0xff] } };
}

function print(printer, byte) {
  let { paper, column } = printer;
  if (byte === 13 || byte === 10) {
    // CR, LF or CR LF: one new line
    if (!(byte === 10 && printer.last === 13)) {
      paper += '\n';
      column = 0;
    }
  } else {
    if (column === PRINTER_COLUMNS) {
      paper += '\n';
      column = 0;
    }
    paper += String.fromCharCode(byte);
    column += 1;
  }
  return { ...printer, paper, column, last: byte };
}

export function printerTick(devices) {
  const { printer } = devices;
  if (printer.buffer.length === 0) return devices;
  if (printer.countdown > 1) {
    return { ...devices, printer: { ...printer, countdown: printer.countdown - 1 } };
  }
  const [byte, ...buffer] = printer.buffer;
  return { ...devices, printer: { ...print(printer, byte), buffer, countdown: PRINT_INTERVAL } };
}
