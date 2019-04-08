import { toReg } from './conversions'

const create = (name, value) => ({ name, value });

export default {
  create,
  setValue: (reg, value) => create(reg.name, value),
  render: reg => toReg(reg.name, reg.value),
}