import { describe, expect, it } from 'vitest';
import { compilar, leer } from '../formulas/formula.js';
import { areaEntre, estudiar, lateral, quiebres, signos, tangente } from './estudio.js';
import { contorno, integral, tramosDe } from './trazado.js';

const f = (texto) => compilar(leer(texto), ['x']);
const de = (texto, X = [-5, 5]) => estudiar(leer(texto), X);
const cerca = (a, b, d = 4) => expect(a).toBeCloseTo(b, d);

describe('el trazado', () => {
  it('corta la curva en un polo y llega al borde del dominio', () => {
    const polo = tramosDe(f('1/(x - 2)'), -5, 5.1);
    expect(polo.length).toBe(2);
    const raiz = tramosDe(f('raiz(x)'), -4, 4);
    expect(raiz.length).toBe(1);
    cerca(raiz[0][0][0], 0, 6);
  });

  it('una ecuación da su curva, y un polo no dibuja nada', () => {
    const F = compilar(leer('x^2 + y^2 - 4', ['x', 'y']), ['x', 'y']);
    const s = contorno(F, [-3, 3], [-3, 3], 60, 60);
    // One closed line, all of it on the circle.
    expect(s.length).toBe(1);
    expect(s[0].length).toBeGreaterThan(40);
    expect(s[0][0]).toEqual(s[0][s[0].length - 1]);
    for (const [x, y] of s[0]) cerca(Math.hypot(x, y), 2, 3);
    const hip = compilar(leer('y - 1/x', ['x', 'y']), ['x', 'y']);
    // Never a vertical line at the pole x = 0.
    const ramas = contorno(hip, [-3.05, 3], [-3, 3], 61, 60);
    expect(ramas.length).toBe(2);
    for (const [x, y] of ramas.flat()) cerca(x * y, 1, 3);
  });

  it('integra por Simpson', () => {
    cerca(integral(f('e^x - x'), 0, 1), Math.E - 1.5, 6);
  });
});

describe('los quiebres y los signos', () => {
  it('a cada lado de un polo dice a dónde va', () => {
    const g = f('1/(x - 2)');
    expect(lateral(g, 2, -1)).toEqual({ tipo: 'inf', signo: -1 });
    expect(lateral(g, 2, 1)).toEqual({ tipo: 'inf', signo: 1 });
    expect(lateral(f('ln(x)'), 0, 1)).toEqual({ tipo: 'inf', signo: -1 });
    expect(lateral(f('ln(x)'), 0, -1).tipo).toBe('nada');
    expect(lateral(f('sen(x)/x'), 0, 1).tipo).toBe('fin');
    expect(lateral(f('e^(1/x)'), 0, 1)).toEqual({ tipo: 'inf', signo: 1 });
    expect(lateral(f('e^(1/x)'), 0, -1).tipo).toBe('fin');
  });

  it('encuentra el polo aunque no caiga en una muestra, y el hueco del dominio', () => {
    const q = quiebres(f('1/(x - pi)'), [-5, 5]);
    expect(q.puntos.length).toBe(1);
    cerca(q.puntos[0].x, Math.PI, 6);
    const r = quiebres(f('raiz(x^2 - 4)'), [-5, 5]);
    expect(r.huecos).toEqual([{ a: -2, b: 2 }]);
    expect(quiebres(f('1/x'), [-5, 5]).huecos).toEqual([{ a: 0, b: 0 }]);
  });

  it('los tramos de cada signo, con el cruce exacto', () => {
    const s = signos(f('x^2 - 2'), [-5, 5]);
    expect(s.tramos.map((t) => t.signo)).toEqual([1, -1, 1]);
    cerca(s.cambios[0].x, -Math.SQRT2, 6);
    expect(s.cambios.every((c) => c.cero)).toBe(true);
    // Touching the axis isn't a change of sign.
    expect(signos(f('x^2'), [-5, 5]).tramos).toEqual([{ a: -5, b: 5, signo: 1 }]);
  });
});

describe('el estudio completo', () => {
  it('x³ − 3x: ceros, impar, extremos e inflexión', () => {
    const e = de('x^3 - 3x');
    expect(e.ceros.length).toBe(3);
    cerca(e.ceros[0], -Math.sqrt(3));
    cerca(e.ceros[1], 0);
    expect(e.ordenada).toBe(0);
    expect(e.paridad.tipo).toBe('impar');
    expect(e.verticales).toEqual([]);
    expect(e.lejos).toEqual([]);
    expect(e.extremos.map((x) => [x.tipo, x.x, x.y])).toEqual([
      ['max', -1, 2],
      ['min', 1, -2],
    ]);
    expect(e.crecimiento.map((t) => t.signo)).toEqual([1, -1, 1]);
    expect(e.inflexiones).toEqual([{ x: 0, y: 0 }]);
    expect(e.huecos).toEqual([]);
  });

  it('la homográfica del apunte: una vertical y una horizontal', () => {
    const e = de('1/(x - 2) + 1', [-6, 10]);
    expect(e.verticales.map((v) => v.x)).toEqual([2]);
    expect(e.verticales[0].izq).toEqual({ tipo: 'inf', signo: -1 });
    expect(e.lejos).toEqual([
      { lado: 1, tipo: 'horizontal', b: 1 },
      { lado: -1, tipo: 'horizontal', b: 1 },
    ]);
    expect(e.ceros).toEqual([1]);
    expect(e.ordenada).toBe(0.5);
    expect(e.extremos).toEqual([]);
    expect(e.crecimiento.map((t) => [t.a, t.b, t.signo])).toEqual([
      [-6, 2, -1],
      [2, 10, -1],
    ]);
    expect(e.paridad.tipo).toBe('ninguna');
  });

  it('una oblicua, solo donde no hay horizontal', () => {
    const e = de('(x^2 + 1)/(x - 1)');
    expect(e.lejos).toEqual([
      { lado: 1, tipo: 'oblicua', m: 1, b: 1 },
      { lado: -1, tipo: 'oblicua', m: 1, b: 1 },
    ]);
    expect(e.verticales.map((v) => v.x)).toEqual([1]);
    cerca(e.extremos[0].x, 1 - Math.SQRT2);
    expect(e.extremos.map((x) => x.tipo)).toEqual(['max', 'min']);
    const g = de('e^(-x)');
    expect(g.lejos).toEqual([{ lado: 1, tipo: 'horizontal', b: 0 }]);
    expect(de('ln(x)').lejos).toEqual([]);
    expect(de('sen(x)').lejos).toEqual([]);
  });

  it('el dominio: ln, la raíz y la paridad con dominio no simétrico', () => {
    const e = de('ln(x)');
    expect(e.huecos).toEqual([{ a: -5, b: 0 }]);
    expect(e.verticales.map((v) => v.x)).toEqual([0]);
    expect(e.ordenada).toBe(null);
    expect(e.paridad.tipo).toBe('dominio');
    expect(e.ceros).toEqual([1]);
    const r = de('raiz(4 - x^2)');
    expect(r.huecos).toEqual([
      { a: -5, b: -2 },
      { a: 2, b: 5 },
    ]);
    expect(r.paridad.tipo).toBe('par');
    expect(r.ceros).toEqual([-2, 2]);
    expect(r.extremos.map((x) => [x.tipo, x.x, x.y])).toEqual([['max', 0, 2]]);
  });

  it('una punta es un extremo donde la derivada no existe, y un cero que solo toca el eje', () => {
    const e = de('abs(x)');
    expect(e.extremos).toEqual([{ x: 0, y: 0, tipo: 'min', derivada: 'no existe' }]);
    expect(e.paridad.tipo).toBe('par');
    expect(e.ceros).toEqual([0]);
    const p = de('x^2');
    expect(p.ceros).toEqual([0]);
    expect(p.extremos).toEqual([{ x: 0, y: 0, tipo: 'min', derivada: 'cero' }]);
    expect(p.concavidad).toEqual([{ a: -5, b: 5, signo: 1 }]);
    // A pole between two signs of f' is no extremum.
    expect(de('1/x^2').extremos).toEqual([]);
    expect(de('tg(x)').extremos).toEqual([]);
  });

  it('el ejemplo de concavidad del apunte: x⁴ − 4x³', () => {
    const e = de('x^4 - 4x^3', [-2, 5]);
    expect(e.inflexiones).toEqual([
      { x: 0, y: 0 },
      { x: 2, y: -16 },
    ]);
    expect(e.extremos).toEqual([{ x: 3, y: -27, tipo: 'min', derivada: 'cero' }]);
    expect(e.concavidad.map((t) => t.signo)).toEqual([1, -1, 1]);
  });

  it('una recta: sin extremos, y f″ es 0 en toda la ventana', () => {
    const e = de('2x + 1');
    expect(e.extremos).toEqual([]);
    expect(e.crecimiento).toEqual([{ a: -5, b: 5, signo: 1 }]);
    expect(e.concavidad).toEqual([{ a: -5, b: 5, signo: 0 }]);
    expect(e.inflexiones).toEqual([]);
    expect(e.lejos).toEqual([{ lado: 1, tipo: 'oblicua', m: 2, b: 1 }, { lado: -1, tipo: 'oblicua', m: 2, b: 1 }]);
  });
});

describe('la tangente y el área', () => {
  it('la tangente a x² en 2, como el ejemplo del apunte', () => {
    const e = de('x^2');
    expect(tangente(e.f, e.d1, 2)).toEqual({ x0: 2, y0: 4, m: 4, b: -4 });
    expect(tangente(f('abs(x)'), compilar(leer('x/abs(x)'), ['x']), 0).error).toMatch(/derivable/);
    expect(tangente(f('ln(x)'), f('1/x'), -1).error).toMatch(/definida/);
  });

  it('el área entre e^x y x de 0 a 1 da e − 1,5', () => {
    const a = areaEntre(f('e^x'), f('x'), 0, 1);
    cerca(a.total, Math.E - 1.5, 6);
    expect(a.cortes).toEqual([]);
    expect(a.tramos.map((t) => t.techo)).toEqual(['f']);
  });

  it('si se cruzan, parte la integral en cada cruce', () => {
    const a = areaEntre(f('x^3'), f('x'), -1, 1);
    expect(a.cortes).toEqual([0]);
    expect(a.tramos.map((t) => t.techo)).toEqual(['f', 'g']);
    cerca(a.total, 0.5, 6);
  });

  it('no inventa un área a través de una asíntota ni fuera del dominio', () => {
    expect(areaEntre(f('1/x^2'), () => 0, -1, 1).error).toMatch(/asíntota/);
    expect(areaEntre(f('ln(x)'), () => 0, -1, 1).error).toMatch(/definida/);
  });

  it('con una tangente vertical en el borde o un tramo largo sigue dando bien, y si no puede lo dice', () => {
    expect(areaEntre(f('raiz(x)'), f('x^2'), 0, 1).total).toBeCloseTo(1 / 3, 4);
    expect(areaEntre(Math.cbrt, () => 0, 0, 8).total).toBeCloseTo(12, 4);
    expect(areaEntre(f('e^(-x)'), () => 0, 0, 1000).total).toBeCloseTo(1, 4);
    expect(areaEntre(f('sen(x)'), () => 0, 0, 1000000).error).toMatch(/más corto/);
  });
});
