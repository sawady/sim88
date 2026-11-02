// I/O bus: the ports that IN and OUT reach, and the devices plugged into them.
//
// The state of all the devices is one plain object (`devices`, kept in the
// machine), because MSX88's peripherals are wired together: the PIO or the
// HAND drive the printer, the timer, the HAND and the CDMA request
// interrupts from the PIC. A device is:
//
//   {
//     name,
//     ports: [30h, 31h, ...],                  the ports it answers
//     read(devices, port) -> byte              IN
//     write(devices, port, byte) -> devices    OUT (returns a new object)
//     afterRead(devices, port) -> devices      optional: what an IN does to it
//     tick(devices, memory) -> devices         optional: one step of time,
//                                              after every instruction
//   }
//
// `memory` gives devices that use the buses (the CDMA) access to memory:
// { read(address), write(address, byte) }.
//
// Device state is part of every machine snapshot, so "step back" undoes I/O
// too. Ports nobody answers read as 00h and ignore writes (as MSX88 does:
// tests/fidelity, io-ports-initial-c0).

export const UNMAPPED_PORT_VALUE = 0x00;

export function createBus(devices = [], initialState = {}) {
  const byPort = new Map();
  for (const device of devices) {
    for (const port of device.ports) {
      if (byPort.has(port)) {
        throw new Error(`Port ${port} is used by ${byPort.get(port).name} and ${device.name}`);
      }
      byPort.set(port, device);
    }
  }
  return {
    devices,
    deviceAt: (port) => byPort.get(port),
    initialState: () => initialState,
    tick: (state, memory) =>
      devices.reduce((s, device) => (device.tick ? device.tick(s, memory) : s), state),
  };
}

// The `io` the CPU uses during one instruction. It collects the new device
// state and consumes keys from `input` (the keyboard buffer of INT 6).
export function busIO(bus, devices, input) {
  const io = {
    devices,
    input: [...input],
    accessed: new Set(), // names of the devices used, for the UI
    in(port) {
      const device = bus.deviceAt(port);
      if (!device) return UNMAPPED_PORT_VALUE;
      io.accessed.add(device.name);
      const value = device.read(io.devices, port) & 0xff;
      if (device.afterRead) io.devices = device.afterRead(io.devices, port);
      return value;
    },
    out(port, value) {
      const device = bus.deviceAt(port);
      if (!device) return;
      io.accessed.add(device.name);
      io.devices = device.write(io.devices, port, value & 0xff);
    },
    readChar() {
      return io.input.length ? io.input.shift() : undefined;
    },
  };
  return io;
}
