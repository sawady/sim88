// Example programs, one per course topic: src/examples/*.asm in Spanish and
// src/examples/en/*.asm in English, matched by their number.
//
// The first comment line is the title. A line `; conexionado: N` (in English,
// `; configuration: N`) selects the MSX88 configuration the example needs (0
// when absent).

const spanish = import.meta.glob('./*.asm', { query: '?raw', import: 'default', eager: true });
const english = import.meta.glob('./en/*.asm', { query: '?raw', import: 'default', eager: true });

const CONFIG_LINE = /^;\s*(?:conexionado|configuration):\s*(\d)/i;

const fileName = (path) => path.split('/').pop();
const numberOf = (path) => fileName(path).split('-')[0];

const parse = (path, source) => {
  const lines = source.split(/\r?\n/);
  const configLine = lines.find((l) => CONFIG_LINE.test(l));
  const titleLine = lines.find((l) => l.startsWith(';') && !CONFIG_LINE.test(l)) || path;
  const englishPath = Object.keys(english).find((p) => numberOf(p) === numberOf(path));
  return {
    id: fileName(path).replace('.asm', ''),
    file: fileName(path),
    title: titleLine.replace(/^;\s*/, '').replace(/[:.]\s*$/, '').split(':')[0],
    config: configLine ? Number(configLine.match(CONFIG_LINE)[1]) : 0,
    source,
    versions: {
      es: { file: fileName(path), source },
      ...(englishPath && { en: { file: fileName(englishPath), source: english[englishPath] } }),
    },
  };
};

export const EXAMPLES = Object.entries(spanish)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, source]) => parse(path, source));

export const DEFAULT_EXAMPLE = EXAMPLES[0];

// The file and the source of an example in a language of the interface.
export const exampleVersion = (example, lang) => example.versions[lang] ?? example.versions.es;

// The example whose text (in any language) is exactly `text`, if there is one.
export const findExampleBySource = (text) =>
  EXAMPLES.find((e) => Object.values(e.versions).some((v) => v.source === text));
