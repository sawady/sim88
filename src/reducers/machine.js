
const defaultState = {
  registers: [
    {
      name: 'AX',
      value: {
        L: '00',
        H: '00'
      }
    },
    {
      name: 'BX',
      value: {
        L: '00',
        H: '00'
      }
    },
    {
      name: 'CX',
      value: {
        L: '00',
        H: '00'
      }
    },
    {
      name: 'DX',
      value: {
        L: '00',
        H: '00'
      }
    },
  ],
  ALU: [
    {
      name: 'OP1',
      value: {
        L: '00',
        H: '00'
      }
    },
    {
      name: 'OP2',
      value: {
        L: '00',
        H: '00'
      }
    },
    {
      name: 'RES',
      value: {
        L: '00',
        H: '00'
      }
    },
  ],
  flags: [
    { name: 'i', value: true },
    { name: 'z', value: false },
    { name: 's', value: false },
    { name: 'o', value: false },
    { name: 'c', value: false },
    { name: 'a', value: false },
    { name: 'p', value: false }
  ],
  IR: '00',
  IP: {
    L: '20',
    H: '00'
  },
  SP: {
    L: '80',
    H: '00'
  },
  decoder: '????',
  memory: [
    { dir: '11FC', value: '00' },
    { dir: '1FFD', value: '00' },
    { dir: '1FFE', value: '00' },
    { dir: '1FFF', value: '00' },
    { dir: '2000', value: '00' },
    { dir: '2001', value: '00' },
    { dir: '2002', value: '00' },
    { dir: '2003', value: '00' },
    { dir: '2004', value: '00' },
    { dir: '2005', value: '00' },
    { dir: '2006', value: '00' },
    { dir: '2007', value: '00' },
    { dir: '2008', value: '00' }
  ],
}

export default (state = defaultState, action) => {
  switch (action.type) {
    case 'MOV':
      return state;
    default:
      return state;
  }
};
