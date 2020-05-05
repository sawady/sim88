import { fromHexToInt } from './conversions'

export const IR = 'IR'
export const IP = 'IP'
export const SP = 'SP'
export const AX = 'AX'
export const AL = 'AL'
export const AH = 'AH'
export const BX = 'BX'
export const BL = 'BL'
export const BH = 'BH'
export const CX = 'CX'
export const CL = 'CL'
export const CH = 'CH'
export const DX = 'DX'
export const DL = 'DL'
export const DH = 'DH'
export const REG = 'REG'
export const FLAG = 'FLAG'
export const DECODER = 'DECODER'
export const REGISTER = 'REGISTER'
export const DECIMAL = 'DECIMAL'
export const HEXADECIMAL = 'HEXADECIMAL'
export const NUMBER = 'NUMBER'
export const BINARY = 'BINARY'
export const UNARY = 'UNARY'
export const VARIABLE = 'VARIABLE'
export const CONSTANT = 'CONSTANT'
export const DB = 'DB'
export const END = 'END'
export const ERROR = 'ERROR'
export const MOV = 'MOV'

export const INITIAL_VELOCITY = 500 // ms

export const MIN_VELOCITY = 10000 // ms

export const MAX_VELOCITY = 10 // ms

export const MEMORY_SIZE = 1000 // 57343 is the total amount for 64kb

export const DEFAULT_IR = fromHexToInt('0')

export const DEFAULT_IP = fromHexToInt('2000')

export const DEFAULT_SP = MEMORY_SIZE + 1

export const DEFAULT_DECODER_VALUE = '????'

export const REGISTERS = [AX, BX, CX, DX];

export const LOW_REGISTERS = REGISTERS.map(x => x[0] + 'L')

export const HIGH_REGISTERS = REGISTERS.map(x => x[0] + 'H')

export const ALU_REGISTERS = ['OP1', 'OP2', 'RES']

export const FLAGS = ['i', 'z', 's', 'o', 'c', 'a', 'p']

export const MACHINE_STATES = {
  RUNNING: 'RUNNING',
  PAUSED: 'PAUSED',
  STOPPED: 'STOPPED',
}
