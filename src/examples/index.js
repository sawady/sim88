// Example programs, one per course topic (src/examples/*.asm).
//
// The first comment line is the title. A line `; conexionado: N` selects the
// MSX88 configuration the example needs (0 when absent).

const files = import.meta.glob('./*.asm', { query: '?raw', import: 'default', eager: true });

const parse = (path, source) => {
  const lines = source.split(/\r?\n/);
  const configLine = lines.find((l) => /^;\s*conexionado:\s*\d/i.test(l));
  const titleLine = lines.find((l) => l.startsWith(';') && !/conexionado:/i.test(l)) || path;
  return {
    id: path.replace('./', '').replace('.asm', ''),
    file: path.replace('./', ''),
    title: titleLine.replace(/^;\s*/, '').replace(/[:.]\s*$/, '').split(':')[0],
    config: configLine ? Number(configLine.match(/\d/)[0]) : 0,
    source,
  };
};

export const EXAMPLES = Object.entries(files)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([path, source]) => parse(path, source));

export const DEFAULT_EXAMPLE = EXAMPLES[0];
