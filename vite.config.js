import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import peggy from 'peggy';

// Compiles `*.pegjs` grammars on the fly, so the parser is always generated
// from src/grammar.pegjs (no generated file is committed).
function peggyGrammar() {
  return {
    name: 'peggy-grammar',
    transform(code, id) {
      if (!id.endsWith('.pegjs')) return null;
      const source = peggy.generate(code, {
        output: 'source',
        format: 'es',
        grammarSource: id,
      });
      return { code: source, map: null };
    },
  };
}

export default defineConfig({
  // Relative base so the build works on GitHub Pages (/sim88/) or any subpath.
  base: './',
  plugins: [peggyGrammar(), react()],
  build: {
    // The main chunk is ~300 kB; only the lazily loaded Ace editor chunk
    // (~590 kB) goes over Vite's default 500 kB warning.
    chunkSizeWarningLimit: 650,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
