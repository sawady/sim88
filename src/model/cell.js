import { printHex8, printHex16, fromHexToInt } from '../model/conversions'

export default class Cell {

  constructor(dir, value) {
    this.dir = dir;
    this.value = value;
  }

  setValue(value) {
    return new Cell(this.dir, value);
  }

  setFromHexValue(value) {
    return new Cell(this.dir, fromHexToInt(value + ''));
  }

  renderDir() {
    return printHex16(this.dir);
  }

  renderValue() {
    return printHex8(this.value);
  }

}