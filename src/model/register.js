import { toReg } from './conversions'

export default class Register {

  constructor(name, value) {
    this.name  = name;
    this.value = value;
  }

  setValue(value) {
    this.value = value;
  }

  render() {
    return toReg(this.name, this.value);
  }

}