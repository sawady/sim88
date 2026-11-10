// The state of the peripherals: one plain object, kept in the machine (see
// io.ts for why they share it).

export interface PicState {
  imr: number;
  irr: number;
  isr: number;
  vectors: number[];
}

export interface TimerState {
  cont: number;
  comp: number;
}

export interface PioState {
  pa: number;
  pb: number;
  ca: number;
  cb: number;
}

export interface HandState {
  data: number;
  status: number;
}

export interface PrinterState {
  buffer: number[];
  paper: string;
  column: number;
  interval: number;
  countdown: number;
  last?: number; // the last character printed (CR LF is one new line)
}

export interface CdmaState {
  rf: number;
  cont: number;
  rd: number;
  ctrl: number;
  running: boolean;
  paused: boolean;
  tc: boolean;
}

export interface Devices {
  config: number;
  switches: number;
  pic: PicState;
  timer: TimerState;
  pio: PioState;
  hand: HandState;
  printer: PrinterState;
  cdma: CdmaState;
}
