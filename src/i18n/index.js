// Translations of the UI: a dictionary per language (es.js, en.js) and t().
// The language is a setting (see actions/settings.js); components get a t()
// bound to it with useT().

import { useMemo } from 'react';
import { useSelector } from 'react-redux';

import { t, tMarked } from './core';

export { DICTIONARIES, t, tMarked, hotkey } from './core';
export { translateMessage } from './messages';

export const useLang = () => useSelector((state) => state.settings.lang);

// t() for the current language: t('key', params); t.marked('key') keeps the
// hotkey mark; t.lang is the language.
export function useT() {
  const lang = useLang();
  return useMemo(() => {
    const bound = (key, params) => t(lang, key, params);
    bound.marked = (key, params) => tMarked(lang, key, params);
    bound.lang = lang;
    return bound;
  }, [lang]);
}
