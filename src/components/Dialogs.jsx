import React, { useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import Dialog, { Button, Checkbox, RadioGroup } from './tui/Dialog';
import { Hot, hotkeyOf } from './tui/Frame';
import { useT } from '../i18n';
import {
  LANGUAGES,
  THEMES,
  ZOOMS,
  TIMER_PRESETS,
  PRINT_PRESETS,
  MIN_TIMER_HZ,
  MAX_TIMER_HZ,
  MIN_PRINT_INTERVAL,
  MAX_PRINT_INTERVAL,
  setSettings,
  validTimerHz,
  validPrintInterval,
} from '../actions/settings';
import { CONFIGURATIONS } from '../model/devices';

const OkCancel = ({ onOk, onCancel }) => {
  const t = useT();
  return (
    <>
      <Button label={t.marked('dlg.ok')} onClick={onOk} />
      <Button label={t.marked('dlg.cancel')} onClick={onCancel} />
    </>
  );
};

// Conexionado: the MSX88 configuration (peripherals).
export function ConfigDialog({ config, onChoose, onClose }) {
  const t = useT();
  const [value, setValue] = useState(config);
  const ok = () => {
    onClose();
    if (value !== config) onChoose(value);
  };
  return (
    <Dialog title={t('dlg.config.title')} width={52} onClose={onClose} onSubmit={ok} buttons={<OkCancel onOk={ok} onCancel={onClose} />}>
      <p className="help">{t('dlg.config.text')}</p>
      <RadioGroup
        label={t.marked('dlg.config.title').replace(/^/, '~')}
        name="config"
        value={value}
        onChange={setValue}
        options={Object.keys(CONFIGURATIONS).map((n) => ({ value: Number(n), label: `${n}: ${t(`dev.config${n}`)}` }))}
      />
    </Dialog>
  );
}

// A choice among presets or a value of your own.
function PresetOrOther({ label, name, presets, value, format, otherLabel, otherText, onOther, onPreset, otherSelected }) {
  const t = useT();
  const field = useRef(null);
  const options = [
    ...presets.map((p) => ({ value: p, label: format(p) })),
    { value: 'other', label: t('dlg.sim.other') },
  ];
  return (
    <div>
      <RadioGroup
        label={label}
        name={name}
        columns
        value={otherSelected ? 'other' : value}
        options={options}
        onChange={(v) => {
          if (v === 'other') {
            onOther(otherText);
            setTimeout(() => field.current?.focus());
          } else onPreset(v);
        }}
      />
      {otherSelected && (
        <p className="help">
          <label>
            {otherLabel}{' '}
            <input
              ref={field}
              className="field"
              style={{ '--size': 8 }}
              inputMode="decimal"
              value={otherText}
              onChange={(ev) => onOther(ev.target.value)}
            />
          </label>
        </p>
      )}
    </div>
  );
}

const parseNumber = (text) => Number(String(text).trim().replace(',', '.'));

// Frecuencias: the timer clock (Hz) and the printer speed (instructions per character).
export function FrequencyDialog({ onClose }) {
  const t = useT();
  const dispatch = useDispatch();
  const { timerHz, printInterval } = useSelector((state) => state.settings);
  const [hz, setHz] = useState(timerHz);
  const [hzOther, setHzOther] = useState(TIMER_PRESETS.includes(timerHz) ? null : String(timerHz));
  const [interval, setInterval_] = useState(printInterval);
  const [intervalOther, setIntervalOther] = useState(
    PRINT_PRESETS.includes(printInterval) ? null : String(printInterval)
  );
  const [invalid, setInvalid] = useState(false);

  const ok = () => {
    const newHz = hzOther !== null ? parseNumber(hzOther) : hz;
    const newInterval = intervalOther !== null ? parseNumber(intervalOther) : interval;
    if (!validTimerHz(newHz) || !validPrintInterval(newInterval)) {
      setInvalid(true);
      return;
    }
    dispatch(setSettings({ timerHz: newHz, printInterval: newInterval }));
    onClose();
  };

  return (
    <Dialog title={t('dlg.sim.title')} width={56} onClose={onClose} onSubmit={ok} buttons={<OkCancel onOk={ok} onCancel={onClose} />}>
      <PresetOrOther
        label={t.marked('dlg.sim.timer')}
        name="timer-hz"
        presets={TIMER_PRESETS}
        value={hz}
        format={(v) => t('dlg.sim.hz', { hz: v.toLocaleString(t.lang) })}
        otherSelected={hzOther !== null}
        otherText={hzOther ?? String(hz)}
        otherLabel={t('dlg.sim.otherHz', { min: MIN_TIMER_HZ.toLocaleString(t.lang), max: MAX_TIMER_HZ })}
        onOther={(text) => {
          setHzOther(text);
          setInvalid(false);
        }}
        onPreset={(v) => {
          setHz(v);
          setHzOther(null);
          setInvalid(false);
        }}
      />
      <p className="help">{t('dlg.sim.timerHelp')}</p>
      <PresetOrOther
        label={t.marked('dlg.sim.printer')}
        name="print-interval"
        presets={PRINT_PRESETS}
        value={interval}
        format={(n) => t('dlg.sim.every', { n })}
        otherSelected={intervalOther !== null}
        otherText={intervalOther ?? String(interval)}
        otherLabel={t('dlg.sim.otherInterval', { min: MIN_PRINT_INTERVAL, max: MAX_PRINT_INTERVAL })}
        onOther={(text) => {
          setIntervalOther(text);
          setInvalid(false);
        }}
        onPreset={(v) => {
          setInterval_(v);
          setIntervalOther(null);
          setInvalid(false);
        }}
      />
      <p className="help">{t('dlg.sim.printerHelp')}</p>
      {invalid && (
        <p className="warning" role="alert">
          {t('dlg.sim.invalid')}
        </p>
      )}
    </Dialog>
  );
}

// Apariencia: theme, CRT effect and size of the text. Changes show at once;
// Cancel puts back what there was.
export function AppearanceDialog({ onClose }) {
  const t = useT();
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const [initial] = useState({ theme: settings.theme, crt: settings.crt, zoom: settings.zoom });
  const set = (changes) => dispatch(setSettings(changes));
  const cancel = () => {
    set(initial);
    onClose();
  };
  return (
    <Dialog title={t('dlg.look.title')} width={46} onClose={cancel} onSubmit={onClose} buttons={<OkCancel onOk={onClose} onCancel={cancel} />}>
      <RadioGroup
        label={t.marked('dlg.look.theme')}
        name="theme"
        value={settings.theme}
        onChange={(theme) => set({ theme })}
        options={THEMES.map((id) => ({ value: id, label: t(`theme.${id}`) }))}
      />
      <Checkbox label={t.marked('dlg.look.crt')} checked={settings.crt} onChange={(crt) => set({ crt })} />
      <br />
      <RadioGroup
        label={t.marked('dlg.look.zoom')}
        name="zoom"
        columns
        value={settings.zoom}
        onChange={(zoom) => set({ zoom })}
        options={ZOOMS.map((z) => ({ value: z, label: z === 'auto' ? t('dlg.look.zoomAuto') : t('dlg.look.zoomN', { n: z }) }))}
      />
    </Dialog>
  );
}

// Idioma / Language.
export function LanguageDialog({ onClose }) {
  const t = useT();
  const dispatch = useDispatch();
  const lang = useSelector((state) => state.settings.lang);
  return (
    <Dialog title={t('dlg.lang.title')} width={34} onClose={onClose} onSubmit={onClose} buttons={<Button label={t.marked('dlg.ok')} onClick={onClose} />}>
      <RadioGroup
        label={t('dlg.lang.title')}
        name="lang"
        value={lang}
        onChange={(value) => dispatch(setSettings({ lang: value }))}
        options={LANGUAGES.map((id) => ({ value: id, label: t(`lang.${id}`) }))}
      />
    </Dialog>
  );
}

const KEYS = [
  ['F5', 'dlg.keys.f5'],
  ['F6', 'dlg.keys.f6'],
  ['F7', 'dlg.keys.f7'],
  ['Shift+F7', 'dlg.keys.shiftF7'],
  ['F8', 'dlg.keys.f8'],
  ['F10', 'dlg.keys.f10'],
  ['Esc', 'dlg.keys.esc'],
  ['0 … 7', 'dlg.keys.switches'],
  ['+  -', 'dlg.keys.speed'],
  ['Alt', 'dlg.keys.menu'],
  ['Alt+1 … 5', 'dlg.keys.windows'],
  ['Ctrl+N O S', 'dlg.keys.files'],
];

export function KeysDialog({ onClose }) {
  const t = useT();
  return (
    <Dialog title={t('dlg.keys.title')} width={60} onClose={onClose} buttons={<Button label={t.marked('dlg.close')} onClick={onClose} />}>
      <table className="keys-table">
        <tbody>
          {KEYS.map(([key, text]) => (
            <tr key={key}>
              <th scope="row">{key}</th>
              <td>{t(text)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <br />
    </Dialog>
  );
}

export function AboutDialog({ onClose }) {
  const t = useT();
  return (
    <Dialog title={t('dlg.about.title')} width={60} onClose={onClose} buttons={<Button label={t.marked('dlg.close')} onClick={onClose} />}>
      <p style={{ textAlign: 'center' }}>SIM88</p>
      <p>{t('dlg.about.text')}</p>
      <p>{t('dlg.about.license')}</p>
      <p>{t('dlg.about.font')}</p>
      <p>
        {t('dlg.about.source')}: <a href="https://github.com/sawady/sim88">github.com/sawady/sim88</a>
      </p>
    </Dialog>
  );
}

export function ConfirmDialog({ title, text, onYes, onClose }) {
  const t = useT();
  const yes = () => {
    onClose();
    onYes();
  };
  return (
    <Dialog
      title={title}
      width={52}
      onClose={onClose}
      buttons={
        <>
          <Button label={t.marked('dlg.yes')} onClick={yes} autoFocus />
          <Button label={t.marked('dlg.no')} onClick={onClose} />
        </>
      }
    >
      <p>{text}</p>
    </Dialog>
  );
}

export function SaveAsDialog({ name, onSave, onClose }) {
  const t = useT();
  const [value, setValue] = useState(name);
  const label = t.marked('dlg.saveAs.name');
  const ok = () => {
    if (!value.trim()) return;
    onClose();
    onSave(value.trim());
  };
  return (
    <Dialog title={t('dlg.saveAs.title')} width={46} onClose={onClose} onSubmit={ok} buttons={<OkCancel onOk={ok} onCancel={onClose} />}>
      <p>
        <label data-hotkey={hotkeyOf(label)}>
          <Hot text={label} />
          <br />
          <input
            className="field"
            style={{ '--size': 40 }}
            value={value}
            data-autofocus
            onChange={(ev) => setValue(ev.target.value)}
            onFocus={(ev) => ev.target.select()}
          />
        </label>
      </p>
    </Dialog>
  );
}
