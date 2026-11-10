// The peripherals of MSX88 and its four configurations (MSX88 manual 3.2):
//
//   0: PIO with switches (PA) and LEDs (PB)
//   1: PIO with the printer
//   2: HAND with the printer, interrupting through INT2 of the PIC
//   3: like 2, with the CDMA between the HAND and the memory
//
// The PIC and the timer are present in all of them.

import { createBus } from '../io';
import type { Bus, Device } from '../io';
import type { Devices } from './types';
import { pic, initialPic } from './pic';
import { timer, initialTimer } from './timer';
import { pio, initialPio } from './pio';
import { hand, initialHand } from './hand';
import { cdma, initialCdma } from './cdma';
import { initialPrinter, printerTick } from './printer';

const printer: Device<Devices> = { name: 'printer', ports: [], tick: printerTick };

interface Configuration {
  name: string;
  devices: Device<Devices>[];
  lines: number;
}

export const CONFIGURATIONS: Record<number, Configuration> = {
  0: { name: 'PIO: microconmutadores y LEDs', devices: [pic, timer, pio], lines: 0b0011 },
  1: { name: 'PIO: impresora', devices: [pic, timer, pio, printer], lines: 0b0011 },
  2: { name: 'HAND: impresora por interrupciones', devices: [pic, timer, hand, printer], lines: 0b0111 },
  3: { name: 'HAND y CDMA: impresora por DMA', devices: [pic, timer, hand, cdma, printer], lines: 0b1011 },
};

export const initialDevices = (config: number): Devices => ({
  config,
  switches: 0,
  pic: initialPic(),
  timer: initialTimer(),
  pio: initialPio(),
  hand: initialHand(),
  printer: initialPrinter(),
  cdma: initialCdma(),
});

// The bus of a configuration. `lines` are the PIC inputs that have something
// connected (INT0 is the F10 key, INT1 the timer, INT2 the HAND, INT3 the CDMA).
export interface System extends Bus<Devices> {
  config: number;
  lines: number;
}

export function createSystem(config = 0): System {
  const { devices, lines } = CONFIGURATIONS[config];
  return { ...createBus(devices, initialDevices(config)), config, lines };
}

export const hasDevice = (config: number, name: string): boolean => CONFIGURATIONS[config].devices.some((d) => d.name === name);

export { pendingInterrupt, acknowledgeInterrupt, requestInterrupt } from './pic';
export { timerPulse } from './timer';
export { pioOutputB } from './pio';
export { printerBusy } from './printer';
export type { Devices } from './types';
