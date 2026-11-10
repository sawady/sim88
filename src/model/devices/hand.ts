// HAND: handshake interface for the Centronics printer (MSX88 manual 7.4),
// ports 40h-41h. It does the STROBE timing itself: writing DATO sends the
// character to the printer.
//
//   40h DATO  write: character for the printer; read: the last one sent
//   41h EST   read:  bit 0 BUSY, bit 1 STROBE, bit 7 interrupts enabled
//             write: only bit 7 matters
//
// Its INT line is active while bit 7 is 1 and the printer is not busy. It
// goes to INT2 of the PIC (configuration 2) or to DREQ of the CDMA
// (configuration 3).

import type { Device } from '../io';
import type { Devices, HandState } from './types';
import { printerBusy, printerReceive } from './printer';
import { setInterruptLine } from './pic';

export const HAND_BASE = 0x40;

export const initialHand = (): HandState => ({ data: 0, status: 0 });

export const handInterruptLine = (devices: Devices): boolean =>
  (devices.hand.status & 0x80) !== 0 && !printerBusy(devices);

export const hand: Device<Devices> = {
  name: 'hand',
  ports: [HAND_BASE, HAND_BASE + 1],
  read(devices, port) {
    if (port === HAND_BASE) return devices.hand.data;
    return (devices.hand.status & 0x80) | (printerBusy(devices) ? 1 : 0);
  },
  write(devices, port, value) {
    if (port === HAND_BASE) {
      return printerReceive({ ...devices, hand: { ...devices.hand, data: value } }, value);
    }
    return { ...devices, hand: { ...devices.hand, status: value & 0x80 } };
  },
  // Configuration 2: the INT line goes to INT2 of the PIC.
  tick: (devices) =>
    devices.config === 2 ? setInterruptLine(devices, 2, handInterruptLine(devices)) : devices,
};
