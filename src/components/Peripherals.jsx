import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';

import { hasDevice, pioOutputB, printerBusy } from '../model/devices';
import { PRINTER_BUFFER, PRINTER_COLUMNS } from '../model/devices/printer';
import { hex8, hex16 } from '../model/format';
import { pressF10, timerPulse, toggleSwitch } from '../actions/machine';
import { Group } from './tui/Frame';
import { useT } from '../i18n';

import '../styles/Peripherals.css';

const bits = (value) => [7, 6, 5, 4, 3, 2, 1, 0].map((n) => ({ n, on: (value >> n) & 1 }));

// A row of a device: its name, its registers and maybe a button.
function Device({ name = '', ports, active, registers, children }) {
  return (
    <div className={classNames('device', { active })}>
      <span className="device-name" title={ports}>
        {name.padEnd(6)}
      </span>
      <span className="device-regs">
        {registers.map(([reg, value, title]) => (
          <span key={reg} className="reg" title={title}>
            <span className="name">{reg}</span> <span className="value">{value}</span>
          </span>
        ))}
      </span>
      {children}
    </div>
  );
}

export default function Peripherals() {
  const t = useT();
  const dispatch = useDispatch();
  const config = useSelector((state) => state.machine.bus.config);
  const devices = useSelector((state) => state.machine.devices);
  const active = useSelector((state) => state.machine.activeComponents);
  const timerHz = useSelector((state) => state.settings.timerHz);
  if (config === undefined) return null;
  const { pic, timer, pio, hand, cdma, printer, switches } = devices;
  const has = (name) => hasDevice(config, name);
  const isActive = (name) => active.includes(name);
  const busy = printerBusy(devices);

  return (
    <div className="peripherals">
      <div className="heading">{t('dev.config', { n: config, name: t(`dev.config${config}`) })}</div>

      <Device
        name="PIC"
        ports="20h-2Bh"
        active={isActive('PIC')}
        registers={[
          ['IMR', hex8(pic.imr), t('dev.imr')],
          ['IRR', hex8(pic.irr), t('dev.irr')],
          ['ISR', hex8(pic.isr), t('dev.isr')],
        ]}
      />
      {[0, 2].map((first) => (
        <Device
          key={first}
          registers={[first, first + 1].map((i) => [`INT${i}`, hex8(pic.vectors[i]), t('dev.lineType', { n: i })])}
        >
          {first === 2 && (
            <button className="inline-btn" onClick={() => dispatch(pressF10())} title={t('dev.f10')}>
              [F10]
            </button>
          )}
        </Device>
      ))}

      <Device
        name="TIMER"
        ports="10h-11h"
        active={isActive('TIMER')}
        registers={[
          ['CONT', hex8(timer.cont)],
          ['COMP', hex8(timer.comp)],
        ]}
      >
        <button className="inline-btn" onClick={() => dispatch(timerPulse())} title={t('dev.pulseTitle', { hz: timerHz })}>
          [{t('dev.pulse')}]
        </button>
      </Device>

      {has('pio') && (
        <>
          <Device
            name="PIO"
            ports="30h-33h"
            active={isActive('PIO')}
            registers={[
              ['PA', hex8(pio.pa)],
              ['PB', hex8(pio.pb)],
            ]}
          />
          <Device
            active={isActive('PIO')}
            registers={[
              ['CA', hex8(pio.ca), t('dev.input')],
              ['CB', hex8(pio.cb), t('dev.input')],
            ]}
          />
        </>
      )}

      {config === 0 && (
        <>
          <div className="device leds" role="group" aria-label={t('dev.leds')}>
            <span className="device-name">{t('dev.leds').padEnd(9)}</span>
            {bits(pioOutputB(devices)).map(({ n, on }) => (
              <span key={n} className={classNames('led', { on })} title={t('dev.led', { n })}>
                {on ? '●' : '○'}
                <span className="sr-only">{`${t('dev.led', { n })}: ${on}`}</span>
              </span>
            ))}
          </div>
          <div className="device switches" role="group" aria-label={t('dev.switches')}>
            <span className="device-name">{t('dev.switches').padEnd(9)}</span>
            {bits(switches).map(({ n, on }) => (
              <button
                key={n}
                className={classNames('switch', { on })}
                aria-pressed={!!on}
                aria-label={String(n)}
                onClick={() => dispatch(toggleSwitch(n))}
                title={t('dev.switch', { n })}
              >
                {n}
              </button>
            ))}
          </div>
        </>
      )}

      {has('hand') && (
        <Device
          name="HAND"
          ports="40h-41h"
          active={isActive('HAND')}
          registers={[
            ['DATO', hex8(hand.data)],
            ['EST', hex8((hand.status & 0x80) | (busy ? 1 : 0)), t('dev.status')],
          ]}
        />
      )}

      {has('cdma') && (
        <>
          <Device
            name="CDMA"
            ports="50h-57h"
            active={isActive('CDMA')}
            registers={[
              ['RF', hex16(cdma.rf)],
              ['CONT', hex16(cdma.cont)],
            ]}
          />
          <Device
            name=""
            registers={[
              ['RD', hex16(cdma.rd)],
              ['CTRL', hex8((cdma.ctrl & 0x0e) | (cdma.paused ? 1 : 0) | (cdma.tc ? 0x80 : 0))],
            ]}
          />
        </>
      )}

      {has('printer') && (
        <div className="printer">
          <div className="device">
            <span className="device-name">{t('dev.printer')}</span>
            <span className={busy ? 'busy' : 'ready'}>{busy ? t('dev.busy') : t('dev.ready')}</span>
            <span>{t('dev.buffer', { n: printer.buffer.length, max: PRINTER_BUFFER })}</span>
          </div>
          <Group title={t('dev.paper')} className="paper-box" style={{ '--paper': PRINTER_COLUMNS }}>
            <pre className="paper" aria-label={t('dev.paper')}>
              {printer.paper || ' '}
            </pre>
          </Group>
        </div>
      )}
    </div>
  );
}
