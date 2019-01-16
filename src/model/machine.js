import Register from './register';
import Memory from './memory';
import Flag from './flag'

const MEMORY_SIZE = 200
const DEFAULT_IP = 150
const DEFAULT_SP = MEMORY_SIZE+1
const REGISTERS = ['AX', 'BX', 'CX', 'DX']
const ALU_REGISTERS = ['OP1', 'OP2', 'RES']
const FLAGS = ['i', 'z', 's', 'o', 'c', 'a', 'p']

export default class Machine {

  registers = REGISTERS.map(x => new Register(x, 0))

  ALU = ALU_REGISTERS.map(x => new Register(x, 0))

  flags = FLAGS.map(x => new Flag(x, false))

  IR = '00'

  IP = new Register('IP', DEFAULT_IP)

  SP = new Register('SP', DEFAULT_SP)

  decoder = '????'

  memory = new Memory(MEMORY_SIZE)

}