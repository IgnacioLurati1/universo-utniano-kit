import { leerPunto } from './campo.js';
import { lista, n } from './decir.js';
import { leerNumero } from '../formulas/decimales.js';
import { compilar, derivar, escribir, intentar } from '../formulas/formula.js';
import { limpio } from './trazado.js';

// The 3D grapher of Análisis Matemático II: what's written on the board, read into what the scene draws. The graph of
// z = f(x, y), the surface of an equation in x, y and z (a quadric, a plane, a cylinder), a surface by its two
// parameters, a curve in space, points and a vector. They are the kinds of El Santo Resumen's :::grafico3d
// (widgets.mjs), plus the equation. The first function, f, gets its partial derivatives and, at a point, its gradient
// and tangent plane (parcial-1.md, «Derivadas parciales», «Diferenciabilidad y plano tangente» and «Gradiente y derivada
// direccional»), and its level curves («Curvas de nivel»).

export const MAX_TRAZOS = 5;
export const MAX_NIVELES = 8;
export const TIPOS = ['superficie', 'ecuacion', 'parametrica', 'curva', 'puntos', 'vector'];
const NOMBRES = ['f', 'g', 'h', 'p', 'q'];

export const nuevoTrazo = (tipo) =>
  ({
    superficie: { tipo, f: '' },
    ecuacion: { tipo, e: '' },
    parametrica: { tipo, x: '', y: '', z: '', u0: '0', u1: '2pi', v0: '0', v1: '1' },
    curva: { tipo, x: '', y: '', z: '', t0: '0', t1: '2pi' },
    puntos: { tipo, p: '' },
    vector: { tipo, de: '0; 0; 0', a: '' },
  })[tipo];

const fallo = (campo, texto) => ({ error: { campo, texto } });
const finito = Number.isFinite;
// A point is read with or without its parentheses.
const pelado = (t) => String(t ?? '').trim().replace(/^\(([^()]*)\)$/, '$1');

function formula(texto, variables, campo) {
  const r = intentar(texto, variables);
  return r.error ? fallo(campo, r.error) : { nodo: r.nodo };
}

function intervalo(desde, hasta, letra, campo, sufijo) {
  const a = leerNumero(desde, `el comienzo de ${letra}`);
  if (a.error) return fallo(`${campo}.${sufijo}0`, a.error);
  const b = leerNumero(hasta, `el final de ${letra}`);
  if (b.error) return fallo(`${campo}.${sufijo}1`, b.error);
  if (!(a.v < b.v)) return fallo(`${campo}.${sufijo}1`, `${letra} va de un valor a otro más grande.`);
  if (b.v - a.v > 1e4) return fallo(`${campo}.${sufijo}1`, `El recorrido de ${letra} es muy largo. Entra hasta 10 000.`);
  return [a.v, b.v];
}

/** «(0; 0; 1) (1; 2; 3)», or a single «1; 2; 3». */
function leerPuntos(texto, campo) {
  const t = String(texto ?? '').trim();
  if (!t) return fallo(campo, 'Falta un punto, como (1; 2; 3).');
  const grupos = [...t.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]);
  if (grupos.length && t.replace(/\([^()]*\)/g, '').replace(/[\s,]/g, '')) return fallo(campo, 'Cada punto va entre paréntesis, como (1; 2; 3) (0; 0; 1).');
  const partes = grupos.length ? grupos : [t];
  if (partes.length > 8) return fallo(campo, 'Entran hasta 8 puntos.');
  const puntos = [];
  for (const parte of partes) {
    const r = leerPunto(parte, 3, 'P');
    if (r.error) return fallo(campo, 'Cada punto lleva x, y, z, como (1; 2; 3).');
    puntos.push(r.v);
  }
  return { puntos };
}

function leerTrazo(t, i, X, Y) {
  const campo = `t${i}`;
  if (t.tipo === 'superficie') {
    const r = formula(t.f, ['x', 'y'], `${campo}.f`);
    if (r.error) return r;
    const fn = compilar(r.nodo, ['x', 'y']);
    let alguno = false;
    for (let a = 0; a <= 24 && !alguno; a += 1) {
      for (let b = 0; b <= 24 && !alguno; b += 1) alguno = finito(fn(X[0] + ((X[1] - X[0]) * a) / 24, Y[0] + ((Y[1] - Y[0]) * b) / 24));
    }
    if (!alguno) return fallo(`${campo}.f`, 'No da ningún número real en esta caja. Revisá la fórmula o la caja.');
    return { tipo: t.tipo, nodo: r.nodo, fn };
  }
  if (t.tipo === 'ecuacion') {
    if (!String(t.e ?? '').trim()) return fallo(`${campo}.e`, 'Falta la ecuación.');
    const lados = String(t.e).split('=');
    if (lados.length !== 2) return fallo(`${campo}.e`, 'La ecuación lleva un solo =, como x^2 + y^2 + z^2 = 9.');
    const izq = formula(lados[0], ['x', 'y', 'z'], `${campo}.e`);
    if (izq.error) return izq;
    const der = formula(lados[1], ['x', 'y', 'z'], `${campo}.e`);
    if (der.error) return der;
    const [a, b] = [compilar(izq.nodo, ['x', 'y', 'z']), compilar(der.nodo, ['x', 'y', 'z'])];
    return { tipo: t.tipo, izq: izq.nodo, der: der.nodo, F: (x, y, z) => a(x, y, z) - b(x, y, z) };
  }
  if (t.tipo === 'parametrica' || t.tipo === 'curva') {
    const variables = t.tipo === 'curva' ? ['t'] : ['u', 'v'];
    const nodos = {};
    for (const eje of ['x', 'y', 'z']) {
      const r = formula(t[eje], variables, `${campo}.${eje}`);
      if (r.error) return r;
      nodos[eje] = r.nodo;
    }
    const fns = ['x', 'y', 'z'].map((eje) => compilar(nodos[eje], variables));
    if (t.tipo === 'curva') {
      const T = intervalo(t.t0, t.t1, 't', campo, 't');
      if (T.error) return T;
      return { tipo: t.tipo, nodos, fns, T };
    }
    const U = intervalo(t.u0, t.u1, 'u', campo, 'u');
    if (U.error) return U;
    const V = intervalo(t.v0, t.v1, 'v', campo, 'v');
    if (V.error) return V;
    return { tipo: t.tipo, nodos, fns, U, V };
  }
  if (t.tipo === 'vector') {
    const de = leerPunto(pelado(t.de), 3, 'A');
    if (de.error) return fallo(`${campo}.de`, de.error);
    const a = leerPunto(pelado(t.a), 3, 'B');
    if (a.error) return fallo(`${campo}.a`, a.error);
    return { tipo: t.tipo, de: de.v, a: a.v };
  }
  const r = leerPuntos(t.p, `${campo}.p`);
  if (r.error) return r;
  return { tipo: 'puntos', puntos: r.puntos };
}

function rango(estado, eje, obligatorio) {
  const [ta, tb] = [String(estado[`${eje}0`] ?? '').trim(), String(estado[`${eje}1`] ?? '').trim()];
  if (!obligatorio && !ta && !tb) return { v: null };
  if (!ta || !tb) return fallo(ta ? `${eje}1` : `${eje}0`, obligatorio ? `Faltan los dos valores de ${eje}.` : `Para fijar ${eje} van los dos valores. Vacíos, la altura se ajusta sola.`);
  const a = leerNumero(ta, `el comienzo de ${eje}`);
  if (a.error) return fallo(`${eje}0`, a.error);
  const b = leerNumero(tb, `el final de ${eje}`);
  if (b.error) return fallo(`${eje}1`, b.error);
  if (!(a.v < b.v)) return fallo(`${eje}1`, `La caja va de un ${eje} a otro más grande.`);
  if (b.v - a.v < 1e-6) return fallo(`${eje}1`, `La caja es muy chica en ${eje}. Lo mínimo es 0,000001.`);
  if (Math.abs(a.v) > 1e6 || Math.abs(b.v) > 1e6) return fallo(Math.abs(a.v) > 1e6 ? `${eje}0` : `${eje}1`, `La caja queda muy lejos en ${eje}. Va entre −1 000 000 y 1 000 000.`);
  return { v: [a.v, b.v] };
}

/** The height of the box when the student leaves it empty: what the surfaces, curves and points need, with 0 inside. */
function alturaSola(trazos, X, Y) {
  const zs = [];
  for (const t of trazos) {
    if (t.tipo === 'superficie') {
      for (let a = 0; a <= 24; a += 1) for (let b = 0; b <= 24; b += 1) zs.push(t.fn(X[0] + ((X[1] - X[0]) * a) / 24, Y[0] + ((Y[1] - Y[0]) * b) / 24));
    } else if (t.tipo === 'parametrica') {
      for (let a = 0; a <= 24; a += 1) for (let b = 0; b <= 24; b += 1) zs.push(t.fns[2](t.U[0] + ((t.U[1] - t.U[0]) * a) / 24, t.V[0] + ((t.V[1] - t.V[0]) * b) / 24));
    } else if (t.tipo === 'curva') {
      for (let a = 0; a <= 80; a += 1) zs.push(t.fns[2](t.T[0] + ((t.T[1] - t.T[0]) * a) / 80));
    } else if (t.tipo === 'puntos') t.puntos.forEach((p) => zs.push(p[2]));
    else if (t.tipo === 'vector') zs.push(t.de[2], t.a[2]);
  }
  const v = zs.filter(finito).sort((p, q) => p - q);
  if (!v.length) {
    // Only equations: as tall as the window is wide, around 0.
    const m = Math.max(X[1] - X[0], Y[1] - Y[0]) / 2;
    return [-m, m];
  }
  let a = v[Math.floor(v.length * 0.02)];
  let b = v[Math.min(v.length - 1, Math.floor(v.length * 0.98))];
  if (b - a < 1e-9) {
    a -= 1;
    b += 1;
  }
  const m = (b - a) * 0.08;
  return [Math.min(a - m, 0), Math.max(b + m, 0)].map((z) => limpio(z, 3));
}

/**
 * The board, read. Gives { vacio }, { error: { campo, texto } }, or what the scene draws: the box X, Y, Z, the things
 * and, for the first function, its partial derivatives, what happens at the point and its level curves.
 */
export function leerTablero3d(estado) {
  const x = rango(estado, 'x', true);
  if (x.error) return x;
  const y = rango(estado, 'y', true);
  if (y.error) return y;
  const z = rango(estado, 'z', false);
  if (z.error) return z;
  const [X, Y] = [x.v, y.v];

  const crudos = (estado.trazos ?? []).slice(0, MAX_TRAZOS);
  if (!crudos.length) return { vacio: true };
  const trazos = [];
  let cuantas = 0;
  for (const [i, t] of crudos.entries()) {
    const r = leerTrazo(t, i, X, Y);
    if (r.error) return r;
    if (r.tipo === 'superficie') {
      r.nombre = NOMBRES[cuantas];
      cuantas += 1;
    }
    trazos.push({ ...r, id: t.id, serie: i });
  }
  const Z = z.v ?? alturaSola(trazos, X, Y);
  const modelo = { X, Y, Z, alturaFija: Boolean(z.v), trazos, f: trazos.find((t) => t.tipo === 'superficie') ?? null };

  const tp = String(estado.punto ?? '').trim();
  const tn = String(estado.niveles ?? '').trim();
  // Without a function the board hides what goes on f: whatever was left written there waits for the next one.
  if (!modelo.f) return modelo;
  const { nodo, fn } = modelo.f;
  const nodoX = derivar(nodo, 'x');
  const nodoY = derivar(nodo, 'y');
  modelo.parciales = { nodoX, nodoY, fx: compilar(nodoX, ['x', 'y']), fy: compilar(nodoY, ['x', 'y']) };
  if (tp) {
    const p = leerPunto(pelado(tp), 2, 'P');
    if (p.error) return fallo('punto', p.error);
    const [x0, y0] = p.v;
    const z0 = fn(x0, y0);
    if (!finito(z0)) return fallo('punto', 'f no está definida en ese punto.');
    const [a, b] = [modelo.parciales.fx(x0, y0), modelo.parciales.fy(x0, y0)];
    if (!finito(a) || !finito(b)) return fallo('punto', 'f no tiene derivadas parciales en ese punto.');
    // z − z0 = a(x − x0) + b(y − y0), which is z = ax + by + c.
    modelo.punto = { x0, y0, z0: limpio(z0), fx: limpio(a), fy: limpio(b), c: limpio(z0 - a * x0 - b * y0) };
    // A critical point: the test of the second derivatives says what it is («Extremos»).
    if (Math.abs(a) < 1e-9 && Math.abs(b) < 1e-9) {
      const nodos = { xx: derivar(nodoX, 'x'), xy: derivar(nodoX, 'y'), yy: derivar(nodoY, 'y') };
      const [fxx, fxy, fyy] = ['xx', 'xy', 'yy'].map((k) => limpio(compilar(nodos[k], ['x', 'y'])(x0, y0)));
      if ([fxx, fxy, fyy].every(finito)) {
        const D = limpio(fxx * fyy - fxy * fxy);
        modelo.punto.critico = { nodos, fxx, fxy, fyy, D, tipo: D < 0 ? 'silla' : D === 0 ? 'nada' : fxx > 0 ? 'min' : 'max' };
      }
    }
  }
  if (tn) {
    const partes = tn.split(';');
    if (partes.length > MAX_NIVELES) return fallo('niveles', `Entran hasta ${MAX_NIVELES} niveles.`);
    const ks = [];
    for (const parte of partes) {
      const r = leerNumero(parte, 'cada nivel');
      if (r.error) return fallo('niveles', 'Los niveles son números separados por punto y coma, como 0; 1; 2.');
      if (!ks.includes(r.v)) ks.push(r.v);
    }
    modelo.niveles = ks.sort((p, q) => p - q);
  }
  return modelo;
}

// ---------- In words ----------
export const terna = (p) => `(${p.map(n).join('; ')})`;
/** Whether P stands over the floor of the box: outside, the scene and the map leave it out. */
export const enCaja = (m) => Boolean(m.punto) && m.punto.x0 >= m.X[0] && m.punto.x0 <= m.X[1] && m.punto.y0 >= m.Y[0] && m.punto.y0 <= m.Y[1];

/** «2(x − 1)», «−(y + 1)», «x»: a coefficient times a variable moved to the point. */
function movido(coef, letra, v) {
  const adentro = v === 0 ? letra : `(${letra} ${v < 0 ? '+' : '−'} ${n(Math.abs(v))})`;
  if (coef === 1) return adentro;
  return `${n(coef)}${v === 0 ? letra : adentro}`;
}

/** «a + b − c» out of signed terms: [[2, '2x'], [−1, 'y']]. */
function suma(terminos) {
  const vivos = terminos.filter(([signo]) => signo !== 0);
  if (!vivos.length) return '0';
  return vivos.map(([signo, texto], i) => (i ? `${signo < 0 ? '−' : '+'} ${texto}` : `${signo < 0 ? '−' : ''}${texto}`)).join(' ');
}

/** The tangent plane twice: as the notes write it, around the point, and solved for z. */
export function planos({ x0, y0, z0, fx, fy, c }) {
  const izquierda = z0 === 0 ? 'z' : `z ${z0 < 0 ? '+' : '−'} ${n(Math.abs(z0))}`;
  const alrededor = suma([
    [Math.sign(fx), movido(Math.abs(fx), 'x', x0)],
    [Math.sign(fy), movido(Math.abs(fy), 'y', y0)],
  ]);
  const termino = (v, letra) => [Math.sign(v), `${Math.abs(v) === 1 ? '' : n(Math.abs(v))}${letra}`];
  const despejado = suma([termino(fx, 'x'), termino(fy, 'y'), [Math.sign(c), n(Math.abs(c))]]);
  return [`${izquierda} = ${alrededor}`, `z = ${despejado}`];
}

const QUE = { superficie: 'Función', ecuacion: 'Ecuación', parametrica: 'Superficie paramétrica', curva: 'Curva', puntos: 'Puntos', vector: 'Vector' };
const CRITICO = { silla: 'punto silla', min: 'mínimo local', max: 'máximo local', nada: 'la prueba de las derivadas segundas no decide' };
const entre = ([a, b]) => `de ${n(a)} a ${n(b)}`;

function nombreDe(t) {
  if (t.tipo === 'superficie') return `${t.nombre}(x, y) = ${escribir(t.nodo)}`;
  if (t.tipo === 'ecuacion') return `${escribir(t.izq)} = ${escribir(t.der)}`;
  if (t.tipo === 'vector') return `de ${terna(t.de)} a ${terna(t.a)}`;
  if (t.tipo === 'puntos') return t.puntos.map(terna).join(' ');
  const componentes = `(${['x', 'y', 'z'].map((eje) => escribir(t.nodos[eje])).join('; ')})`;
  return t.tipo === 'curva' ? `${componentes}, con t ${entre(t.T)}` : `${componentes}, con u ${entre(t.U)} y v ${entre(t.V)}`;
}

/**
 * What the scene and the sheet show, in plain text, for whoever can't look at the drawing (an assistant beside the
 * calculator): { titulo, datos, resultado, notas }, with datos and resultado as lists of [label, value]. Null
 * without a drawing.
 */
export function enTexto(m) {
  if (!m || m.error || m.vacio) return null;
  const datos = m.trazos.map((t) => [QUE[t.tipo], nombreDe(t)]);
  datos.push(['Caja', `x ${entre(m.X)}, y ${entre(m.Y)}, z ${entre(m.Z)}`]);
  const resultado = [];
  const notas = ['El gráfico es una escena en 3D que se gira. Lo que queda fuera de la caja no se dibuja.'];
  if (m.f) {
    const f = m.f.nombre;
    resultado.push([`∂${f}/∂x`, escribir(m.parciales.nodoX)], [`∂${f}/∂y`, escribir(m.parciales.nodoY)]);
    const p = m.punto;
    if (p) {
      const P = `(${n(p.x0)}; ${n(p.y0)})`;
      datos.push(['P', P]);
      resultado.push([`${f}${P}`, n(p.z0)], [`∇${f}${P}`, `(${n(p.fx)}; ${n(p.fy)})`], ['Plano tangente en P', planos(p)[1]]);
      if (p.critico) resultado.push(['P es un punto crítico', `D = ${n(p.critico.D)}, ${CRITICO[p.critico.tipo]}`]);
      if (!enCaja(m)) notas.push('P queda fuera de la caja.');
    }
    if (m.niveles) datos.push(['Curvas de nivel', lista(m.niveles.map((k) => `k = ${n(k)}`))]);
  }
  return { titulo: 'Graficadora 3D', datos, resultado, notas: notas.join(' ') };
}
