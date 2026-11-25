import { describe, expect, it } from 'vitest';
import { analizar, deParesTexto, leerConjunto, leerPares, matriz } from './relaciones.js';

// The examples are the ones of the notes of Lógica y Estructuras Discretas: Ejemplo 3 of Relaciones y digrafos III
// (parcial-2.md, «Las seis propiedades»), with R², and Ejemplo 8 for the domain and range.
const A = ['1', '2', '3', '4'];
const de = (texto) => analizar(A, leerPares(texto, A).pares);
const r2 = (x) => deParesTexto(x.r2.map((v) => v.par));
const cumple = (x) => Object.fromEntries(x.propiedades.map((p) => [p.nombre, p.cumple]));

describe('relaciones', () => {
  it('lee el conjunto y los pares, y dice qué está mal', () => {
    expect(leerConjunto('{1, 2, 3, 4}').elementos).toEqual(A);
    expect(leerConjunto('a b c').elementos).toEqual(['a', 'b', 'c']);
    expect(leerConjunto('').error).toBe('Escribí los elementos de A.');
    expect(leerConjunto('1 2 1').error).toBe('1 está dos veces en A.');
    expect(leerConjunto('1 2 3 4 5 6 7 8 9 10 11').error).toBe('A tiene 11 elementos y el tope es 10.');
    expect(leerPares('{(1,1), (1,2)}', A).pares).toEqual([['1', '1'], ['1', '2']]);
    expect(leerPares('', A).pares).toEqual([]);
    expect(leerPares('(1,5)', A).error).toBe('En (1,5), 5 no está en A.');
    expect(leerPares('(1,2) 3', A).error).toMatch(/No entiendo «3»/);
  });

  it('S del Ejemplo 3 es transitiva porque S² = S', () => {
    const S = de('(1,1), (1,2), (1,3), (2,3), (3,3)');
    expect(r2(S)).toBe('{(1,1), (1,2), (1,3), (2,3), (3,3)}');
    expect(S.transitiva).toBe(true);
  });

  it('T del Ejemplo 3 es transitiva porque T² está incluida en T', () => {
    const T = de('(1,2), (1,3), (2,3), (3,3)');
    expect(r2(T)).toBe('{(1,3), (2,3), (3,3)}');
    expect(T.transitiva).toBe(true);
  });

  it('L del Ejemplo 3 no es transitiva por (1,2), (2,3) y (1,3)', () => {
    const L = de('(1,1), (1,2), (2,3), (3,1)');
    expect(L.transitiva).toBe(false);
    expect(L.fuera.map((v) => v.par)).toContainEqual(['1', '3']);
    expect(L.propiedades.find((p) => p.nombre === 'Transitiva').por).toBe('Están (1,2) y (2,3), pero (1,3) no.');
  });

  it('R del apunte es transitiva por vacuidad', () => {
    const R = de('(1,2), (1,3), (4,2)');
    expect(R.r2).toEqual([]);
    expect(R.propiedades.find((p) => p.nombre === 'Transitiva')).toMatchObject({ cumple: true, por: 'No hay dos flechas seguidas. Se cumple por vacuidad.' });
  });

  it('cada propiedad por separado, y la igualdad es de equivalencia y de orden', () => {
    expect(cumple(de('(1,2), (1,3), (4,2)'))).toEqual({ Reflexiva: false, Irreflexiva: true, Simétrica: false, Asimétrica: true, Antisimétrica: true, Transitiva: true });
    const igualdad = de('(1,1), (2,2), (3,3), (4,4)');
    expect(igualdad.equivalencia && igualdad.deOrden).toBe(true);
    expect(igualdad.clases.map((c) => c.elementos)).toEqual([['1'], ['2'], ['3'], ['4']]);
  });

  it('las clases de una de equivalencia', () => {
    const E = de('(1,1), (2,2), (3,3), (4,4), (1,2), (2,1), (3,4), (4,3)');
    expect(E.equivalencia).toBe(true);
    expect(E.deOrden).toBe(false);
    expect(E.clases).toEqual([{ de: '1', elementos: ['1', '2'] }, { de: '3', elementos: ['3', '4'] }]);
  });

  it('dominio, rango y matriz', () => {
    const R = de('(1,2), (1,3), (4,2)');
    expect(R.dominio).toEqual(['1', '4']);
    expect(R.rango).toEqual(['2', '3']);
    expect(matriz(A, R.pares)).toEqual([[0, 1, 1, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 1, 0, 0]]);
  });
});
