import { describe, expect, it } from 'vitest';
import { cientifico, dec, fisico, leerNumero, porcentaje } from './decimales.js';
import { compilar, derivar, escribir, intentar, leer, simplificar } from './formula.js';

const valor = (texto, vars, ...v) => compilar(leer(texto, vars), vars)(...v);
const derivada = (texto, x = 'x', vars = [x]) => escribir(derivar(leer(texto, vars), x));

describe('fórmulas', () => {
  it('lee como se escribe en clase', () => {
    expect(valor('e^(-x) - x', ['x'], 0)).toBe(1);
    expect(valor('2xy^3', ['x', 'y'], 2, 1)).toBe(4);
    expect(valor('4e^(0,8x) - 0,5y', ['x', 'y'], 0, 2)).toBeCloseTo(3);
    expect(valor('-2x³ + 12x² − 20x + 8,5', ['x'], 0)).toBe(8.5);
    expect(valor('sen(x)/x', ['x'], 1)).toBeCloseTo(Math.sin(1));
    expect(valor('3(x + 1)', ['x'], 1)).toBe(6);
    expect(valor('x(x + 1)', ['x'], 2)).toBe(6);
    expect(valor('√(x)·π', ['x'], 4)).toBeCloseTo(2 * Math.PI);
    expect(valor('-x^2', ['x'], 3)).toBe(-9);
    expect(valor('(-8)^(1/3)', ['x'], 0)).toBeCloseTo(-2);
    expect(valor('667.38/x*(1 - e^(-0.146843x)) - 40', ['x'], 12)).toBeCloseTo(6.0669, 4); // The notes print 6,0699: see numerico.test.js.
  });

  it('dice qué está mal, en palabras', () => {
    expect(intentar('', ['x']).error).toBe('Falta la fórmula.');
    expect(intentar('sen x', ['x']).error).toMatch(/paréntesis/);
    expect(intentar('senx', ['x']).error).toMatch(/sen\(x\)/);
    expect(intentar('(x + 1', ['x']).error).toBe('Falta cerrar un paréntesis.');
    expect(intentar('x + 1)', ['x']).error).toBe('Sobra un paréntesis que cierra.');
    expect(intentar('2 * z', ['x']).error).toBe('No conozco «z». Acá la variable es x.');
    expect(intentar('x, 2', ['x']).error).toMatch(/coma/);
    expect(intentar('y = x', ['x']).error).toMatch(/=/);
  });

  it('fuera del dominio da NaN y no rompe', () => {
    expect(valor('ln(x)', ['x'], -1)).toBeNaN();
    expect(valor('1/x', ['x'], 0)).toBeNaN();
  });

  it('deriva por las reglas, como el apunte', () => {
    // Newton-Raphson, PPT de Métodos Abiertos, filmina 38: f'(x) = −e^(−x) − 1.
    expect(derivada('e^(-x) - x')).toBe('−e^(−x) − 1');
    // Filmina 40: f(x) = x¹⁰ − 1, f'(x) = 10x⁹.
    expect(derivada('x^10 - 1')).toBe('10x⁹');
    // «7A», p. 2: ∇f con f = x²y³.
    expect(derivada('x^2y^3', 'x', ['x', 'y'])).toBe('2xy³');
    expect(derivada('x^2y^3', 'y', ['x', 'y'])).toBe('3x²y²');
    // Campo del gradiente: P_y = Q_x.
    expect(derivada('2xy^3', 'y', ['x', 'y'])).toBe('6xy²');
    expect(derivada('3x^2y^2', 'x', ['x', 'y'])).toBe('6xy²');
    expect(derivada('-y', 'y', ['x', 'y'])).toBe('−1');
    expect(derivada('sen(x)')).toBe('cos(x)');
    expect(derivada('cos(2x)')).toBe('−2·sen(2x)');
    expect(derivada('ln(x)')).toBe('1/x');
    expect(derivada('e^(-x)')).toBe('−e^(−x)');
    expect(derivada('1/2cos(x)')).toBe('−0,5·sen(x)');
  });

  it('simplifica lo que se cancela', () => {
    const resta = (a, b) => escribir(simplificar({ t: '-', a: leer(a, ['x', 'y']), b: leer(b, ['x', 'y']) }));
    expect(resta('6xy^2', '6x*y^2')).toBe('0');
    expect(resta('2x + 3', 'x')).toBe('x + 3');
  });

  it('escribe con la notación del curso', () => {
    expect(escribir(leer('-2*x^3 + 12*x^2 - 20*x + 8.5'))).toBe('−2x³ + 12x² − 20x + 8,5');
    expect(escribir(leer('-y/(x^2 + y^2)', ['x', 'y']))).toBe('−y/(x² + y²)');
    expect(escribir(leer('x - (y - 1)', ['x', 'y']))).toBe('x − (y − 1)');
  });

  it('una fracción entre los factores se lleva el resto arriba, y el número de adelante se cancela', () => {
    const derivada = (texto, variables = ['x'], x = 'x') => escribir(derivar(leer(texto, variables), x));
    // The notes of Análisis Matemático II write it like this: −x/√(9 − x² − y²).
    expect(derivada('raiz(9 - x^2 - y^2)', ['x', 'y'])).toBe('−x/√(−x² − y² + 9)');
    expect(derivada('raiz(x^2 + y^2)', ['x', 'y'], 'y')).toBe('y/√(x² + y²)');
    expect(derivada('ln(x^2 + 1)')).toBe('2x/(x² + 1)');
    // A half stays a fraction, not 0,5.
    expect(derivada('raiz(x)')).toBe('1/(2·√(x))');
  });

  it('simplificada o no, cada derivada vale lo mismo que la cuenta hecha con números', () => {
    const casos = [
      ['raiz(9 - x^2 - y^2)', ['x', 'y']],
      ['x/(x^2 + 1)', ['x']],
      ['sen(x)/x', ['x']],
      ['x*raiz(x)', ['x']],
      ['arctg(y/x)', ['x', 'y']],
      ['x^2*ln(x)', ['x']],
      ['(x^2 + 1)/(x - 1)', ['x']],
      ['tg(x)', ['x']],
      ['e^(x^2 - y^2)', ['x', 'y']],
    ];
    const h = 1e-5;
    for (const [texto, variables] of casos) {
      const nodo = leer(texto, variables);
      const d1 = derivar(nodo, 'x');
      const d2 = derivar(d1, 'x');
      const en = variables.length === 2 ? [0.7, 1.3] : [0.7];
      const mas = [en[0] + h, ...en.slice(1)];
      const menos = [en[0] - h, ...en.slice(1)];
      const [f, g, k] = [nodo, d1, d2].map((q) => compilar(q, variables));
      expect(g(...en), texto).toBeCloseTo((f(...mas) - f(...menos)) / (2 * h), 5);
      expect(k(...en), texto).toBeCloseTo((g(...mas) - g(...menos)) / (2 * h), 5);
    }
  });
});

describe('números', () => {
  it('con coma, el menos de verdad y potencias de diez', () => {
    expect(dec(14.78016, 4)).toBe('14,7802');
    expect(dec(-2.26880, 4)).toBe('−2,2688');
    expect(dec(5, 4)).toBe('5');
    expect(dec(-0.00001, 4)).toBe('−1\u00a0×\u00a010⁻⁵');
    expect(cientifico(360000)).toBe('3,6\u00a0×\u00a010⁵');
    expect(cientifico(-1.6e-19, 2)).toBe('−1,6\u00a0×\u00a010⁻¹⁹');
    expect(fisico(0.019)).toBe('0,019');
    expect(fisico(216000)).toBe('2,16\u00a0×\u00a010⁵');
    expect(porcentaje(5.3)).toBe('5,3\u00a0%');
    expect(porcentaje(null)).toBe('');
  });

  it('lee lo que escribe el alumno', () => {
    expect(leerNumero('3,5', 'x₀')).toEqual({ v: 3.5 });
    expect(leerNumero('−2', 'x₀')).toEqual({ v: -2 });
    expect(leerNumero('6e-6', 'q')).toEqual({ v: 6e-6 });
    expect(leerNumero('pi/2', 'x₀').v).toBeCloseTo(Math.PI / 2);
    expect(leerNumero('', 'x₀')).toEqual({ error: 'Falta x₀.' });
    expect(leerNumero('dos', 'x₀')).toEqual({ error: 'x₀ no es un número.' });
  });
});
