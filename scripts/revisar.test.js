import { describe, expect, it } from 'vitest';
import { revisar, revisarTexto } from './revisar.mjs';

describe('revisarTexto', () => {
  it('finds keys, computer paths and real mail addresses', () => {
    // Built in pieces, so this file does not trip the check of the repo.
    const texto = [
      `const k = "${'sk-'}ant-0123456789abcdefghijklmn";`,
      `ver C:${'\\'}Users\\alguien\\proyecto`,
      `escribile a alguien${'@'}gmail.com`,
      'o a nadie@ejemplo.com',
    ].join('\n');
    expect(revisarTexto('a.js', texto)).toEqual([
      'a.js:1: API key (sk-)',
      'a.js:2: a path of a computer',
      'a.js:3: a mail address outside the example domains',
    ]);
  });

  it('adds the words of the extra list', () => {
    expect(revisarTexto('b.md', 'hola Nombre Secreto', ['nombre secreto'])).toEqual(['b.md:1: a word of the extra list']);
  });
});

describe('the repo', () => {
  it('has nothing that cannot be public', () => {
    expect(revisar()).toEqual([]);
  });
});
