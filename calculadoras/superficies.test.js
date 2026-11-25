import { describe, expect, it } from 'vitest';
import { leerTablero3d } from './graficadora3d.js';
import { curvaDeNivel, mallaDeFuncion, mallaImplicita, mallaParametrica, trazasDe } from './superficies.js';

const C = [-2, 2];

describe('mallas', () => {
  it('la gráfica de z = f(x, y) pasa por la función y deja sin dibujar lo que no existe', () => {
    const m = mallaDeFuncion((x, y) => Math.sqrt(1 - x * x - y * y), C, C, 40);
    expect(m.idx.length).toBeGreaterThan(0);
    expect(m.idx.length % 3).toBe(0);
    for (const q of m.idx) {
      const [x, y, z] = [m.pos[q * 3], m.pos[q * 3 + 1], m.pos[q * 3 + 2]];
      expect(z).toBeCloseTo(Math.sqrt(Math.max(0, 1 - x * x - y * y)), 2);
    }
    expect(m.lineas.length % 6).toBe(0);
  });

  it('donde la superficie termina, el borde llega hasta la orilla, sin dientes', () => {
    const m = mallaDeFuncion((x, y) => Math.sqrt(1 - x * x - y * y), C, C, 20);
    let lejos = 0;
    for (const q of m.idx) lejos = Math.max(lejos, Math.hypot(m.pos[q * 3], m.pos[q * 3 + 1]));
    expect(lejos).toBeGreaterThan(0.999);
    expect(lejos).toBeLessThanOrEqual(1.0001);
    // Around the rim, every direction reaches the edge: the nearest rim point is never a whole square short.
    for (let g = 0; g < 360; g += 5) {
      const [cx, cy] = [Math.cos((g * Math.PI) / 180), Math.sin((g * Math.PI) / 180)];
      let cerca = Infinity;
      for (const q of m.idx) cerca = Math.min(cerca, Math.hypot(m.pos[q * 3] - cx, m.pos[q * 3 + 1] - cy));
      expect(cerca).toBeLessThan(0.15);
    }
  });

  it('un salto no levanta una pared', () => {
    const escalon = (x) => (x < 0.01 ? 0 : 5);
    const con = mallaDeFuncion(escalon, C, C, 20, 4, 1);
    for (let i = 0; i < con.idx.length; i += 3) {
      const zs = [0, 1, 2].map((k) => con.pos[con.idx[i + k] * 3 + 2]);
      expect(Math.max(...zs) - Math.min(...zs)).toBeLessThanOrEqual(1);
    }
  });

  it('una superficie por sus parámetros: el cilindro de radio 2', () => {
    const m = mallaParametrica((u) => 2 * Math.cos(u), (u) => 2 * Math.sin(u), (u, v) => v, [0, 2 * Math.PI], [0, 3], 24);
    for (let q = 0; q < m.pos.length; q += 3) expect(Math.hypot(m.pos[q], m.pos[q + 1])).toBeCloseTo(2, 5);
  });

  it('la esfera de una ecuación queda en su radio, cerrada y mirando hacia afuera', () => {
    const m = mallaImplicita((x, y, z) => x * x + y * y + z * z - 2.25, C, C, C, 24);
    expect(m.idx.length).toBeGreaterThan(300);
    for (let q = 0; q < m.pos.length; q += 3) expect(Math.hypot(m.pos[q], m.pos[q + 1], m.pos[q + 2])).toBeCloseTo(1.5, 2);
    // Closed: every side belongs to two triangles.
    const lados = new Map();
    for (let i = 0; i < m.idx.length; i += 3) {
      for (let k = 0; k < 3; k += 1) {
        const [a, b] = [m.idx[i + k], m.idx[i + ((k + 1) % 3)]];
        const clave = a < b ? `${a}-${b}` : `${b}-${a}`;
        lados.set(clave, (lados.get(clave) ?? 0) + 1);
      }
    }
    expect([...lados.values()].every((v) => v === 2)).toBe(true);
    // Outwards: F grows away from the centre, so each normal points away from it.
    for (let i = 0; i < m.idx.length; i += 3) {
      const [a, b, c] = [0, 1, 2].map((k) => [0, 1, 2].map((e) => m.pos[m.idx[i + k] * 3 + e]));
      const u = b.map((v, e) => v - a[e]);
      const w = c.map((v, e) => v - a[e]);
      const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]];
      expect(n[0] * a[0] + n[1] * a[1] + n[2] * a[2]).toBeGreaterThanOrEqual(-1e-9);
    }
  });

  it('un polo no deja una pared', () => {
    // z = 1/x: the surface, without the plane x = 0 where the sign jumps.
    const m = mallaImplicita((x, y, z) => z - 1 / x, C, C, [-4, 4], 21);
    expect(m.idx.length).toBeGreaterThan(0);
    for (let q = 0; q < m.pos.length; q += 3) expect(m.pos[q + 2] * m.pos[q]).toBeCloseTo(1, 1);
  });

  it('las trazas de una esfera son circunferencias sobre ella', () => {
    const lineas = trazasDe((x, y, z) => x * x + y * y + z * z - 2.25, C, C, C, 3, 40);
    expect(lineas.length).toBeGreaterThan(0);
    for (const l of lineas) for (const [x, y, z] of l) expect(Math.hypot(x, y, z)).toBeCloseTo(1.5, 2);
  });

  it('el nivel 0 de la semiesfera es su borde, y un nivel que no alcanza no dibuja nada', () => {
    const semi = (x, y) => Math.sqrt(9 - x * x - y * y);
    const V = [-3.5, 3.5];
    const borde = curvaDeNivel(semi, V, V, 0);
    expect(borde.length).toBeGreaterThan(0);
    for (const l of borde) for (const [x, y] of l) expect(Math.hypot(x, y)).toBeCloseTo(3, 2);
    expect(borde.reduce((t, l) => t + l.length, 0)).toBeGreaterThan(200);
    // One whole line that closes on itself, not loose pieces.
    expect(borde).toHaveLength(1);
    expect(borde[0][0]).toEqual(borde[0][borde[0].length - 1]);
    expect(curvaDeNivel(semi, V, V, -0.05)).toEqual([]);
    expect(curvaDeNivel(semi, V, V, 3.2)).toEqual([]);
    for (const l of curvaDeNivel(semi, V, V, 2)) for (const [x, y] of l) expect(Math.hypot(x, y)).toBeCloseTo(Math.sqrt(5), 2);
    // A pole is not a level curve.
    for (const l of curvaDeNivel((x) => 1 / x, C, C, 1)) for (const [x] of l) expect(x).toBeCloseTo(1, 2);
  });

  it('la curva de nivel 1 de x² + y² es la circunferencia de radio 1', () => {
    const lineas = curvaDeNivel((x, y) => x * x + y * y, C, C, 1);
    expect(lineas).toHaveLength(1);
    for (const [x, y] of lineas[0]) expect(Math.hypot(x, y)).toBeCloseTo(1, 3);
  });
});

describe('el pizarrón de la graficadora 3D', () => {
  const base = { x0: '-2', x1: '2', y0: '-2', y1: '2', z0: '', z1: '', punto: '', niveles: '' };

  it('sin nada escrito, vacío', () => {
    expect(leerTablero3d({ ...base, trazos: [] })).toEqual({ vacio: true });
  });

  it('la silla, con su altura sola y sus derivadas parciales', () => {
    const m = leerTablero3d({ ...base, trazos: [{ id: 1, tipo: 'superficie', f: 'x^2 - y^2' }] });
    expect(m.error).toBeUndefined();
    expect(m.alturaFija).toBe(false);
    expect(m.Z[0]).toBeLessThan(-3);
    expect(m.Z[1]).toBeGreaterThan(3);
    expect(m.f.nombre).toBe('f');
    expect(m.parciales.fx(3, 5)).toBeCloseTo(6);
    expect(m.parciales.fy(3, 5)).toBeCloseTo(-10);
  });

  it('el plano tangente de los apuntes: e^(x² − y²) en (1; −1) es z − 1 = 2(x − 1) + 2(y + 1)', () => {
    const m = leerTablero3d({ ...base, trazos: [{ id: 1, tipo: 'superficie', f: 'e^(x^2 - y^2)' }], punto: '(1; -1)' });
    expect(m.punto).toMatchObject({ x0: 1, y0: -1, z0: 1, fx: 2, fy: 2, c: 1 });
  });

  it('el ejemplo de extremos de los apuntes: x³ + y³ − 3xy + 2 tiene silla en (0; 0) y mínimo en (1; 1)', () => {
    const con = (punto) => leerTablero3d({ ...base, trazos: [{ id: 1, tipo: 'superficie', f: 'x^3 + y^3 - 3xy + 2' }], punto }).punto;
    expect(con('0; 0')).toMatchObject({ z0: 2, critico: { D: -9, tipo: 'silla' } });
    expect(con('1; 1')).toMatchObject({ z0: 1, critico: { fxx: 6, fyy: 6, fxy: -3, D: 27, tipo: 'min' } });
    expect(con('1; 0').critico).toBeUndefined();
  });

  it('los niveles, ordenados y sin repetir', () => {
    const m = leerTablero3d({ ...base, trazos: [{ id: 1, tipo: 'superficie', f: 'x^2 + y^2' }], niveles: '2; 1; 2' });
    expect(m.niveles).toEqual([1, 2]);
  });

  it('una ecuación sola arma una caja alrededor del origen', () => {
    const m = leerTablero3d({ ...base, trazos: [{ id: 1, tipo: 'ecuacion', e: 'x^2 + y^2 + z^2 = 1' }] });
    expect(m.Z).toEqual([-2, 2]);
    expect(m.trazos[0].F(1, 0, 0)).toBeCloseTo(0);
    expect(m.f).toBeNull();
  });

  it('curva, puntos y vector', () => {
    const m = leerTablero3d({
      ...base,
      trazos: [
        { id: 1, tipo: 'curva', x: '2cos(t)', y: '2sen(t)', z: 't', t0: '0', t1: '4pi' },
        { id: 2, tipo: 'puntos', p: '(0; 0; 1) (1; 2; 3)' },
        { id: 3, tipo: 'vector', de: '0; 0; 0', a: '1; 1; 1' },
      ],
    });
    expect(m.error).toBeUndefined();
    expect(m.trazos[0].T[1]).toBeCloseTo(4 * Math.PI);
    expect(m.trazos[1].puntos).toEqual([[0, 0, 1], [1, 2, 3]]);
    expect(m.trazos[2].a).toEqual([1, 1, 1]);
    expect(m.Z[1]).toBeGreaterThan(12);
  });

  it('cada error dice en qué campo', () => {
    const con = (cambio, trazos) => leerTablero3d({ ...base, ...cambio, trazos }).error?.campo;
    expect(con({}, [{ id: 1, tipo: 'superficie', f: 'x^2 +' }])).toBe('t0.f');
    expect(con({}, [{ id: 1, tipo: 'superficie', f: 'raiz(-1 - x^2 - y^2)' }])).toBe('t0.f');
    expect(con({}, [{ id: 1, tipo: 'ecuacion', e: 'x + y + z' }])).toBe('t0.e');
    expect(con({ x1: '-5' }, [{ id: 1, tipo: 'superficie', f: 'x' }])).toBe('x1');
    expect(con({ z0: '1' }, [{ id: 1, tipo: 'superficie', f: 'x' }])).toBe('z1');
    // What goes on f is hidden without a function: it must not hide the sheet too.
    expect(con({ punto: 'mal', niveles: 'mal' }, [{ id: 1, tipo: 'ecuacion', e: 'x = 1' }])).toBeUndefined();
    expect(con({ punto: '(0; 0)' }, [{ id: 1, tipo: 'superficie', f: 'ln(x)' }])).toBe('punto');
    expect(con({ niveles: 'a; b' }, [{ id: 1, tipo: 'superficie', f: 'x' }])).toBe('niveles');
    expect(con({}, [{ id: 1, tipo: 'curva', x: 't', y: 't', z: 't', t0: '3', t1: '1' }])).toBe('t0.t1');
    expect(con({}, [{ id: 1, tipo: 'vector', de: '0; 0; 0', a: '' }])).toBe('t0.a');
  });
});
