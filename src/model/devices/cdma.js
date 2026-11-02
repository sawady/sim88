// CDMA: DMA controller (MSX88 manual 7.7), ports 50h-57h, configuration 3.
// It moves bytes without the CPU, one per instruction (cycle stealing).
//
//   50h/51h RF    source address (memory <-> peripheral: the memory block)
//   52h/53h CONT  bytes to transfer
//   54h/55h RD    destination address (memory -> memory)
//   56h CTRL      write: bit 0 pause, bit 1 TT (1 memory -> memory,
//                 0 with the peripheral), bit 2 ST (with the peripheral:
//                 1 memory -> peripheral, 0 peripheral -> memory), bit 3 MT
//                 (1 block, 0 on demand)
//                 read: the bits written, bit 0 = 1 while paused, bit 7 TC
//                 (transfer finished)
//   57h           any access starts (or resumes) the transfer
//
// The peripheral is the HAND (and its printer): its INT line is DREQ, so a
// transfer to the printer waits while the printer is busy. When CONT gets to
// 0, TC requests INT3 from the PIC.

import { handInterruptLine } from './hand';
import { printerReceive } from './printer';
import { requestInterrupt } from './pic';

export const CDMA_BASE = 0x50;

export const initialCdma = () => ({ rf: 0, cont: 0, rd: 0, ctrl: 0, running: false, paused: false, tc: false });

const withCdma = (devices, changes) => ({ ...devices, cdma: { ...devices.cdma, ...changes } });

const setLow = (word, byte) => (word & 0xff00) | byte;
const setHigh = (word, byte) => (word & 0x00ff) | (byte << 8);

const start = (devices) => withCdma(devices, { running: true, paused: false, tc: false });

export const cdma = {
  name: 'cdma',
  ports: Array.from({ length: 8 }, (_, i) => CDMA_BASE + i),
  read(devices, port) {
    const { rf, cont, rd, ctrl, paused, tc } = devices.cdma;
    switch (port - CDMA_BASE) {
      case 0:
        return rf & 0xff;
      case 1:
        return rf >> 8;
      case 2:
        return cont & 0xff;
      case 3:
        return cont >> 8;
      case 4:
        return rd & 0xff;
      case 5:
        return rd >> 8;
      case 6:
        return (ctrl & 0x0e) | (paused ? 1 : 0) | (tc ? 0x80 : 0);
      default:
        return 0xff; // reading 57h also starts: see machine reads below
    }
  },
  write(devices, port, value) {
    const { rf, cont, rd } = devices.cdma;
    switch (port - CDMA_BASE) {
      case 0:
        return withCdma(devices, { rf: setLow(rf, value) });
      case 1:
        return withCdma(devices, { rf: setHigh(rf, value) });
      case 2:
        return withCdma(devices, { cont: setLow(cont, value) });
      case 3:
        return withCdma(devices, { cont: setHigh(cont, value) });
      case 4:
        return withCdma(devices, { rd: setLow(rd, value) });
      case 5:
        return withCdma(devices, { rd: setHigh(rd, value) });
      case 6:
        return withCdma(devices, { ctrl: value & 0x0f, paused: (value & 1) === 1 || devices.cdma.paused });
      default:
        return start(devices);
    }
  },
  // One byte per instruction while running.
  tick(devices, memory) {
    const state = devices.cdma;
    if (!state.running || state.paused || state.cont === 0) return devices;
    const memoryToMemory = (state.ctrl & 2) !== 0;
    const toPeripheral = (state.ctrl & 4) !== 0;
    let next = devices;
    if (memoryToMemory) {
      memory.write(state.rd, memory.read(state.rf));
      next = withCdma(next, { rf: (state.rf + 1) & 0xffff, rd: (state.rd + 1) & 0xffff });
    } else {
      if (!handInterruptLine(devices)) return devices; // DREQ inactive: wait
      if (toPeripheral) {
        const byte = memory.read(state.rf);
        next = printerReceive({ ...next, hand: { ...next.hand, data: byte } }, byte);
      } else {
        memory.write(state.rf, devices.hand.data);
      }
      next = withCdma(next, { rf: (state.rf + 1) & 0xffff });
    }
    const cont = (state.cont - 1) & 0xffff;
    next = withCdma(next, { cont });
    if (cont === 0) {
      next = withCdma(next, { running: false, tc: true });
      next = requestInterrupt(next, 3);
    }
    return next;
  },
};
