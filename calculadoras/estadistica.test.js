import { describe, expect, it } from 'vitest';
import { caja, desplegar, frecuencias, medidas, variableDiscreta } from './estadistica.js';

// The data of the course notes of Probabilidad y Estadística (El Santo Resumen, parcial-1.md and parcial-2.md):
// the terminal used during 50 days (Tratamiento de datos, pág. 11 to 29), the 30 backups of the stem-and-leaf
// diagram (pág. 13 and 30) and Tabla 3.1 of the unsatisfied clients (V.A.D., pág. 3 to 6).
const TERMINAL = desplegar([84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94].map((x, i) => ({ x, n: [2, 4, 3, 7, 10, 9, 5, 6, 3, 0, 1][i] })));
const BACKUPS = [80, 85, 90, 92, 94, 95, 100, 100, 102, 105, 108, 108, 110, 110, 112, 113, 115, 116, 117, 118, 120, 120, 125, 130, 130, 133, 140, 148, 150, 151];
const r2 = (x) => Math.round(x * 100) / 100;

describe('medidas de datos', () => {
  it('los 50 días de la terminal: media 88,44, mediana 88, moda 88, rango 10, s² 4,99 y s 2,23', () => {
    const m = medidas(TERMINAL);
    expect(m.n).toBe(50);
    expect(r2(m.media)).toBe(88.44);
    expect(m.mediana).toBe(88);
    expect(m.centro).toEqual([25, 26]);
    expect(m.modas).toEqual([88]);
    expect(m.maxFrec).toBe(10);
    expect(m.rango).toBe(10);
    expect(r2(m.s2)).toBe(4.99);
    expect(r2(m.s)).toBe(2.23);
    expect(m.filas.find((f) => f.x === 88)).toMatchObject({ n: 10, N: 26 });
  });

  it('los 30 backups: media 113,9 y desvío 18,696, como recalcula el resumen', () => {
    const m = medidas(BACKUPS);
    expect(r2(m.media)).toBe(113.9);
    expect(Math.round(m.s * 1000) / 1000).toBe(18.696);
    expect(m.centro).toEqual([15, 16]);
  });

  it('sin moda cuando todos se repiten igual, y una sola si hay un único valor', () => {
    expect(medidas([1, 2, 3]).modas).toEqual([]);
    expect(medidas([4, 4]).modas).toEqual([4]);
    expect(medidas([1, 1, 2, 2, 3]).modas).toEqual([1, 2]);
  });

  it('frecuencias acumuladas en orden', () => {
    expect(frecuencias([3, 1, 3, 2])).toEqual([{ x: 1, n: 1, N: 1 }, { x: 2, n: 1, N: 2 }, { x: 3, n: 2, N: 4 }]);
  });
});

describe('diagrama de caja', () => {
  it('la terminal: q₁ 87, mediana 88 y q₃ 90, con los bigotes en 84 y 94', () => {
    const c = caja(TERMINAL);
    expect(c.q1).toMatchObject({ cuanto: 12.5, posicion: 13, valor: 87 });
    expect(c.q3).toMatchObject({ cuanto: 37.5, posicion: 38, valor: 90 });
    expect(c.me.valor).toBe(88);
    expect(c.riq).toBe(3);
    expect([c.bInf, c.bSup]).toEqual([84, 94]);
    expect(c.atipicos).toEqual([]);
  });

  it('con la regla de 1,5 riq quedan afuera los atípicos', () => {
    const c = caja(TERMINAL, { bigotes: 'riq' });
    expect(c.bajo).toBe(82.5);
    expect(c.alto).toBe(94.5);
    expect(c.atipicos).toEqual([]);
    const d = caja([1, 2, 3, 4, 5, 6, 7, 30], { bigotes: 'riq' });
    expect(d.q1.valor).toBe(2);
    expect(d.q3.valor).toBe(6);
    expect(d.atipicos).toEqual([30]);
    expect(d.bSup).toBe(12);
  });

  it('el cuartil es el dato que acumula por lo menos el porcentaje, aunque caiga justo', () => {
    const c = caja([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(c.q1).toMatchObject({ cuanto: 2, posicion: 2, valor: 2 });
    expect(c.q3).toMatchObject({ cuanto: 6, posicion: 6, valor: 6 });
    expect(c.me.valor).toBe(4.5);
  });
});

describe('variable aleatoria discreta', () => {
  it('Tabla 3.1: cierra, E(X) 3,188, V(X) 3,67 y σ 1,92', () => {
    const v = variableDiscreta([0, 1, 2, 3, 4, 5, 6, 7], [0.085, 0.118, 0.184, 0.217, 0.127, 0.118, 0.104, 0.047]);
    expect(v.cierra).toBe(true);
    expect(Math.round(v.esperanza * 1000) / 1000).toBe(3.188);
    expect(r2(v.varianza)).toBe(3.67);
    expect(r2(v.desvio)).toBe(1.92);
    expect(Math.round(v.filas[4].F * 1000) / 1000).toBe(0.731);
  });

  it('avisa cuando no se cumple la condición de cierre', () => {
    expect(variableDiscreta([0, 1], [0.5, 0.4]).cierra).toBe(false);
  });
});
