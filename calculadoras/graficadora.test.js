import { describe, expect, it } from 'vitest';
import { acercar, cabe, enTexto, leerTablero, MAX_TRAZOS, mover, nuevoTrazo, paraCampo, TIPOS } from './graficadora.js';

const base = { x0: '-5', x1: '5', y0: '', y1: '', tangente: '', areaA: '', areaB: '' };
const T = (id, tipo, datos) => ({ id, ...nuevoTrazo(tipo), ...datos });
const con = (trazos, cambio = {}) => leerTablero({ ...base, ...cambio, trazos });

describe('el pizarrón de la graficadora', () => {
  it('sin nada escrito, vacío', () => {
    expect(con([])).toEqual({ vacio: true });
  });

  it('cada clase de cosa tiene su renglón nuevo', () => {
    for (const tipo of TIPOS) expect(nuevoTrazo(tipo).tipo).toBe(tipo);
  });

  it('las funciones se llaman f, g, h en el orden en que están', () => {
    const m = con([T(1, 'funcion', { f: 'x^2' }), T(2, 'ecuacion', { e: 'x^2 + y^2 = 9' }), T(3, 'funcion', { f: 'x^3' })]);
    expect(m.error).toBeUndefined();
    expect(m.trazos.map((t) => t.nombre ?? null)).toEqual(['f', null, 'g']);
    expect(m.f.fn(3)).toBe(9);
    expect(m.g.fn(2)).toBe(8);
    expect(m.trazos[1].F(3, 0)).toBeCloseTo(0);
    expect(m.estudio).toBeDefined();
  });

  it('sin altura escrita, la ventana se ajusta sola y con ella escrita queda fija', () => {
    const sola = con([T(1, 'funcion', { f: 'x^2' })]);
    expect(sola.alturaFija).toBe(false);
    expect(sola.Y[0]).toBeLessThanOrEqual(0);
    expect(sola.Y[1]).toBeGreaterThan(5);
    const fija = con([T(1, 'funcion', { f: 'x^2' })], { y0: '-1', y1: '3' });
    expect(fija.alturaFija).toBe(true);
    expect(fija.Y).toEqual([-1, 3]);
  });

  it('la tangente a x² en 2 es y = 4x − 4', () => {
    const m = con([T(1, 'funcion', { f: 'x^2' })], { tangente: '2' });
    expect(m.tangente).toMatchObject({ x0: 2, y0: 4, m: 4, b: -4 });
  });

  it('el área entre e^x y x de 0 a 1 es e − 1,5', () => {
    const m = con([T(1, 'funcion', { f: 'e^x' }), T(2, 'funcion', { f: 'x' })], { areaA: '0', areaB: '1' });
    expect(m.area.total).toBeCloseTo(Math.E - 1.5, 4);
  });

  it('una paramétrica, una polar y una figura de puntos', () => {
    const m = con([
      T(1, 'parametrica', { x: '3cos(t)', y: '2sen(t)' }),
      T(2, 'polar', { r: '1 + cos(t)' }),
      T(3, 'puntos', { p: '(0; 0) (3; 0) (0; 4)', unir: true }),
    ]);
    expect(m.error).toBeUndefined();
    expect(m.trazos[0].fx(0)).toBeCloseTo(3);
    expect(m.trazos[1].fx(0)).toBeCloseTo(2);
    expect(m.trazos[2].puntos).toEqual([[0, 0], [3, 0], [0, 4]]);
    expect(m.trazos[2].unir).toBe(true);
    expect(m.estudio).toBeUndefined();
  });

  it('cada error dice en qué campo', () => {
    const campo = (trazos, cambio) => con(trazos, cambio).error?.campo;
    expect(campo([T(1, 'funcion', { f: '1/(x - ' })])).toBe('t0.f');
    expect(campo([T(1, 'funcion', { f: 'x' }), T(2, 'ecuacion', { e: 'x + y' })])).toBe('t1.e');
    expect(campo([T(1, 'parametrica', { x: 't', y: '' })])).toBe('t0.y');
    expect(campo([T(1, 'parametrica', { x: 't', y: 't', t0: '2', t1: '1' })])).toBe('t0.t1');
    expect(campo([T(1, 'puntos', { p: '(1; 2' })])).toBe('t0.p');
    expect(campo([T(1, 'funcion', { f: 'x' })], { x1: '-9' })).toBe('x1');
    expect(campo([T(1, 'funcion', { f: 'x' })], { y0: '1' })).toBe('y1');
    expect(campo([T(1, 'funcion', { f: 'x' })], { tangente: 'a' })).toBe('tangente');
    expect(campo([T(1, 'funcion', { f: 'x' })], { areaA: '0' })).toBe('areaB');
    expect(campo([T(1, 'funcion', { f: 'ln(x)' })], { tangente: '-1' })).toBe('tangente');
    // What goes on f is hidden without a function: it must not hide the sheet too.
    expect(campo([T(1, 'ecuacion', { e: 'x = 1' })], { tangente: 'mal', areaA: '0' })).toBeUndefined();
  });

  it('una ventana muy chica o muy lejos dice cuál de las dos cosas le pasa, y en qué campo', () => {
    const f = [T(1, 'funcion', { f: 'x' })];
    expect(con(f, { x0: '0', x1: '0,0000001' }).error).toMatchObject({ campo: 'x1', texto: expect.stringContaining('muy chica') });
    expect(con(f, { x0: '-2000000', x1: '5' }).error).toMatchObject({ campo: 'x0', texto: expect.stringContaining('muy lejos') });
    expect(con(f, { y0: '0', y1: '3000000' }).error).toMatchObject({ campo: 'y1', texto: expect.stringContaining('muy lejos') });
    expect(con([T(1, 'parametrica', { x: 'cos(t)', y: 'sen(t)', t0: '0', t1: '20000' })]).error).toMatchObject({ campo: 't0.t1', texto: expect.stringContaining('muy largo') });
  });

  it('no pasa del tope de cosas', () => {
    const muchos = Array.from({ length: MAX_TRAZOS + 3 }, (_, i) => T(i + 1, 'funcion', { f: `x + ${i}` }));
    expect(con(muchos).trazos).toHaveLength(MAX_TRAZOS);
  });
});

describe('la ventana', () => {
  it('se mueve y se acerca alrededor de su centro', () => {
    expect(mover([[0, 10], [0, 4]], 2, -1)).toEqual([[2, 12], [-1, 3]]);
    expect(acercar([0, 10], 0.5)).toEqual([2.5, 7.5]);
    expect(acercar([-4, 4], 2)).toEqual([-8, 8]);
  });

  it('los botones y el arrastre paran donde la ventana ya no se puede dibujar', () => {
    expect(cabe([-5, 5])).toBe(true);
    expect(cabe(acercar([-900000, 900000], 1.25))).toBe(false);
    expect(cabe(acercar([0, 0.000001], 0.8))).toBe(false);
    expect(cabe(mover([[999999, 1000000], [0, 1]], 5, 0)[0])).toBe(false);
  });

  it('escribe los bordes con las cifras que la ventana pide', () => {
    expect(paraCampo(1.23456, 10)).toBe('1,23');
    expect(paraCampo(-0.5, 2)).toBe('-0,5');
    expect(paraCampo(1234.5678, 2000)).toBe('1235');
  });
});

describe('la graficadora, en texto', () => {
  it('sin dibujo no dice nada', () => {
    expect(enTexto(null)).toBeNull();
    expect(enTexto(con([]))).toBeNull();
    expect(enTexto(con([T(1, 'funcion', { f: 'x^' })]))).toBeNull();
  });

  it('cuenta lo dibujado, la ventana y el estudio de f', () => {
    const t = enTexto(con([T(1, 'funcion', { f: 'x^2' }), T(2, 'ecuacion', { e: 'x^2 + y^2 = 9' })], { x0: '-3', x1: '5', tangente: '2' }));
    expect(t.titulo).toBe('Graficadora');
    expect(t.datos).toEqual([
      ['Función', 'f(x) = x²'],
      ['Ecuación', 'x² + y² = 9'],
      ['Ventana', 'x de −3 a 5, y de −4 a 4'],
    ]);
    expect(Object.fromEntries(t.resultado)).toMatchObject({
      "f'(x)": '2x',
      "f''(x)": '2',
      Dominio: 'todo x de la ventana',
      'Corte con el eje y': '(0; 0)',
      'Cortes con el eje x': 'x = 0',
      Paridad: 'par',
      Asíntotas: 'No aparecen asíntotas.',
      'Crece en': '(0; 5)',
      'Decrece en': '(−3; 0)',
      'Extremos relativos': 'mínimo en (0; 0)',
      'Cóncava hacia arriba en': '(−3; 5)',
      'Puntos de inflexión': 'ninguno en la ventana',
      'Recta tangente en x₀ = 2': 'y = 4x − 4',
    });
    expect(t.resultado.every(([etiqueta, valor]) => typeof etiqueta === 'string' && typeof valor === 'string' && valor)).toBe(true);
    expect(t.notas).toContain('≈');
  });

  it('dice las asíntotas, el hueco del dominio y el área entre dos funciones', () => {
    const r = Object.fromEntries(enTexto(con([T(1, 'funcion', { f: '(2x+1)/(x-1)' })])).resultado);
    expect(r.Dominio).toBe('f no da un número real en x = 1');
    expect(r['Asíntotas']).toBe('Vertical en x = 1. Por izquierda f tiende a −∞ y por derecha tiende a +∞. Horizontal en y = 2, hacia los dos lados.');
    expect(r['Decrece en']).toBe('(−5; 1) y (1; 5)');
    expect(r['Crece en']).toBeUndefined();
    const area = enTexto(con([T(1, 'funcion', { f: 'e^x' }), T(2, 'funcion', { f: 'x' })], { areaA: '0', areaB: '1' }));
    expect(area.datos.slice(0, 2)).toEqual([
      ['Función', 'f(x) = e^(x)'],
      ['Función', 'g(x) = x'],
    ]);
    expect(Object.fromEntries(area.resultado)['Área entre f y g, de 0 a 1']).toBe('≈ 1,2183');
  });

  it('sin una función cuenta las figuras y no arma estudio', () => {
    const t = enTexto(con([T(1, 'parametrica', { x: 'cos(t)', y: 'sen(t)' }), T(2, 'polar', { r: '1 + cos(t)' }), T(3, 'puntos', { p: '(0; 0) (3; 0) (0; 4)', unir: true })]));
    expect(t.datos.slice(0, 3)).toEqual([
      ['Curva paramétrica', 'x = cos(t), y = sen(t), con t de 0 a 6,2832'],
      ['Curva polar', 'r = 1 + cos(t), con t de 0 a 6,2832'],
      ['Puntos', '(0; 0) (3; 0) (0; 4), unidos en una figura'],
    ]);
    expect(t.resultado).toEqual([]);
    expect(t.notas).toBe('');
  });
});
