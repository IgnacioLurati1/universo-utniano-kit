import { describe, expect, it } from 'vitest';
import { conj, letra, probar, resolverER } from './automatas.js';

// The examples are the ones of the notes of Sintaxis y Semántica de los Lenguajes (parcial-2.md): (a|b)*abb of
// «Método de Thompson» and «Subconjuntos» (apunte «5. Autómatas…», págs. 9 a 13), the strings aabb and aba, and the
// expressions of «Precedencia y propiedades».
const error = (src) => {
  try {
    resolverER(src);
    return null;
  } catch (e) {
    return e.message;
  }
};

describe('autómatas', () => {
  it('Thompson de (a|b)*abb da los estados 0 a 10, inicio 0 y final 10', () => {
    const { afn } = resolverER('(a|b)*abb');
    expect(afn.n).toBe(11);
    expect(afn.inicio).toBe(0);
    expect(afn.final).toBe(10);
    expect(afn.alfabeto).toEqual(['a', 'b']);
    expect(afn.pasos.map((p) => p.regla)).toEqual(['2', '2', '3.a', '3.c', '2', '3.b', '2', '3.b', '2', '3.b']);
  });

  it('los subconjuntos del apunte, de A a E, con E final', () => {
    const { d } = resolverER('(a|b)*abb');
    expect(conj(d.estados[0].T)).toBe('{0,1,2,4,7}');
    expect(d.cuentas[0]).toMatchObject({ de: 0, c: 'a', m: [3, 8] });
    expect(conj(d.cuentas[0].T)).toBe('{1,2,3,4,6,7,8}');
    expect(d.estados).toHaveLength(5);
    expect(d.estados.map((e, q) => (e.final ? letra(q) : null)).filter(Boolean)).toEqual(['E']);
    expect(d.estados[4].T).toContain(10);
  });

  it('aabb es aceptada y aba no', () => {
    const { afn, d } = resolverER('(a|b)*abb');
    expect(probar(afn, d, 'aabb').resultado).toBe('aceptada');
    expect(probar(afn, d, 'aba').resultado).toBe('no aceptada');
    expect(probar(afn, d, 'abc')).toMatchObject({ resultado: 'abortada', fuera: true });
  });

  it('infinito por la cerradura, y su palabra más corta', () => {
    const { lenguaje } = resolverER('(a|b)*abb');
    expect(lenguaje.infinito).toBe(true);
    expect(lenguaje.repite).toBe('(a|b)*');
    expect(lenguaje.conVacia).toBe(false);
    expect(lenguaje.cortas).toEqual({ largo: 3, palabras: ['abb'], mas: false });
    expect(lenguaje.siguientes.palabras).toEqual(['aabb', 'babb']);
  });

  it('los lenguajes finitos del apunte, con todas sus palabras', () => {
    expect(resolverER('n . o | s . i').lenguaje.todas).toEqual(['no', 'si']);
    expect(resolverER('(n | o) . (s | i)').lenguaje.todas).toEqual(['ns', 'ni', 'os', 'oi']);
    expect(resolverER('n | o . s | i').lenguaje.todas).toEqual(['n', 'i', 'os']);
    expect(resolverER('a|b*c').lenguaje.infinito).toBe(true);
  });

  it('las abreviaturas + ? y las clases', () => {
    expect(resolverER('[0-9]+').lenguaje.cortas.palabras).toHaveLength(10);
    expect(resolverER('a?').lenguaje).toMatchObject({ infinito: false, conVacia: true, todas: ['', 'a'] });
  });

  it('dice qué está mal', () => {
    expect(error('')).toBe('Escribí una expresión regular, como a(a|b)*b.');
    expect(error('(a|b')).toBe('Falta cerrar un paréntesis.');
    expect(error('a|')).toBe('Falta algo después de una |.');
    expect(error('*a')).toBe('El * va después de un símbolo o de un paréntesis.');
    expect(error('a)')).toBe('Sobra un paréntesis que cierra.');
    expect(error('[c-a]')).toMatch(/El rango c-a no sirve/);
  });
});
