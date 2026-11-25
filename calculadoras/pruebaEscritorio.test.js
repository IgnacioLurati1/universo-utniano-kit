import { describe, expect, it } from 'vitest';
import { simularCola, simularInventario, subindice } from './pruebaEscritorio.js';

// The queue: the data of the course notes (Fig. 1.7, folios 7 to 13), as El Santo Resumen runs them, with the results
// it prints in simulacion/parcial.md. The inventory: the notes' costs and demand (folios 21 to 23) with the example
// of El Santo Resumen (its own random numbers), checked against its simulator.
const A = [0.4, 1.2, 0.5, 1.7, 0.2, 1.6, 0.2, 1.4, 1.9];
const S = [2.0, 0.7, 0.2, 1.1, 3.7, 0.6];
const U = '0.84 0.97 0.1 0.7 0.24 0.07 0.36 0.54 0.19 0.42 0.61 0.69 0.17 0.19 0.61 0.89 0.05 0.52 0.92 0.21 0.4 0.03 0.69 0.07 0.58 0.33 0.76 0.12 0.45 0.88 0.27 0.64 0.09 0.81 0.36 0.53 0.95 0.18 0.72 0.41 0.66 0.04 0.29 0.86 0.15'.split(' ').map(Number);
const INVENTARIO = { I0: 20, s: 20, S: 60, n: 2, K: 32, i: 3, h: 1, pi: 5, beta: 0.1, a: 0.5, b: 1, dec: 3, tamanos: [1, 2, 3, 4], probs: [1 / 6, 1 / 3, 1 / 3, 1 / 6], U };
const r2 = (x) => Math.round(x * 100) / 100;

describe('cola simple', () => {
  it('los datos del apunte: 14 filas, d̂(6) = 5,7 / 6 = 0,95, q̂(6) = 9,9 / 8,6 = 1,15 y û(6) = 7,7 / 8,6 = 0,90', () => {
    const { filas, fin } = simularCola({ A, S, n: 6 });
    expect(filas).toHaveLength(14);
    expect(fin).toMatchObject({ T: 8.6, demoraTotal: 5.7, areaQ: 9.9, areaB: 7.7 });
    expect([r2(fin.d), r2(fin.q), r2(fin.u)]).toEqual([0.95, 1.15, 0.9]);
  });

  it('cada fila dice el evento, el cliente y lo que pasó', () => {
    const { filas } = simularCola({ A, S, n: 6 });
    expect(filas[0]).toMatchObject({ evento: 'inicio', reloj: 0, proxArribo: 0.4, proxPartida: Infinity, B: 0, Q: 0 });
    expect(filas[1]).toMatchObject({ evento: 'arribo', cliente: 1, reloj: 0.4, B: 1, proxPartida: 2.4, proxArribo: 1.6, demorados: 1 });
    expect(filas[1].texto).toMatch(/servidor está libre/);
    expect(filas[2]).toMatchObject({ evento: 'arribo', cliente: 2, Q: 1, cola: [1.6] });
    expect(filas.at(-1).texto).toMatch(/termina la corrida/);
  });

  it('en un empate va primero el arribo (folio 22)', () => {
    const { filas } = simularCola({ A: [1, 1, 5], S: [1, 1], n: 2 });
    expect(filas[2]).toMatchObject({ reloj: 2, evento: 'arribo' });
    expect(filas[3]).toMatchObject({ reloj: 2, evento: 'partida' });
  });
});

describe('inventario (s, S)', () => {
  it('el ejemplo da lo mismo que el simulador de El Santo Resumen', () => {
    const { filas, fin, usados, corte } = simularInventario(INVENTARIO);
    expect(corte).toBe('');
    expect(filas).toHaveLength(16);
    expect(usados).toBe(24);
    expect(fin).toMatchObject({ costo: 218, pedidos: 1, areaMas: 21.986, areaMenos: 4.564 });
    expect(r2(fin.total)).toBe(131.4);
  });

  it('en la evaluación del mes 1, I = s y no se pide, porque la regla es I < s', () => {
    const { filas } = simularInventario(INVENTARIO);
    const primera = filas.find((q) => q.evento === 'evaluacion');
    expect(primera.reloj).toBe(0);
    expect(primera.texto).toMatch(/no es menor que s = 20/);
  });

  it('si se acaban los números al azar, lo dice', () => {
    const r = simularInventario({ ...INVENTARIO, U: U.slice(0, 5) });
    expect(r.corte).toBe('faltan-u');
    expect(r.fin).toBe(null);
  });

  it('U con subíndice', () => {
    expect(subindice(12)).toBe('₁₂');
  });
});
