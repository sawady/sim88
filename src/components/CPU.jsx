import React from 'react';
import { useSelector } from 'react-redux';
import classNames from 'classnames';

import { getFlag } from '../model/cpu';
import { hex8, hex16 } from '../model/format';
import { REGISTERS, ALU_REGISTERS, FLAGS } from '../model/constants';
import { Group } from './tui/Frame';
import { useT } from '../i18n';

import '../styles/CPU.css';

// A register: its name and its value as two bytes ("12 34"), as MSX88 shows
// them. A register being used in this phase is highlighted.
function Register({ name, value, active, size = 16, title }) {
  const t = useT();
  return (
    <div className={classNames('register', { active })} title={title}>
      <span className="name">{name}</span>{' '}
      <span className="values">
        {size === 16 ? `${hex8(value >> 8)} ${hex8(value)}` : hex8(value)}
      </span>
      {active && <span className="sr-only"> ({t('cpu.active')})</span>}
    </div>
  );
}

export default function CPU() {
  const t = useT();
  const machine = useSelector((state) => state.machine);
  const { cpu, alu, activeComponents, decoder, instruction, IR, phase } = machine;
  const isActive = (name) => activeComponents.includes(name);

  return (
    <div className="cpu">
      <div className="cpu-row">
        <Group title={t('cpu.alu')} className="alu">
          {ALU_REGISTERS.map((name) => (
            <Register key={name} name={name} value={alu[name]} active={isActive(name)} />
          ))}
        </Group>
        <Group title={t('cpu.registers')} className="regs">
          {REGISTERS.map((name) => (
            <Register key={name} name={` ${name}`} value={cpu.regs[name]} active={isActive(name)} />
          ))}
        </Group>
      </div>
      <div className={classNames('flags', { active: isActive('FLAGS') })} role="group" aria-label={t('cpu.flags')}>
        {FLAGS.map((name) => {
          const on = getFlag(cpu, name);
          return (
            <span key={name} title={`${t(`flag.${name}`)}: ${on}`} className={classNames('flag', { on })}>
              {` ${name} `}
              <span className="sr-only">= {on}</span>
            </span>
          );
        })}
      </div>
      <div className="pointers">
        <Register name="IR" value={IR} size={8} active={isActive('IR')} title={t('cpu.ir')} />
        <Register name="IP" value={cpu.ip} active={isActive('IP')} title={t('cpu.ip')} />
        <Register name="SP" value={cpu.regs.SP} active={isActive('SP')} title={t('cpu.sp')} />
      </div>
      <Group title={t('cpu.decoder')} className={classNames('decoder', { active: isActive('DECODER') })}>
        <div className="value">{decoder}</div>
        <div className="instruction" title={instruction ? instruction.bytes.map(hex8).join(' ') : undefined}>
          {instruction ? `${hex16(instruction.address)}: ${instruction.text}` : ' '}
        </div>
      </Group>
      <div className="phase">{t('cpu.nextPhase', { phase: t(`cpu.phase${phase}`) })}</div>
    </div>
  );
}
