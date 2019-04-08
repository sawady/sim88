import { toHex8, toHex16 } from '../model/conversions'

export default class Cell {

  constructor(dir, value) {
    this.dir = dir;
    this.value = value;
  }

  setValue(value) {
    return new Cell(this.dir, value);
  }

  renderDir() {
    return toHex16(this.dir);
  }

  renderValue() {
    return toHex8(this.value);
  }

}