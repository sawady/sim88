export default class Flag {

  constructor(name, value) {
    this.name = name;
    this.value = value;
  }

  setValue(value) {
    this.value = value
  }

  toogle() {
    this.value = !this.value;
  }

}