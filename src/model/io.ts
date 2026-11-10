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

// What the CDMA sees of the memory.
export interface BusMemory {
  read(address: number): number;
  write(address: number, byte: number): void;
}

// `S` is the state of all the devices (see the comment above). Only a device
// with ports has read and write (the printer has neither: it is reached
// through the PIO or the HAND).
export interface Device<S> {
  name: string;
  ports: number[];
  read?(devices: S, port: number): number;
  write?(devices: S, port: number, value: number): S;
  afterRead?(devices: S, port: number): S;
  tick?(devices: S, memory: BusMemory): S;
}

export interface Bus<S> {
  devices: Device<S>[];
  deviceAt(port: number): Device<S> | undefined;
  initialState(): S;
  tick(state: S, memory: BusMemory): S;
}

// What an instruction can do outside the CPU (see cpu.ts).
export interface CpuIO {
  in(port: number): number;
  out(port: number, value: number): void;
  readChar(): number | undefined;
}

export interface BusIO<S> extends CpuIO {
  devices: S;
  input: number[];
  accessed: Set<string>;
}

export function createBus<S>(devices: Device<S>[] = [], initialState: S = {} as S): Bus<S> {
  const byPort = new Map<number, Device<S>>();
  for (const device of devices) {
    for (const port of device.ports) {
      if (byPort.has(port)) {
        throw new Error(`Port ${port} is used by ${byPort.get(port)!.name} and ${device.name}`);
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
export function busIO<S>(bus: Bus<S>, devices: S, input: number[]): BusIO<S> {
  const io: BusIO<S> = {
    devices,
    input: [...input],
    accessed: new Set<string>(), // names of the devices used, for the UI
    in(port) {
      const device = bus.deviceAt(port);
      if (!device) return UNMAPPED_PORT_VALUE;
      io.accessed.add(device.name);
      const value = device.read!(io.devices, port) & 0xff;
      if (device.afterRead) io.devices = device.afterRead(io.devices, port);
      return value;
    },
    out(port, value) {
      const device = bus.deviceAt(port);
      if (!device) return;
      io.accessed.add(device.name);
      io.devices = device.write!(io.devices, port, value & 0xff);
    },
    readChar() {
      return io.input.length ? io.input.shift() : undefined;
    },
  };
  return io;
}
