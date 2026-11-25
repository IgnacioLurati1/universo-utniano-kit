import { describe, expect, it } from 'vitest';
import { enCaja, enTexto, leerTablero3d, nuevoTrazo, planos, terna } from './graficadora3d.js';

const base = { x0: '-2', x1: '2', y0: '-2', y1: '2', z0: '', z1: '', punto: '', niveles: '' };
const T = (id, tipo, datos) => ({ id, ...nuevoTrazo(tipo), ...datos });
const con = (trazos, cambio = {}) => leerTablero3d({ ...base, ...cambio, trazos });
const silla = [T(1, 'superficie', { f: 'x^2 - y^2' })];

describe('el plano tangente, escrito', () => {
  it('va alrededor del punto y despejado', () => {
    expect(planos(con(silla, { punto: '1; -1' }).punto)).toEqual(['z = 2(x − 1) + 2(y + 1)', 'z = 2x + 2y']);
    expect(planos(con([T(1, 'superficie', { f: 'e^(x^2 - y^2)' })], { punto: '1; -1' }).punto)).toEqual(['z − 1 = 2(x − 1) + 2(y + 1)', 'z = 2x + 2y + 1']);
    expect(planos(con([T(1, 'superficie', { f: 'x^2 + y^2' })], { punto: '0; 0' }).punto)).toEqual(['z = 0', 'z = 0']);
  });

  it('P cuenta como dentro de la caja solo sobre su piso', () => {
    expect(enCaja(con(silla, { punto: '2; -2' }))).toBe(true);
    expect(enCaja(con(silla, { punto: '5; 5' }))).toBe(false);
    expect(enCaja(con(silla))).toBe(false);
    expect(terna([1, -2.5, 0])).toBe('(1; −2,5; 0)');
  });
});

describe('la graficadora 3D, en texto', () => {
  it('sin dibujo no dice nada', () => {
    expect(enTexto(null)).toBeNull();
    expect(enTexto(con([]))).toBeNull();
    expect(enTexto(con([T(1, 'superficie', { f: 'x^' })]))).toBeNull();
  });

  it('cuenta la función, la caja, el punto y los niveles, con las parciales y el plano', () => {
    const t = enTexto(con(silla, { punto: '1; -1', niveles: '1; 0' }));
    expect(t.titulo).toBe('Graficadora 3D');
    expect(t.datos).toEqual([
      ['Función', 'f(x, y) = x² − y²'],
      ['Caja', 'x de −2 a 2, y de −2 a 2, z de −4,35 a 4,35'],
      ['P', '(1; −1)'],
      ['Curvas de nivel', 'k = 0 y k = 1'],
    ]);
    expect(t.resultado).toEqual([
      ['∂f/∂x', '2x'],
      ['∂f/∂y', '−2y'],
      ['f(1; −1)', '0'],
      ['∇f(1; −1)', '(2; 2)'],
      ['Plano tangente en P', 'z = 2x + 2y'],
    ]);
    expect(t.notas).not.toContain('P queda fuera');
  });

  it('dice qué es un punto crítico y avisa si P queda fuera de la caja', () => {
    const minimo = enTexto(con([T(1, 'superficie', { f: 'x^2 + y^2' })], { punto: '0; 0' }));
    expect(minimo.resultado).toContainEqual(['P es un punto crítico', 'D = 4, mínimo local']);
    const enSilla = enTexto(con(silla, { punto: '0; 0' }));
    expect(enSilla.resultado).toContainEqual(['P es un punto crítico', 'D = −4, punto silla']);
    expect(enTexto(con(silla, { punto: '5; 5' })).notas).toContain('P queda fuera de la caja.');
  });

  it('sin una función cuenta cada cosa dibujada y no arma cuentas', () => {
    const t = enTexto(
      con([
        T(1, 'ecuacion', { e: 'x^2 + y^2 + z^2 = 9' }),
        T(2, 'curva', { x: 'cos(t)', y: 'sen(t)', z: 't/4' }),
        T(3, 'parametrica', { x: 'u', y: 'v', z: 'u*v' }),
        T(4, 'puntos', { p: '(1; 2; 3) (0; 0; 1)' }),
        T(5, 'vector', { de: '0; 0; 0', a: '1; 2; 3' }),
      ]),
    );
    expect(t.datos.slice(0, 5)).toEqual([
      ['Ecuación', 'x² + y² + z² = 9'],
      ['Curva', '(cos(t); sen(t); t/4), con t de 0 a 6,2832'],
      ['Superficie paramétrica', '(u; v; uv), con u de 0 a 6,2832 y v de 0 a 1'],
      ['Puntos', '(1; 2; 3) (0; 0; 1)'],
      ['Vector', 'de (0; 0; 0) a (1; 2; 3)'],
    ]);
    expect(t.datos[5][0]).toBe('Caja');
    expect(t.resultado).toEqual([]);
    expect(t.notas).toContain('escena en 3D');
  });
});
