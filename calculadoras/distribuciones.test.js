import { describe, expect, it } from 'vitest';
import { combinatorio, continua, discreta, MODELOS, revisarCampo } from './distribuciones.js';

// The examples of the course notes of Probabilidad y Estadística (El Santo Resumen),
// with the results they print.
const r4 = (x) => Math.round(x * 1e4) / 1e4;
const r3 = (x) => Math.round(x * 1e3) / 1e3;

describe('distribuciones del apunte', () => {
  it('Binomial: cinco personas en un sitio, π = 0,2 (V.A.D., pág. 8 y 10)', () => {
    const r = discreta('binomial', { n: 5, pi: 0.2 }, 'igual', 2);
    expect(r4(r.valor)).toBe(0.2048);
    expect(combinatorio(5, 2)).toBe(10);
    expect(r.esperanza).toBe(1);
    expect(r4(r.varianza)).toBe(0.8);
    expect(r.tabla).toHaveLength(6);
    expect(r4(r.tabla.reduce((s, t) => s + t.p, 0))).toBe(1);
  });

  it('P(X ≤ k) suma las puntuales y P(X ≥ k) sale del complemento', () => {
    const hasta = discreta('binomial', { n: 5, pi: 0.2 }, 'hasta', 2);
    expect(hasta.terminos.map((t) => t.i)).toEqual([0, 1, 2]);
    expect(r4(hasta.valor)).toBe(0.9421);
    const desde = discreta('binomial', { n: 5, pi: 0.2 }, 'desde', 2);
    expect(desde.terminos.map((t) => t.i)).toEqual([0, 1]);
    expect(r4(desde.valor)).toBe(r4(1 - 0.32768 - 0.4096));
  });

  it('Poisson: llamadas y caídas (V.A.D., pág. 12 y 13)', () => {
    expect(r3(discreta('poisson', { lam: 5 }, 'igual', 2).valor)).toBe(0.084);
    expect(r3(discreta('poisson', { lam: 0.4 }, 'igual', 1).valor)).toBe(0.268);
    expect(r3(discreta('poisson', { lam: 0.96 }, 'igual', 0).valor)).toBe(0.383);
    expect(r3(discreta('poisson', { lam: 0.16 }, 'desde', 1).valor)).toBe(0.148);
    const { tabla } = discreta('poisson', { lam: 5 }, 'igual', 2);
    expect(tabla.at(-1).i).toBeGreaterThanOrEqual(14);
  });

  it('Hipergeométrica: media n·π y la varianza con (1 − π) (V.A.D., pág. 11)', () => {
    const r = discreta('hipergeometrica', { N: 20, r: 5, m: 4 }, 'igual', 1);
    expect(r.esperanza).toBe(1);
    expect(r4(r.varianza)).toBe(r4(4 * 0.25 * 0.75 * (16 / 19)));
    expect(r4(r.tabla.reduce((s, t) => s + t.p, 0))).toBe(1);
    expect(MODELOS.hipergeometrica.revisar({ N: 5, r: 6, m: 2 })).toMatch(/r no puede/);
  });

  it('Normal: el 10% de las veces tarda más de 12,05 s, con μ = 10 y σ = 1,6 (V.A.C., pág. 7)', () => {
    const r = continua('normal', { mu: 10, sig: 1.6 }, 'mayor', { x: 12.05 });
    expect(r4(r.z)).toBe(1.2813);
    expect(Math.round(r.valor * 100) / 100).toBe(0.1);
    const p = continua('normal', { mu: 10, sig: 1.6 }, 'percentil', { p: 0.9 });
    expect(r4(p.z)).toBe(1.2816);
    expect(Math.round(p.valor * 100) / 100).toBe(12.05);
  });

  it('Exponencial: interrupciones y fusibles (V.A.C., pág. 9, y Práctica Extra, pág. 6)', () => {
    expect(r4(continua('exponencial', { lam: 0.2 }, 'menor', { x: 4 }).valor)).toBe(0.5507);
    expect(r4(continua('exponencial', { lam: 0.25 }, 'mayor', { x: 3 }).valor)).toBe(0.4724);
    const r = continua('exponencial', { lam: 0.2 }, 'menor', { x: 4 });
    expect(r.esperanza).toBe(5);
    expect(r.varianza).toBeCloseTo(25, 9);
  });

  it('Uniforme: el área de un rectángulo en U(1, 3) (V.A.C., pág. 11)', () => {
    expect(continua('uniforme', { a: 1, b: 3 }, 'entre', { x: 1.25, x2: 2.25 }).valor).toBe(0.5);
    expect(MODELOS.uniforme.revisar({ a: 3, b: 1 })).toMatch(/menor/);
  });

  it('t de Student y chi-cuadrado: los percentiles de los intervalos (Material 5, pág. 15 y 16)', () => {
    expect(r3(continua('student', { g: 119 }, 'percentil', { p: 0.995 }).valor)).toBe(2.618);
    expect(r3(continua('chi', { g: 119 }, 'percentil', { p: 0.995 }).valor)).toBe(162.481);
    expect(r3(continua('chi', { g: 119 }, 'percentil', { p: 0.005 }).valor)).toBe(83.018);
  });

  it('cada campo revisa lo suyo', () => {
    expect(revisarCampo('n', 2.5)).toMatch(/entero/);
    expect(revisarCampo('pi', 1)).toMatch(/entre 0 y 1/);
    expect(revisarCampo('lam', 0)).toMatch(/mayor que 0/);
    expect(revisarCampo('mu', -3)).toBe('');
  });
});
