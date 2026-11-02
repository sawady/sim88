// PIC: interrupt controller (MSX88 manual 7.6), ports 20h-2Bh.
//
//   20h EOI   write 20h at the end of an interrupt routine: clears the ISR
//             bit of the interrupt in service
//   21h IMR   mask: bit n = 1 masks INTn (all masked after reset: FFh, as
//             MSX88 V-3.1 reads it; tests/fidelity, io-ports-initial-c0)
//   22h IRR   requests: bit n = 1 when INTn asked for an interrupt
//   23h ISR   in service: bit n = 1 while INTn is being serviced
//   24h-2Bh   INT0..INT7: the vector number (interrupt type) of each line
//
// INT0 is the F10 key, INT1 the timer, INT2 the HAND (configuration 2),
// INT3 the end of a CDMA transfer (configuration 3). INT0 has the highest
// priority.

export const PIC_BASE = 0x20;
export const EOI_COMMAND = 0x20;

export const initialPic = () => ({ imr: 0xff, irr: 0, isr: 0, vectors: [0, 0, 0, 0, 0, 0, 0, 0] });

const lowestBit = (value) => {
  for (let n = 0; n < 8; n++) if (value & (1 << n)) return n;
  return null;
};

const withPic = (devices, changes) => ({ ...devices, pic: { ...devices.pic, ...changes } });

export const pic = {
  name: 'pic',
  ports: Array.from({ length: 12 }, (_, i) => PIC_BASE + i),
  read(devices, port) {
    const { imr, irr, isr, vectors } = devices.pic;
    switch (port - PIC_BASE) {
      case 0:
        return 0; // EOI is write only
      case 1:
        return imr;
      case 2:
        return irr;
      case 3:
        return isr;
      default:
        return vectors[port - PIC_BASE - 4];
    }
  },
  write(devices, port, value) {
    const { isr, vectors } = devices.pic;
    switch (port - PIC_BASE) {
      case 0: {
        if (value !== EOI_COMMAND) return devices;
        const n = lowestBit(isr);
        return n === null ? devices : withPic(devices, { isr: isr & ~(1 << n) });
      }
      case 1:
        return withPic(devices, { imr: value });
      case 2:
      case 3:
        return devices; // IRR and ISR are read only
      default: {
        const next = [...vectors];
        next[port - PIC_BASE - 4] = value;
        return withPic(devices, { vectors: next });
      }
    }
  },
};

// An interrupt request on line n (F10, the timer, the end of a DMA transfer).
export const requestInterrupt = (devices, n) =>
  withPic(devices, { irr: devices.pic.irr | (1 << n) });

// A line that stays active while its condition holds (the HAND's INT line).
export const setInterruptLine = (devices, n, active) => {
  const bit = 1 << n;
  const irr = active ? devices.pic.irr | bit : devices.pic.irr & ~bit;
  return irr === devices.pic.irr ? devices : withPic(devices, { irr });
};

// The line the PIC presents to the CPU, or null: the highest priority
// unmasked request, if it has more priority than the one in service.
export function pendingInterrupt(devices) {
  const { irr, imr, isr } = devices.pic;
  const n = lowestBit(irr & ~imr);
  if (n === null) return null;
  const inService = lowestBit(isr);
  return inService === null || n < inService ? n : null;
}

// The CPU accepts line n (INTA): the request moves to "in service" and the
// PIC gives the vector number.
export function acknowledgeInterrupt(devices, n) {
  const bit = 1 << n;
  return {
    devices: withPic(devices, { irr: devices.pic.irr & ~bit, isr: devices.pic.isr | bit }),
    vector: devices.pic.vectors[n],
  };
}
