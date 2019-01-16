import Cell from './cell'

function generateMemory(size) {
  const memory = [];
  for (let i = 0; i <= size; i++) {
    memory.push(new Cell(i, 0));
  }
  return memory;
}

export default class Memory {

  constructor(size) {
    this.cells = generateMemory(size);
  }

}