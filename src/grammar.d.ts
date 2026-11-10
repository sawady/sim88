// The grammar is compiled by the peggy plugin of vite.config.js.
declare module '*.pegjs' {
  export function parse(input: string): unknown;
  export class SyntaxError extends Error {
    location: { start: { line: number; column: number } };
  }
}
