import React from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import { getFlag } from '../model/cpu';
import { hex8, hex16 } from '../model/format';
import { REGISTERS, ALU_REGISTERS, FLAGS, PHASE_NAMES_UI } from '../model/constants';

import '../styles/CPU.css';

function Register({ name, value, active, size = 16, title }) {
  return (
    <div className={classNames('register', { active, ir: size === 8 })} title={title}>
      <div className="name">{name}</div>
      <div className="values">
        {size === 16 ? (
          <>
            <div className="value">{hex8(value >> 8)}</div>
            <div className="value">{hex8(value)}</div>
          </>
        ) : (
          <div className="value">{hex8(value)}</div>
        )}
      </div>
    </div>
  );
}

const FLAG_TITLES = {
  I: 'Interrupciones habilitadas',
  Z: 'Cero',
  S: 'Signo',
  O: 'Overflow',
  C: 'Carry',
  A: 'Carry auxiliar',
  P: 'Paridad',
};

export default function CPU() {
  const machine = useSelector((state) => state.machine);
  const { cpu, alu, activeComponents, decoder, instruction, IR, phase } = machine;
  const isActive = (name) => activeComponents.includes(name);

  return (
    <div className="frame cpu">
      <div className="title">CPU</div>
      <div className="layout">
        <div className="alu bluebox">
          <div className="title">
            <span>ALU</span>
          </div>
          {ALU_REGISTERS.map((name) => (
            <Register key={name} name={name} value={alu[name]} active={isActive(name)} />
          ))}
        </div>
        <div className="bluebox">
          {REGISTERS.map((name) => (
            <Register key={name} name={name} value={cpu.regs[name]} active={isActive(name)} />
          ))}
        </div>
      </div>
      <div className="layout">
        <div className={classNames('flags', { active: isActive('FLAGS') })}>
          {FLAGS.map((name) => (
            <div
              key={name}
              title={FLAG_TITLES[name]}
              className={classNames('flag', { on: getFlag(cpu, name) })}
            >
              {name}
            </div>
          ))}
        </div>
      </div>
      <div className="layout">
        <Register name="IR" value={IR} size={8} active={isActive('IR')} title="Registro de instrucción" />
        <div className="pointers">
          <Register name="IP" value={cpu.ip} active={isActive('IP')} />
          <Register name="SP" value={cpu.regs.SP} active={isActive('SP')} />
        </div>
      </div>
      <div className="layout">
        <div className={classNames('redbox decoder', { active: isActive('DECODER') })}>
          <div className="title">DECODER</div>
          <div className="value">{decoder}</div>
          {instruction && (
            <div className="instruction" title={instruction.bytes.map(hex8).join(' ')}>
              {hex16(instruction.address)}: {instruction.text}
            </div>
          )}
        </div>
      </div>
      <div className="phase">Próxima fase: {PHASE_NAMES_UI[phase]}</div>
    </div>
  );
}
