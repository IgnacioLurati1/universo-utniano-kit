import { describe, expect, it } from 'vitest';
import { cargas } from './cargas.js';

// The examples are the course's (El Santo Resumen).
describe('campo de cargas puntuales', () => {
  const PARCIAL = { unidad: 'micro', q1: '6', p1: '0; 0', q2: '-4', p2: '1; 0', P: '0,5; 0' };

  it('1° parcial 18/06/2025, problema 1 con q₁ y q₂: E = 3,6 × 10⁵ N/C hacia +x', () => {
    const r = cargas(PARCIAL);
    expect(r.cargas[0].E).toBeCloseTo(216000, 6);
    expect(r.cargas[1].E).toBeCloseTo(144000, 6);
    // q₁ pushes P away from it, toward +x. q₂ is negative and pulls P toward it, also toward +x.
    expect(r.cargas[0].Ex).toBeCloseTo(216000, 6);
    expect(r.cargas[1].Ex).toBeCloseTo(144000, 6);
    expect(r.E).toBeCloseTo(360000, 6);
    expect(r.angulo).toBeCloseTo(0, 9);
    expect(r.V).toBeCloseTo(108000 - 72000, 6);
  });

  it('el mismo problema con q₃ = +2 µC en (0,5; 2): V = 45 000 V y la fuerza sobre un electrón', () => {
    const r = cargas({ ...PARCIAL, q3: '2', p3: '0,5; 2', q0: '-1,6e-19' });
    expect(r.cargas[2].E).toBeCloseTo(4500, 6);
    expect(r.Ey).toBeCloseTo(-4500, 6);
    expect(r.Ex).toBeCloseTo(360000, 6);
    expect(r.V).toBeCloseTo(45000, 6);
    expect(r.fuerza.Fx).toBeCloseTo(-5.76e-14, 20);
    expect(r.fuerza.F).toBeCloseTo(1.6e-19 * Math.hypot(360000, 4500), 25);
  });

  it('Coulomb: +25 nC y −75 nC a 3 cm se atraen con 0,019 N (Teoría 2025 (001), página 17)', () => {
    const r = cargas({ unidad: 'nano', q1: '25', p1: '0; 0', q2: '-75', p2: '0,03; 0', P: '0,015; 0' });
    expect(Number(r.coulomb.F.toFixed(3))).toBe(0.019);
    expect(r.coulomb.atraen).toBe(true);
  });

  it('dice qué dato falla', () => {
    expect(cargas({ ...PARCIAL, P: '0; 0' }).error).toEqual({ campo: 'P', texto: 'P cae justo sobre q₁. Ahí el campo no está definido.' });
    expect(cargas({ ...PARCIAL, p2: '0; 0' }).error.campo).toBe('p2');
    expect(cargas({ ...PARCIAL, q2: '' }).error.texto).toBe('Falta q₂.');
    expect(cargas({ ...PARCIAL, p1: '1' }).error.texto).toBe('La posición de q₁ lleva x e y, como 1; 2. Van separadas por punto y coma.');
    expect(cargas({ ...PARCIAL, q3: '2', p3: '' }).error.campo).toBe('p3');
  });
});
