import { describe, expect, it } from 'vitest';
import { determinante, inversa, leerFr, leerMatriz, rango, textoFr } from './matrices.js';

// The examples are the ones of the course notes of Álgebra y Geometría Analítica (El Santo Resumen, parcial-2.md),
// with the results they give.
const M = (filas) => leerMatriz(filas.map((f) => f.map(String))).matriz;
const texto = (A) => A.map((f) => f.map(textoFr));

describe('matrices', () => {
  it('lee enteros, decimales con coma o punto y fracciones, y nada más', () => {
    expect(textoFr(leerFr('3'))).toBe('3');
    expect(textoFr(leerFr('-2,5'))).toBe('−5/2');
    expect(textoFr(leerFr('0.25'))).toBe('1/4');
    expect(textoFr(leerFr('−1/3'))).toBe('−1/3');
    expect(textoFr(leerFr('4/-6'))).toBe('−2/3');
    for (const mal of ['', 'x', '1/0', '2,5,1', '1e3']) expect(leerFr(mal)).toBe(null);
    expect(leerMatriz([['1', 'a']]).error).toEqual({ fila: 0, columna: 1, texto: 'a' });
  });

  it('determinantes del apunte', () => {
    expect(textoFr(determinante(M([[3, 5], [2, 8]])).valor)).toBe('14');
    expect(textoFr(determinante(M([[2, 4, 6], [4, 0, 6], [3, 0, -2]])).valor)).toBe('104');
    expect(textoFr(determinante(M([[5, 4, 6, 2], [7, 2, 3, 5], [8, 8, -7, 4], [6, 10, 5, 0]])).valor)).toBe('−54');
    expect(textoFr(determinante(M([[2, 7], [0, 3]])).valor)).toBe('6');
    expect(textoFr(determinante(M([[1, 2], [2, 4]])).valor)).toBe('0');
    expect(determinante(M([[1, 2, 3], [4, 5, 6]]))).toBe(null);
  });

  it('un cambio de filas da vuelta el signo, y se cuenta', () => {
    const d = determinante(M([[0, 1], [1, 0]]));
    expect(textoFr(d.valor)).toBe('−1');
    expect(d.cambios).toBe(1);
    expect(d.pasos[0]).toMatchObject({ tipo: 'cambio', a: 0, b: 1, cambiadas: [0, 1] });
  });

  it('inversas del apunte, y la que no existe', () => {
    expect(texto(inversa(M([[2, 3], [1, 2]])).valor)).toEqual([['2', '−3'], ['−1', '2']]);
    expect(texto(inversa(M([[1, -1, 2], [0, 1, -1], [2, 1, 0]])).valor)).toEqual([['−1', '−2', '1'], ['2', '4', '−1'], ['2', '3', '−1']]);
    const sin = inversa(M([[1, 2], [2, 4]]));
    expect(sin.existe).toBe(false);
    expect(sin.rango).toBe(1);
  });

  it('cada paso dice qué fila cambió y con qué pivote', () => {
    const { pasos } = inversa(M([[2, 3], [1, 2]]));
    expect(pasos[0]).toMatchObject({ tipo: 'escalar', fila: 0, pivote: { fila: 0, columna: 0 } });
    expect(textoFr(pasos[0].k)).toBe('1/2');
    expect(pasos[1]).toMatchObject({ tipo: 'restar', fila: 1, con: 0, cambiadas: [1] });
  });

  it('el rango del apunte, y el de una matriz con una fila que es combinación de otras', () => {
    expect(rango(M([[2, 1, 0, 3], [0, 2, 1, -1], [3, 1, -1, 0]])).valor).toBe(3);
    expect(rango(M([[1, 2, 3], [2, 4, 6], [1, 0, 1]])).valor).toBe(2);
    expect(rango(M([[0, 0], [0, 0]])).valor).toBe(0);
  });
});
