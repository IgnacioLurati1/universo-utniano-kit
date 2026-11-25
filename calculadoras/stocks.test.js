import { describe, expect, it } from 'vitest';
import { basico, escalon, excedente, financiera, ingreso, periodo, seguridad } from './stocks.js';

// The examples of the notes of Gestión de Stocks (El Santo Resumen, investigacion-operativa/parcial-3.md), with the
// results they print.
const r = (x, d = 2) => Math.round(x * 10 ** d) / 10 ** d;

describe('gestión de stocks', () => {
  it('Mussi: Q* 1.095, CT 4,365, T* 3,65 y PP 69 (pág. 12)', () => {
    const m = basico({ D: 300, L: 200, C: 4, i: 0.025, LT: 0.23 });
    expect(Math.round(m.Q)).toBe(1095);
    expect(r(m.CT, 3)).toBe(4.365);
    expect(r(m.T)).toBe(3.65);
    expect(Math.round(m.PP)).toBe(69);
    expect(r(m.fijos, 6)).toBe(r(m.mantenimiento, 6));
    expect(r(m.curva(1200), 3)).toBe(4.367);
  });

  it('Northern Group: Q* 1.990 y, con Q = 2.000, CT 80,96, PP 320 y stock promedio 600 (págs. 17 y 18)', () => {
    const n = ingreso({ D: 2000, V: 5000, L: 950, C: 80, i: 0.02, LT: 0.16 });
    expect(Math.round(n.Q)).toBe(1990);
    expect(r(n.curva(2000))).toBe(80.96);
    expect(Math.round(n.PP)).toBe(320);
    expect(r((2000 * n.factor) / 2)).toBe(600);
    expect(r(2000 / 5000)).toBe(0.4);
  });

  it('Autoreptos: Q₂* 173, Q₁* 155, CT₁ 10,16, CT₂(600) 8,26, conviene 600 y PP 57 (págs. 19 y 20)', () => {
    const a = escalon({ D: 250, L: 12, i: 0.3 / 12, C1: 10, C2: 8, a: 600, LT: 0.228 });
    expect(Math.round(a.Q2)).toBe(173);
    expect(Math.round(a.Q1)).toBe(155);
    // The notes print 10,16: they add the two terms already rounded (0,0775 + 0,0775).
    expect(r(a.ct1, 3)).toBe(10.155);
    expect(r(a.ct2)).toBe(8.26);
    expect(a.caso).toBe('comparar');
    expect(a.Q).toBe(600);
    expect(Math.round(a.PP)).toBe(57);
  });

  it('un escalón con a debajo de Q₂* deja el óptimo en Q₂*', () => {
    const a = escalon({ D: 250, L: 12, i: 0.025, C1: 10, C2: 8, a: 100, LT: 0 });
    expect(a.caso).toBe('a-antes');
    expect(a.Q).toBe(a.Q2);
  });

  it('Calvani: Q₁* 4,30, Q₂* 41,12, CT₁ 2.613,96, CT₂ 2.419,70 y PP 6,6 (págs. 23 y 24)', () => {
    const c = excedente({ D: 20, L: 30, i: 0.025, C1: 2600, C2: 2300, a: 8, LT: 0.33 });
    expect(r(c.Q1)).toBe(4.3);
    // The notes round Q₂* = 41,1149 up to 41,12.
    expect(r(c.Q2, 1)).toBe(41.1);
    expect(r(c.ct1)).toBe(2613.96);
    expect(r(c.ct2, 1)).toBe(2419.7);
    expect(c.Q).toBe(c.Q2);
    expect(r(c.PP, 1)).toBe(6.6);
  });

  it('los otros dos casos del procedimiento de la pág. 23', () => {
    expect(excedente({ D: 20, L: 30, i: 0.025, C1: 2600, C2: 2300, a: 2, LT: 0 }).caso).toBe('q1-pasa');
    const sinLlegar = excedente({ D: 20, L: 30, i: 0.025, C1: 2600, C2: 2300, a: 1000, LT: 0 });
    expect(sinLlegar.caso).toBe('q2-no-llega');
    expect(sinLlegar.Q).toBe(sinLlegar.Q1);
  });

  it('Paper Center: T* 0,92 mes, CT 7.266,87 y con T = 1, 7.267,36 (págs. 28 y 29)', () => {
    const p = periodo({ C: 7136, L: 60, S: 142.72, Tc: 1 });
    expect(r(p.T)).toBe(0.92);
    expect(r(p.CT)).toBe(7266.87);
    expect(r(p.CTc)).toBe(7267.36);
  });

  it('Audio Ingeniería: con λ = 0, 335 y 280 e I 43.600; con λ = 0,012, 265, 221 e I 34.460 (págs. 33 y 34)', () => {
    const articulos = [{ D: 600, L: 300, C: 160 }, { D: 313, L: 300, C: 120 }];
    const f = financiera({ i: 0.02, I0: 35000, articulos, pruebas: [0, 0.03, 0.015, 0.012] });
    expect(f.libre.lotes.map(Math.round)).toEqual([335, 280]);
    expect(Math.round(f.libre.I / 100) * 100).toBe(43600);
    expect(f.efectiva).toBe(true);
    const ultima = f.pruebas.at(-1);
    expect(ultima.lotes.map(Math.round)).toEqual([265, 221]);
    expect(Math.abs(ultima.I - 34460)).toBeLessThan(60);
    expect(r(f.final.I, 0)).toBe(35000);
    expect(f.final.lambda).toBeGreaterThan(0.011);
    expect(f.final.lambda).toBeLessThan(0.012);
  });

  it('sin restricción efectiva, λ queda en 0', () => {
    const f = financiera({ i: 0.02, I0: 50000, articulos: [{ D: 600, L: 300, C: 160 }] });
    expect(f.efectiva).toBe(false);
    expect(f.final.lambda).toBe(0);
  });

  it('Metalsur: S_DLT 12,99, SS 26,76 y PP 688,68 (págs. 43 y 44)', () => {
    const s = seguridad({ media: 55.16, desvio: 3.75, LT: 12, z: 2.06 });
    expect(r(s.mediaLT)).toBe(661.92);
    expect(r(s.desvioLT)).toBe(12.99);
    expect(r(s.SS)).toBe(26.76);
    expect(r(s.PP)).toBe(688.68);
  });
});
