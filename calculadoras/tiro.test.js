import { describe, expect, it } from 'vitest';
import { tiro } from './tiro.js';

const redondo = (x, d) => Number(x.toFixed(d));

// The examples are the course's (El Santo Resumen, fisica-i: ejercicios.json and parcial-1.md).
describe('tiro oblicuo', () => {
  it('final 22/04/2025, problema 3: 20 m/s a 40° desde 22 m, choca a los 3 s', () => {
    const r = tiro({ v0: '20', phi: '40', y0: '22', g: '9,8', t: '3' });
    expect(redondo(r.vx, 2)).toBe(15.32);
    // The resolution prints d = 45,9 m: 15,32 · 3,00 = 45,96.
    expect(redondo(r.punto.x, 2)).toBe(45.96);
    expect(redondo(r.punto.dy, 2)).toBe(-5.53);
    expect(redondo(r.punto.vy, 2)).toBe(-16.54);
    expect(redondo(r.punto.v, 1)).toBe(22.5);
    // The resolution prints −47,3°; arctg(−16,54/15,32) gives −47,2°.
    expect(redondo(r.punto.phi, 1)).toBe(-47.2);
    expect(r.conSuelo).toBe(true);
    expect(r.tarde).toBe(false);
  });

  it('al mismo nivel, d = v₀·sen 2φ/g y t_v = 2·v₀ᵧ/g («Teoría Ampliada», pág. 2)', () => {
    const r = tiro({ v0: '15', phi: '40', y0: '', g: '9,8' });
    expect(r.tv).toBeCloseTo((2 * r.vy) / 9.8, 12);
    expect(r.d).toBeCloseTo((15 ** 2 * Math.sin(80 * (Math.PI / 180))) / 9.8, 10);
    expect(r.hmax).toBeCloseTo((15 * Math.sin(40 * (Math.PI / 180))) ** 2 / (2 * 9.8), 12);
    expect(r.ts).toBeCloseTo(r.tv / 2, 12);
    // Back at the same level, it arrives as fast as it left and with the angle turned down.
    expect(r.llegada.v).toBeCloseTo(15, 10);
    expect(r.llegada.phi).toBeCloseTo(-40, 10);
  });

  it('1° parcial 05/06/2025, problema 2: 8 m/s a 20° por debajo, llega al suelo a los 3 s', () => {
    const r = tiro({ v0: '8', phi: '-20', y0: '', g: '9,8', t: '3' });
    expect(r.conSuelo).toBe(false);
    expect(redondo(r.punto.x, 2)).toBe(22.55);
    // It fell 52,31 m: that is the height of the window.
    expect(redondo(r.punto.dy, 2)).toBe(-52.31);
  });

  it('tiro horizontal: t de 0 = h − ½·g·t² y d = v₀ₓ·t («Teoría Ampliada», pág. 1)', () => {
    const r = tiro({ v0: '10', phi: '0', y0: '20', g: '9,8' });
    expect(r.tv).toBeCloseTo(Math.sqrt((2 * 20) / 9.8), 12);
    expect(r.d).toBeCloseTo(10 * r.tv, 12);
    expect(r.llegada.vy).toBeCloseTo(-9.8 * r.tv, 12);
  });

  it('después del suelo no hay punto, y dice qué dato falla', () => {
    expect(tiro({ v0: '20', phi: '40', y0: '22', g: '9,8', t: '9' }).tarde).toBe(true);
    expect(tiro({ v0: '0', phi: '40', y0: '0', g: '9,8' }).error.campo).toBe('v0');
    expect(tiro({ v0: '20', phi: '100', y0: '0', g: '9,8' }).error.campo).toBe('phi');
    expect(tiro({ v0: '20', phi: '-10', y0: '0', g: '9,8' }).error.texto).toBe('Así, desde el suelo, no vuela. Falta la altura y₀ o un instante t.');
    expect(tiro({ v0: '20', phi: '40', y0: '-1', g: '9,8' }).error.campo).toBe('y0');
    expect(tiro({ v0: '20', phi: '40', y0: '0', g: '' }).error.texto).toBe('Falta g.');
  });
});
