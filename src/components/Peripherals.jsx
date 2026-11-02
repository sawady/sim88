import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import classNames from 'classnames';

import { CONFIGURATIONS, hasDevice, pioOutputB, printerBusy } from '../model/devices';
import { PRINTER_BUFFER } from '../model/devices/printer';
import { hex8, hex16 } from '../model/format';
import { pressF10, timerPulse, toggleSwitch } from '../actions/machine';

import '../styles/Peripherals.css';

const bits = (value) => [7, 6, 5, 4, 3, 2, 1, 0].map((n) => ({ n, on: (value >> n) & 1 }));

function Registers({ values }) {
  return (
    <div className="registers">
      {values.map(([name, value, title]) => (
        <div key={name} className="reg" title={title}>
          <span className="name">{name}</span>
          <span className="value">{value}</span>
        </div>
      ))}
    </div>
  );
}

function Device({ name, title, active, children }) {
  return (
    <div className={classNames('device', { active })}>
      <div className="title">
        {name}
        {title && <span className="subtitle"> · {title}</span>}
      </div>
      {children}
    </div>
  );
}

export default function Peripherals() {
  const dispatch = useDispatch();
  const config = useSelector((state) => state.machine.bus.config);
  const devices = useSelector((state) => state.machine.devices);
  const active = useSelector((state) => state.machine.activeComponents);
  if (config === undefined) return null;
  const { pic, timer, pio, hand, cdma, printer, switches } = devices;
  const has = (name) => hasDevice(config, name);
  const isActive = (name) => active.includes(name);

  return (
    <div className="peripherals">
      <div className="heading">
        Periféricos · conexionado {config}: {CONFIGURATIONS[config].name}
      </div>
      <div className="devices">
        <Device name="PIC" title="20h-2Bh" active={isActive('PIC')}>
          <Registers
            values={[
              ['IMR', hex8(pic.imr), 'Máscara'],
              ['IRR', hex8(pic.irr), 'Pedidos'],
              ['ISR', hex8(pic.isr), 'En servicio'],
              ...pic.vectors.slice(0, 4).map((v, i) => [`INT${i}`, hex8(v), `Tipo de la línea ${i}`]),
            ]}
          />
          <button className="action" onClick={() => dispatch(pressF10())} title="F10: pide INT0">
            F10
          </button>
        </Device>

        <Device name="TIMER" title="10h-11h" active={isActive('TIMER')}>
          <Registers values={[['CONT', hex8(timer.cont)], ['COMP', hex8(timer.comp)]]} />
          <button
            className="action"
            onClick={() => dispatch(timerPulse())}
            title="Un pulso del reloj de 1 Hz (corre solo mientras se ejecuta)"
          >
            Pulso
          </button>
        </Device>

        {has('pio') && (
          <Device name="PIO" title="30h-33h" active={isActive('PIO')}>
            <Registers
              values={[
                ['PA', hex8(pio.pa)],
                ['PB', hex8(pio.pb)],
                ['CA', hex8(pio.ca), '1 = entrada'],
                ['CB', hex8(pio.cb), '1 = entrada'],
              ]}
            />
          </Device>
        )}

        {config === 0 && (
          <Device name="LEDs y llaves" title="PB y PA">
            <div className="leds" aria-label="LEDs">
              {bits(pioOutputB(devices)).map(({ n, on }) => (
                <span key={n} className={classNames('led', { on })} title={`LED ${n}`} />
              ))}
            </div>
            <div className="switches" aria-label="Microconmutadores">
              {bits(switches).map(({ n, on }) => (
                <button
                  key={n}
                  className={classNames('switch', { on })}
                  aria-pressed={!!on}
                  onClick={() => dispatch(toggleSwitch(n))}
                  title={`Llave ${n} (tecla ${n})`}
                >
                  {n}
                </button>
              ))}
            </div>
          </Device>
        )}

        {has('hand') && (
          <Device name="HAND" title="40h-41h" active={isActive('HAND')}>
            <Registers
              values={[
                ['DATO', hex8(hand.data)],
                ['EST', hex8((hand.status & 0x80) | (printerBusy(devices) ? 1 : 0)), 'bit 7 INT, bit 0 BUSY'],
              ]}
            />
          </Device>
        )}

        {has('cdma') && (
          <Device name="CDMA" title="50h-57h" active={isActive('CDMA')}>
            <Registers
              values={[
                ['RF', hex16(cdma.rf)],
                ['CONT', hex16(cdma.cont)],
                ['RD', hex16(cdma.rd)],
                ['CTRL', hex8((cdma.ctrl & 0x0e) | (cdma.paused ? 1 : 0) | (cdma.tc ? 0x80 : 0))],
              ]}
            />
          </Device>
        )}

        {has('printer') && (
          <Device name="Impresora" title={printerBusy(devices) ? 'BUSY' : 'lista'}>
            <div className="buffer" title="Buffer de la impresora">
              Buffer: {printer.buffer.length}/{PRINTER_BUFFER}
            </div>
            <pre className="paper" aria-label="Papel">{printer.paper}</pre>
          </Device>
        )}
      </div>
    </div>
  );
}
