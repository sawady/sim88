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
    // The Ace editor alone is ~600 kB; the app is a single page anyway.
    chunkSizeWarningLimit: 1000,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{js,jsx}'],
  },
});
