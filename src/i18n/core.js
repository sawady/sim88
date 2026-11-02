// Dictionaries and t(), without React (also used by messages.js).

import es from './es';
import en from './en';

export const DICTIONARIES = { es, en };

const interpolate = (text, params) =>
  text.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));

// The text of `key` in `lang` (Spanish when the key is missing in `lang`, the
// key itself when it is missing everywhere), keeping the `~` hotkey mark.
export const tMarked = (lang, key, params = {}) => {
  const text = DICTIONARIES[lang]?.[key] ?? DICTIONARIES.es[key] ?? key;
  return interpolate(text, params);
};

// The same, without the hotkey mark.
export const t = (lang, key, params) => tMarked(lang, key, params).replace(/~/g, '');

// Splits a marked text in the parts before, at and after the hotkey letter.
export function hotkey(marked) {
  const i = marked.indexOf('~');
  if (i < 0) return { before: marked, key: '', after: '' };
  return { before: marked.slice(0, i), key: marked[i + 1] || '', after: marked.slice(i + 2) };
}
