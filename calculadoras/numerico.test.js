import { describe, expect, it } from 'vitest';
import { escribir } from '../formulas/formula.js';
import { errorRelativo, puntoFijo, pvi, raices } from './numerico.js';

// The examples and results are the course's (El Santo Resumen, analisis-numerico: from the PPT de Métodos
// Cerrados y Abiertos, from the Chapra).
const PARACAIDISTA = '667,38/x*(1 - e^(-0,146843x)) - 40';
const redondo = (x, d) => Number(x.toFixed(d));

describe('raíces', () => {
  it('bisección con el paracaidista: 14, 15 y 14,5 (filminas 8 a 10)', () => {
    const r = raices({ metodo: 'biseccion', f: PARACAIDISTA, a: '12', b: '16', max: '3', verdadero: '14,7802' });
    expect(r.filas.map((f) => f.xr)).toEqual([14, 15, 14.5]);
    expect(r.filas.map((f) => redondo(f.et, 1))).toEqual([5.3, 1.5, 1.9]);
    // «Segunda iteración. f(xₗ)·f(xᵣ) = 9,517 > 0, entonces xₗ = xᵣ = 14»: the product of the first xᵣ decides.
    expect(redondo(r.filas[0].prod, 3)).toBe(9.517);
    expect(r.filas[0].queda).toBe('xl');
    expect(redondo(r.filas[1].prod, 3)).toBe(-0.666);
    expect(r.filas[1].queda).toBe('xu');
    expect(r.filas[0].ea).toBe(null);
    // The notes print f(12) = 6,0699 (filmina 8); the function gives 6,0669, as filmina 19 prints it.
    expect(redondo(r.inicio.fl, 4)).toBe(6.0669);
    expect(redondo(r.inicio.fu, 4)).toBe(-2.2688);
    expect(r.fin.tipo).toBe('max');
  });

  it('falsa posición con el paracaidista: 14,9113 y 14,7942 (filminas 18 y 19)', () => {
    const r = raices({ metodo: 'falsa', f: PARACAIDISTA, a: '12', b: '16', max: '2', verdadero: '14,7802' });
    expect(r.filas.map((f) => redondo(f.xr, 4))).toEqual([14.9113, 14.7942]);
    expect(redondo(r.filas[0].et, 2)).toBe(0.89);
    expect(redondo(r.filas[1].et, 2)).toBe(0.09);
    expect(redondo(r.filas[1].ea, 2)).toBe(0.79);
    expect(r.filas[0].queda).toBe('xu');
  });

  it("Newton-Raphson con e^(−x) − x desde 0 (filmina 38), con f' por las reglas", () => {
    const r = raices({ metodo: 'newton', f: 'e^(-x) - x', x0: '0', max: '4', verdadero: '0,56714329' });
    expect(escribir(r.nodoD)).toBe('−e^(−x) − 1');
    expect(r.filas.map((f) => redondo(f.x1, 9))).toEqual([0.5, 0.566311003, 0.567143165, 0.56714329]);
    expect(redondo(r.filas[0].et, 1)).toBe(11.8);
    expect(redondo(r.filas[1].et, 3)).toBe(0.147);
    expect(r.filas[2].et).toBeCloseTo(0.000022, 6);
  });

  it('secante con e^(−x) − x desde 0 y 1 (filminas 46 y 47)', () => {
    const r = raices({ metodo: 'secante', f: 'e^(-x) - x', a: '0', b: '1', max: '3', verdadero: '0,56714329' });
    expect(r.filas.map((f) => redondo(f.x1, 5))).toEqual([0.6127, 0.56384, 0.56717]);
    expect(redondo(r.filas[1].fb, 5)).toBe(-0.07081);
    expect(redondo(r.filas[0].et, 0)).toBe(8);
    expect(redondo(r.filas[1].et, 2)).toBe(0.58);
    expect(redondo(r.filas[2].et, 4)).toBe(0.0048);
  });

  it('para con εs, y avisa lo que no se puede', () => {
    const r = raices({ metodo: 'biseccion', f: PARACAIDISTA, a: '12', b: '16', max: '50', es: '1' });
    expect(r.fin.tipo).toBe('tolerancia');
    expect(r.ea).toBeLessThan(1);
    expect(raices({ metodo: 'biseccion', f: 'x^2 + 1', a: '0', b: '1', max: '5' }).error.campo).toBe('b');
    expect(raices({ metodo: 'biseccion', f: 'x', a: '2', b: '1', max: '5' }).error.texto).toBe('xᵤ tiene que ser mayor que xₗ.');
    expect(raices({ metodo: 'newton', f: 'x^2 - 1', x0: '0', max: '5' }).error.campo).toBe('x0');
    expect(raices({ metodo: 'newton', f: 'x^', x0: '0', max: '5' }).error.campo).toBe('f');
    expect(raices({ metodo: 'newton', f: 'x', x0: '1', max: '0' }).error.campo).toBe('max');
    // Filmina 40: x¹⁰ − 1 desde 0,5 empieza lejísimos.
    expect(raices({ metodo: 'newton', f: 'x^10 - 1', x0: '0,5', max: '1' }).filas[0].x1).toBeCloseTo(51.65, 2);
  });
});

describe('punto fijo', () => {
  it('g(x) = e^(−x) desde 0, la tabla de la filmina 30', () => {
    const r = puntoFijo({ g: 'e^(-x)', x0: '0', max: '10', verdadero: '0,56714329' });
    // The table cuts at six decimals: 0,5004735 is 0,500473 there.
    const tabla = [0, 1, 0.367879, 0.692201, 0.500473, 0.606244, 0.545396, 0.579612, 0.560115, 0.571143, 0.564879];
    r.filas.forEach((f, i) => expect(Math.abs(f.x - tabla[i])).toBeLessThan(1e-6));
    expect(r.filas.slice(1, 4).map((f) => redondo(f.ea, 1))).toEqual([100, 171.8, 46.9]);
    expect(r.filas.slice(0, 3).map((f) => redondo(f.et, 1))).toEqual([100, 76.3, 35.1]);
    expect(redondo(r.filas[10].et, 3)).toBe(0.399);
    expect(escribir(r.nodoD)).toBe('−e^(−x)');
    expect(r.pendiente).toBeLessThan(1);
  });

  it('un despeje que no conviene se aleja', () => {
    expect(puntoFijo({ g: '-ln(x)', x0: '0,6', max: '10' }).pendiente).toBeGreaterThan(1);
    // «Armado para este resumen»: g(x) = ½cos x, |g'| ≤ ½ en toda la recta.
    expect(escribir(puntoFijo({ g: '1/2cos(x)', x0: '1', max: '5' }).nodoD)).toBe('−0,5·sen(x)');
  });
});

describe('problema de valor inicial', () => {
  const ED = '-2x^3 + 12x^2 - 20x + 8,5';
  const EXACTA = '-0,5x^4 + 4x^3 - 10x^2 + 8,5x + 1';

  it('Euler, ejemplo 25.1: 5,25 y 5,875', () => {
    const r = pvi({ metodo: 'euler', f: ED, x0: '0', y0: '1', h: '0,5', xf: '4', exacta: EXACTA });
    expect(r.pasos.length).toBe(8);
    expect(r.pasos[0].k1).toBe(8.5);
    expect(r.pasos[0].y1).toBe(5.25);
    expect(r.pasos[1].y1).toBe(5.875);
    expect(r.pasos[0].yv).toBe(3.21875);
    expect(redondo(r.pasos[0].et, 1)).toBe(63.1);
    expect(r.pasos[1].yv).toBe(3);
  });

  it('Heun, ejemplo 25.5: 6,701082', () => {
    const r = pvi({ metodo: 'heun', f: '4e^(0,8x) - 0,5y', x0: '0', y0: '2', h: '1', xf: '4' });
    const p = r.pasos[0];
    expect(p.k1).toBe(3);
    expect(p.predictor).toBe(5);
    expect(redondo(p.k2, 6)).toBe(6.402164);
    expect(redondo(p.promedio, 6)).toBe(4.701082);
    expect(redondo(p.y1, 6)).toBe(6.701082);
    expect(redondo(errorRelativo(6.1946314, p.y1), 2)).toBe(8.18);
  });

  // The notes print 3,751669; with their own k₁ to k₄ the formula gives 3,751699, as in the Chapra.
  it('Runge-Kutta de cuarto orden, ejemplo 25.7: 3,751699', () => {
    const r = pvi({ metodo: 'rk4', f: '4e^(0,8x) - 0,5y', x0: '0', y0: '2', h: '0,5', xf: '0,5' });
    const p = r.pasos[0];
    expect([p.k1, p.k2, p.k3, p.k4].map((k) => redondo(k, 6))).toEqual([3, 3.510611, 3.446785, 4.105603]);
    expect(redondo(p.y1, 6)).toBe(3.751699);
  });

  it('punto medio: yᵢ₊₁/₂ y la pendiente del medio', () => {
    const r = pvi({ metodo: 'medio', f: ED, x0: '0', y0: '1', h: '0,5', xf: '0,5' });
    const p = r.pasos[0];
    expect(p.ym).toBe(1 + 8.5 * 0.25);
    expect(p.y1).toBe(1 + p.k2 * 0.5);
  });

  it('dice qué dato falla', () => {
    expect(pvi({ metodo: 'euler', f: ED, x0: '0', y0: '1', h: '0,3', xf: '1' }).error.campo).toBe('h');
    expect(pvi({ metodo: 'euler', f: ED, x0: '1', y0: '1', h: '0,5', xf: '0' }).error.campo).toBe('xf');
    expect(pvi({ metodo: 'euler', f: 'x + z', x0: '0', y0: '1', h: '0,5', xf: '1' }).error.campo).toBe('f');
  });
});
