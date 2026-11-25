import { describe, expect, it } from 'vitest';
import { lgr, ramas } from './lgr.js';

const redondo = (x, d) => Number(x.toFixed(d));
const z = (zs) => zs.map(([a, b]) => [redondo(a, 4), redondo(b, 4)]);

// The examples are the slides' (El Santo Resumen, tecnologias-para-la-automatizacion: parcial.md).
describe('lugar geométrico de las raíces', () => {
  it('k/(s³ + 4s² + 8s), las reglas con un caso (diapositivas «7», págs. 6 a 11)', () => {
    const r = lgr({ N: '1', D: 's^3 + 4s^2 + 8s', k: '8' });
    expect(z(r.polos)).toEqual([[-2, 2], [-2, -2], [0, 0]]);
    expect(r.ceros).toEqual([]);
    expect(r.asintotas.angulos).toEqual([60, 180, 300]);
    expect(redondo(r.asintotas.centroide, 2)).toBe(-1.33);
    expect(r.cruces.length).toBe(1);
    expect(redondo(r.cruces[0].omega, 4)).toBe(2.8284);
    expect(redondo(r.cruces[0].k, 6)).toBe(32);
    // dk/ds = −3s² − 8s − 8 = 0 gives complex roots: no breakaway point.
    expect(r.dkds).toEqual([8, 8, 3]);
    expect(r.quiebres.every((q) => q.tipo === 'compleja')).toBe(true);
    expect(redondo(r.salidas[0].angulo, 6)).toBe(-45);
    // Routh: 0 < k < 32.
    expect(r.estables.map(([a, b]) => [a, redondo(b, 6)])).toEqual([[0, 32]]);
    expect(r.tramos).toEqual([[-Infinity, 0]]);
    expect(r.conK.estable).toBe(true);
  });

  it('k/(s(s + 1)): los dos polos se juntan en −0,5 con k = 0,25 (diapositivas «7», págs. 2 y 3)', () => {
    const r = lgr({ N: '1', D: 's(s + 1)', k: '3' });
    const q = r.quiebres.filter((x) => x.tipo === 'si');
    expect(q.length).toBe(1);
    expect(q[0].s[0]).toBeCloseTo(-0.5, 12);
    expect(q[0].k).toBeCloseTo(0.25, 12);
    expect(r.tramos).toEqual([[-1, 0]]);
    expect(r.asintotas.angulos).toEqual([90, 270]);
    expect(r.asintotas.centroide).toBeCloseTo(-0.5, 12);
    // With k > 0,25 the poles are −½ ± ½√(1 − 4k), complex and on the vertical −0,5.
    expect(r.conK.polos.map(([a]) => redondo(a, 6))).toEqual([-0.5, -0.5]);
    expect(Math.abs(r.conK.polos[0][1])).toBeCloseTo(Math.sqrt(11) / 2, 6);
    expect(r.estables).toEqual([[0, null]]);
  });

  it('k/(s + 2): el polo de lazo cerrado es −2 − k', () => {
    const r = lgr({ N: '1', D: 's + 2', k: '3' });
    expect(r.conK.polos).toEqual([[-5, 0]]);
    expect(r.tramos).toEqual([[-Infinity, -2]]);
    expect(r.asintotas.angulos).toEqual([180]);
    expect(r.asintotas.centroide).toBe(-2);
  });

  it('las ramas arrancan en los polos y salen de la ventana', () => {
    const r = lgr({ N: '1', D: 's^3 + 4s^2 + 8s', k: '' });
    const lineas = ramas(r, [-7, 2], [-5, 5]);
    expect(lineas.length).toBe(3);
    lineas.forEach((l, i) => expect(l[0]).toEqual(r.polos[i]));
    expect(lineas.every((l) => l.length > 50)).toBe(true);
  });

  it('dice qué dato falla', () => {
    expect(lgr({ N: '1', D: '3', k: '' }).error.campo).toBe('D');
    expect(lgr({ N: 's^3', D: 's + 1', k: '' }).error.texto).toBe('N(s) tiene más grado que D(s). Hay más ceros que polos.');
    expect(lgr({ N: '1', D: 'sen(s)', k: '' }).error.texto).toBe('D(s) tiene que ser un polinomio en s, como s^2 + 3s o s(s + 1).');
    expect(lgr({ N: '1', D: 's + 1', k: '-2' }).error.campo).toBe('k');
  });
});
