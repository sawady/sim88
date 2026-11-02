// PIO: parallel input/output (MSX88 manual 7.3), ports 30h-33h.
//
//   30h PA, 31h PB   data of ports A and B
//   32h CA, 33h CB   direction of each bit: 1 input, 0 output (all inputs
//                    after reset)
//
// Reading a port gives the outside world on its input bits and the latched
// value on its output bits. What is outside depends on the configuration:
//   0: switches on PA, LEDs on PB
//   1: printer: PA0 BUSY (input), PA1 STROBE (output), PB the data

import { printerBusy, printerReceive } from './printer';

export const PIO_BASE = 0x30;

export const initialPio = () => ({ pa: 0, pb: 0, ca: 0xff, cb: 0xff });

const withPio = (devices, changes) => ({ ...devices, pio: { ...devices.pio, ...changes } });

// What the outside drives on each port
function outsideA(devices) {
  if (devices.config === 0) return devices.switches;
  if (devices.config === 1) return printerBusy(devices) ? 1 : 0;
  return 0;
}

const portValue = (latch, direction, outside) => (latch & ~direction & 0xff) | (outside & direction);

// The value a port shows outside (output bits; input bits read as 0)
export const pioOutputB = (devices) => devices.pio.pb & ~devices.pio.cb & 0xff;
export const pioOutputA = (devices) => devices.pio.pa & ~devices.pio.ca & 0xff;

export const pio = {
  name: 'pio',
  ports: [PIO_BASE, PIO_BASE + 1, PIO_BASE + 2, PIO_BASE + 3],
  read(devices, port) {
    const { pa, pb, ca, cb } = devices.pio;
    switch (port - PIO_BASE) {
      case 0:
        return portValue(pa, ca, outsideA(devices));
      case 1:
        return portValue(pb, cb, 0);
      case 2:
        return ca;
      default:
        return cb;
    }
  },
  write(devices, port, value) {
    switch (port - PIO_BASE) {
      case 0: {
        const next = withPio(devices, { pa: value });
        // Configuration 1: a rising edge of STROBE (PA1) sends PB to the printer.
        const strobeBefore = pioOutputA(devices) & 2;
        const strobeAfter = pioOutputA(next) & 2;
        if (devices.config === 1 && !strobeBefore && strobeAfter) {
          return printerReceive(next, pioOutputB(next));
        }
        return next;
      }
      case 1:
        return withPio(devices, { pb: value });
      case 2:
        return withPio(devices, { ca: value });
      default:
        return withPio(devices, { cb: value });
    }
  },
};
