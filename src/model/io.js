// I/O bus: the ports that IN and OUT reach, and the devices plugged into them.
//
// A device is a plain object:
//
//   {
//     name,                        key of its state in machine.devices
//     ports: [30h, 31h, ...],      the ports it answers
//     initial,                     its initial state
//     read(state, port) -> byte    IN
//     write(state, port, byte) -> new state   OUT (must not mutate `state`)
//   }
//
// Device state lives in the machine, so it is part of every snapshot and
// "step back" undoes I/O too. Ports nobody answers read as FFh (nothing
// drives the bus) and ignore writes.

export const UNMAPPED_PORT_VALUE = 0xff;

export function createBus(devices = []) {
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
    initialState: () => Object.fromEntries(devices.map((d) => [d.name, d.initial])),
  };
}

// The `io` the CPU uses during one instruction. It collects the new device
// states and consumes keys from `input` (the keyboard buffer of INT 6).
export function busIO(bus, devices, input) {
  const io = {
    devices: { ...devices },
    input: [...input],
    in(port) {
      const device = bus.deviceAt(port);
      return device ? device.read(io.devices[device.name], port) & 0xff : UNMAPPED_PORT_VALUE;
    },
    out(port, value) {
      const device = bus.deviceAt(port);
      if (device) io.devices[device.name] = device.write(io.devices[device.name], port, value & 0xff);
    },
    readChar() {
      return io.input.length ? io.input.shift() : undefined;
    },
  };
  return io;
}
