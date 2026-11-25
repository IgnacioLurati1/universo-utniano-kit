import { leerPunto } from './campo.js';
import { igualA, lista, n } from './decir.js';
import { leerNumero } from '../formulas/decimales.js';
import { areaEntre, estudiar, tangente } from './estudio.js';
import { compilar, escribir, intentar } from '../formulas/formula.js';
import { tramosDeCurva } from './trazado.js';

// The 2D grapher of Análisis Matemático I: what's written on the board, read into what the sheet draws. A function
// y = f(x), the curve of an equation in x and y (a circle, a fólium), a curve by its parameter or in polar coordinates,
// and loose points or a figure joined by its points. They are the kinds of El Santo Resumen's:::grafico (widgets.mjs),
// plus the equation. The first function, f, gets its study (estudio.js), and may get its tangent and an area.

export const MAX_TRAZOS = 6;
export const MAX_PUNTOS = 12;
export const TIPOS = ['funcion', 'ecuacion', 'parametrica', 'polar', 'puntos'];
const NOMBRES = ['f', 'g', 'h', 'p', 'q', 's'];

export const nuevoTrazo = (tipo) =>
  ({
    funcion: { tipo, f: '' },
    ecuacion: { tipo, e: '' },
    parametrica: { tipo, x: '', y: '', t0: '0', t1: '2pi' },
    polar: { tipo, r: '', t0: '0', t1: '2pi' },
    puntos: { tipo, p: '', unir: false },
  })[tipo];

const fallo = (campo, texto) => ({ error: { campo, texto } });
const finito = Number.isFinite;

// What a side of the window can be: no narrower than this and no further than that.
const MINIMO = 1e-6;
const LEJOS = 1e6;
/** Whether a side of the window, [from, to], can be drawn. The buttons and the drag stop where it can't. */
export const cabe = ([a, b]) => b - a >= MINIMO && Math.abs(a) <= LEJOS && Math.abs(b) <= LEJOS;
/** What is wrong with a side that can't be drawn: { campo, texto }. `que`: «La ventana», «La altura». */
function noCabe([a, b], que, campos) {
  if (b - a < MINIMO) return fallo(campos[1], `${que} es muy chica. Lo mínimo es 0,000001.`);
  return fallo(campos[Math.abs(a) > LEJOS ? 0 : 1], `${que} queda muy lejos. Va entre −1 000 000 y 1 000 000.`);
}

function formula(texto, variables, campo) {
  const r = intentar(texto, variables);
  return r.error ? fallo(campo, r.error) : { nodo: r.nodo };
}

function intervalo(t0, t1, campo) {
  const a = leerNumero(t0, 'el comienzo de t');
  if (a.error) return fallo(`${campo}.t0`, a.error);
  const b = leerNumero(t1, 'el final de t');
  if (b.error) return fallo(`${campo}.t1`, b.error);
  if (!(a.v < b.v)) return fallo(`${campo}.t1`, 't va de un valor a otro más grande.');
  if (b.v - a.v > 1e4) return fallo(`${campo}.t1`, 'El recorrido de t es muy largo. Entra hasta 10 000.');
  return { t0: a.v, t1: b.v };
}

/** «(0; 0) (3; 0) (0; 4)», or a single «1; 2». */
function leerPuntos(texto, campo) {
  const t = String(texto ?? '').trim();
  if (!t) return fallo(campo, 'Falta un punto, como (1; 2).');
  const grupos = [...t.matchAll(/\(([^()]*)\)/g)].map((m) => m[1]);
  if (grupos.length && t.replace(/\([^()]*\)/g, '').replace(/[\s,]/g, '')) return fallo(campo, 'Cada punto va entre paréntesis, como (1; 2) (3; 0).');
  const partes = grupos.length ? grupos : [t];
  if (partes.length > MAX_PUNTOS) return fallo(campo, `Entran hasta ${MAX_PUNTOS} puntos.`);
  const puntos = [];
  for (const [i, parte] of partes.entries()) {
    const r = leerPunto(parte, 2, partes.length > 1 ? `el punto ${i + 1}` : 'el punto');
    if (r.error) return fallo(campo, r.error);
    puntos.push(r.v);
  }
  return { puntos };
}

function leerTrazo(t, i, X) {
  const campo = `t${i}`;
  if (t.tipo === 'funcion') {
    const r = formula(t.f, ['x'], `${campo}.f`);
    if (r.error) return r;
    const fn = compilar(r.nodo, ['x']);
    let alguno = false;
    for (let k = 0; k <= 400 && !alguno; k += 1) alguno = finito(fn(X[0] + ((X[1] - X[0]) * k) / 400));
    if (!alguno) return fallo(`${campo}.f`, 'No da ningún número real en esta ventana. Revisá la fórmula o la ventana.');
    return { tipo: t.tipo, nodo: r.nodo, fn };
  }
  if (t.tipo === 'ecuacion') {
    const lados = String(t.e ?? '').split('=');
    if (!String(t.e ?? '').trim()) return fallo(`${campo}.e`, 'Falta la ecuación.');
    if (lados.length !== 2) return fallo(`${campo}.e`, 'La ecuación lleva un solo =, como x^2 + y^2 = 9.');
    const izq = formula(lados[0], ['x', 'y'], `${campo}.e`);
    if (izq.error) return izq;
    const der = formula(lados[1], ['x', 'y'], `${campo}.e`);
    if (der.error) return der;
    const [a, b] = [compilar(izq.nodo, ['x', 'y']), compilar(der.nodo, ['x', 'y'])];
    return { tipo: t.tipo, izq: izq.nodo, der: der.nodo, F: (x, y) => a(x, y) - b(x, y) };
  }
  if (t.tipo === 'parametrica') {
    const x = formula(t.x, ['t'], `${campo}.x`);
    if (x.error) return x;
    const y = formula(t.y, ['t'], `${campo}.y`);
    if (y.error) return y;
    const r = intervalo(t.t0, t.t1, campo);
    if (r.error) return r;
    return { tipo: t.tipo, nodoX: x.nodo, nodoY: y.nodo, fx: compilar(x.nodo, ['t']), fy: compilar(y.nodo, ['t']), ...r };
  }
  if (t.tipo === 'polar') {
    const r = formula(String(t.r ?? '').replace(/θ/g, 't'), ['t'], `${campo}.r`);
    if (r.error) return r;
    const lim = intervalo(t.t0, t.t1, campo);
    if (lim.error) return lim;
    const fr = compilar(r.nodo, ['t']);
    return { tipo: t.tipo, nodo: r.nodo, fx: (u) => fr(u) * Math.cos(u), fy: (u) => fr(u) * Math.sin(u), ...lim };
  }
  const r = leerPuntos(t.p, `${campo}.p`);
  if (r.error) return r;
  return { tipo: 'puntos', puntos: r.puntos, unir: Boolean(t.unir) && r.puntos.length > 1 };
}

/** The values of f over the window without what a pole throws far away: [low, high], with 0 inside. */
function alturaDe(funciones, X) {
  const v = [0];
  for (const fn of funciones) {
    for (let i = 0; i <= 240; i += 1) {
      const y = fn(X[0] + ((X[1] - X[0]) * i) / 240);
      if (finito(y) && Math.abs(y) < 1e9) v.push(y);
    }
  }
  v.sort((p, q) => p - q);
  const q = (p) => v[Math.min(v.length - 1, Math.max(0, Math.round(p * (v.length - 1))))];
  let [lo, hi] = v[v.length - 1] - v[0] > 40 * (q(0.95) - q(0.05)) + 1e-9 ? [Math.min(q(0.05), 0), Math.max(q(0.95), 0)] : [v[0], v[v.length - 1]];
  if (hi - lo < 1e-9) {
    lo -= 1;
    hi += 1;
  }
  const margen = (hi - lo) * 0.12;
  return [lo - margen, hi + margen];
}

/**
 * The board, read. Gives { vacio } with nothing to draw, { error: { campo, texto } } with the field that's wrong
 * (`t2.f`, `x0`, `tangente`…), or what the sheet draws: the window X and Y, `igual` (the same scale on both axes, so a
 * circle looks round), the things to draw and, for the first function, its study, tangent and area.
 */
export function leerTablero(estado) {
  const x0 = leerNumero(estado.x0, 'el comienzo de x');
  if (x0.error) return fallo('x0', x0.error);
  const x1 = leerNumero(estado.x1, 'el final de x');
  if (x1.error) return fallo('x1', x1.error);
  if (!(x0.v < x1.v)) return fallo('x1', 'La ventana va de un x a otro más grande.');
  if (!cabe([x0.v, x1.v])) return noCabe([x0.v, x1.v], 'La ventana', ['x0', 'x1']);
  const X = [x0.v, x1.v];

  let Y = null;
  const [ty0, ty1] = [String(estado.y0 ?? '').trim(), String(estado.y1 ?? '').trim()];
  if (ty0 || ty1) {
    if (!ty0 || !ty1) return fallo(ty0 ? 'y1' : 'y0', 'Para fijar la altura van los dos valores de y. Vacíos, se ajusta sola.');
    const y0 = leerNumero(ty0, 'el comienzo de y');
    if (y0.error) return fallo('y0', y0.error);
    const y1 = leerNumero(ty1, 'el final de y');
    if (y1.error) return fallo('y1', y1.error);
    if (!(y0.v < y1.v)) return fallo('y1', 'La altura va de un y a otro más grande.');
    if (!cabe([y0.v, y1.v])) return noCabe([y0.v, y1.v], 'La altura', ['y0', 'y1']);
    Y = [y0.v, y1.v];
  }

  const crudos = (estado.trazos ?? []).slice(0, MAX_TRAZOS);
  if (!crudos.length) return { vacio: true };
  const trazos = [];
  let cuantas = 0;
  for (const [i, t] of crudos.entries()) {
    const r = leerTrazo(t, i, X);
    if (r.error) return r;
    if (r.tipo === 'funcion') {
      r.nombre = NOMBRES[cuantas];
      cuantas += 1;
    }
    trazos.push({ ...r, id: t.id, serie: i });
  }

  const funciones = trazos.filter((t) => t.tipo === 'funcion');
  const figuras = trazos.filter((t) => t.tipo !== 'funcion');
  const igual = figuras.some((t) => t.tipo !== 'puntos' || t.unir);
  if (!Y) {
    if (igual) {
      // The same scale on both axes: as tall as wide, around what has a place of its own.
      const ys = [];
      for (const t of figuras) {
        if (t.tipo === 'puntos') t.puntos.forEach((p) => ys.push(p[1]));
        else if (t.fx) tramosDeCurva(t.fx, t.fy, t.t0, t.t1, 120).forEach((tr) => tr.forEach((p) => ys.push(p[1])));
      }
      const centro = ys.length ? (Math.min(...ys) + Math.max(...ys)) / 2 : 0;
      const mitad = (X[1] - X[0]) / 2;
      Y = [centro - mitad, centro + mitad];
    } else {
      Y = alturaDe(funciones.map((t) => t.fn), X);
      const ys = figuras.flatMap((t) => t.puntos.map((p) => p[1]));
      if (ys.length) {
        const m = (Y[1] - Y[0]) * 0.08;
        Y = [Math.min(Y[0], Math.min(...ys) - m), Math.max(Y[1], Math.max(...ys) + m)];
      }
    }
  }

  const modelo = { X, Y, alturaFija: Boolean(ty0), igual, trazos, f: funciones[0] ?? null, g: funciones[1] ?? null };
  const tx = String(estado.tangente ?? '').trim();
  const [ta, tb] = [String(estado.areaA ?? '').trim(), String(estado.areaB ?? '').trim()];
  // Without a function the board hides what goes on f: whatever was left written there waits for the next one.
  if (!modelo.f) return modelo;
  modelo.estudio = estudiar(modelo.f.nodo, X);
  if (tx) {
    const r = leerNumero(tx, 'x₀');
    if (r.error) return fallo('tangente', r.error);
    const t = tangente(modelo.estudio.f, modelo.estudio.d1, r.v);
    if (t.error) return fallo('tangente', t.error);
    modelo.tangente = t;
  }
  if (ta || tb) {
    if (!ta || !tb) return fallo(ta ? 'areaB' : 'areaA', 'El área va de a hasta b. Falta uno de los dos.');
    const a = leerNumero(ta, 'a');
    if (a.error) return fallo('areaA', a.error);
    const b = leerNumero(tb, 'b');
    if (b.error) return fallo('areaB', b.error);
    if (!(a.v < b.v)) return fallo('areaB', 'El área va de a hasta un b más grande.');
    const r = areaEntre(modelo.f.fn, modelo.g ? modelo.g.fn : () => 0, a.v, b.v);
    if (r.error) return fallo('areaB', r.error);
    modelo.area = { ...r, a: a.v, b: b.v };
  }
  return modelo;
}

/** A number for a field of the window, as short as the size of the window allows: «−2,5». */
export function paraCampo(v, ancho) {
  const d = Math.min(8, Math.max(0, 3 - Math.floor(Math.log10(ancho))));
  const corto = Number(v.toFixed(d));
  return String(corto === 0 ? 0 : corto).replace('.', ',');
}

/** The window moved by (dx, dy), in its own units. */
export const mover = ([X, Y], dx, dy) => [
  [X[0] + dx, X[1] + dx],
  [Y[0] + dy, Y[1] + dy],
];

/** The window made `k` times as wide around its centre (k < 1 comes closer). */
export const acercar = ([a, b], k) => {
  const c = (a + b) / 2;
  const m = ((b - a) / 2) * k;
  return [c - m, c + m];
};

// ---------- In words ----------
export const par = (x, y) => `(${n(x)}; ${n(y)})`;
const tiende = (l) => (l.tipo === 'inf' ? `tiende a ${l.signo > 0 ? '+∞' : '−∞'}` : l.tipo === 'fin' ? `tiende a ${n(l.v)}` : 'no está definida');
/** «(−3; 0)» for each stretch of the study with that sign. */
export const intervalos = (tramos, signo) => tramos.filter((t) => t.signo === signo).map((t) => `(${n(t.a)}; ${n(t.b)})`);

/** «y = 2x − 1», «y = −x + 6», «y = 3». */
export function recta(m, b) {
  const mx = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '−x' : `${n(m)}x`;
  if (!mx) return `y = ${n(b)}`;
  if (b === 0) return `y = ${mx}`;
  return `y = ${mx} ${b < 0 ? '−' : '+'} ${n(Math.abs(b))}`;
}

/** Where f gives no real number: «en x = 1», «a la izquierda de x = 0», «entre x = 1 y x = 2». */
export function hueco(h, X) {
  if (h.a === h.b) return `en x ${igualA(h.a)}`;
  if (h.a <= X[0]) return `a la izquierda de x ${igualA(h.b)}`;
  if (h.b >= X[1]) return `a la derecha de x ${igualA(h.a)}`;
  return `entre x ${igualA(h.a)} y x ${igualA(h.b)}`;
}

/** The asymptotes of the study of `f`, a sentence each. */
export function asintotas(e, f) {
  if (!e.verticales.length && !e.lejos.length) return ['No aparecen asíntotas.'];
  const [der, izq] = [e.lejos.find((a) => a.lado > 0), e.lejos.find((a) => a.lado < 0)];
  const ecuacion = (a) => (a.tipo === 'horizontal' ? `y = ${n(a.b)}` : recta(a.m, a.b));
  const nombre = (a) => (a.tipo === 'horizontal' ? 'Horizontal' : 'Oblicua');
  const juntas = der && izq && ecuacion(der) === ecuacion(izq);
  const frases = e.verticales.map((v) => `Vertical en x ${igualA(v.x)}. Por izquierda ${f} ${tiende(v.izq)} y por derecha ${tiende(v.der)}.`);
  if (juntas) frases.push(`${nombre(der)} en ${ecuacion(der)}, hacia los dos lados.`);
  if (!juntas && der) frases.push(`${nombre(der)} en ${ecuacion(der)}, cuando x tiende a +∞.`);
  if (!juntas && izq) frases.push(`${nombre(izq)} en ${ecuacion(izq)}, cuando x tiende a −∞.`);
  return frases;
}

const QUE = { funcion: 'Función', ecuacion: 'Ecuación', parametrica: 'Curva paramétrica', polar: 'Curva polar', puntos: 'Puntos' };

function nombreDe(t) {
  if (t.tipo === 'funcion') return `${t.nombre}(x) = ${escribir(t.nodo)}`;
  if (t.tipo === 'ecuacion') return `${escribir(t.izq)} = ${escribir(t.der)}`;
  const recorrido = `con t de ${n(t.t0)} a ${n(t.t1)}`;
  if (t.tipo === 'parametrica') return `x = ${escribir(t.nodoX)}, y = ${escribir(t.nodoY)}, ${recorrido}`;
  if (t.tipo === 'polar') return `r = ${escribir(t.nodo)}, ${recorrido}`;
  return `${t.puntos.map((p) => par(...p)).join(' ')}${t.unir ? ', unidos en una figura' : ''}`;
}

/**
 * What the sheet shows, in plain text, for whoever can't look at the drawing (an assistant beside the calculator):
 * { titulo, datos, resultado, notas }, with datos and resultado as lists of [label, value]. Null without a drawing.
 */
export function enTexto(m) {
  if (!m || m.error || m.vacio) return null;
  const datos = m.trazos.map((t) => [QUE[t.tipo], nombreDe(t)]);
  datos.push(['Ventana', `x de ${n(m.X[0])} a ${n(m.X[1])}, y de ${n(m.Y[0])} a ${n(m.Y[1])}`]);
  const e = m.estudio;
  if (!e) return { titulo: 'Graficadora', datos, resultado: [], notas: '' };

  const f = m.f.nombre;
  const resultado = [];
  const fila = (etiqueta, valor) => valor && resultado.push([etiqueta, valor]);
  const oNinguno = (items) => (items.length ? lista(items) : 'ninguno en la ventana');
  fila(`${f}'(x)`, escribir(e.nodoD));
  fila(`${f}''(x)`, escribir(e.nodoD2));
  fila('Dominio', e.huecos.length ? `${f} no da un número real ${lista(e.huecos.map((h) => hueco(h, e.X)))}` : 'todo x de la ventana');
  fila('Corte con el eje y', e.ordenada === null ? 'no tiene' : par(0, e.ordenada));
  fila('Cortes con el eje x', oNinguno(e.ceros.map((c) => `x ${igualA(c)}`)));
  if (e.paridad) fila('Paridad', { par: 'par', impar: 'impar' }[e.paridad.tipo] ?? 'ni par ni impar');
  fila('Asíntotas', asintotas(e, f).join(' '));
  fila('Crece en', lista(intervalos(e.crecimiento, 1)));
  fila('Decrece en', lista(intervalos(e.crecimiento, -1)));
  fila('Extremos relativos', oNinguno(e.extremos.map((x) => `${x.tipo === 'max' ? 'máximo' : 'mínimo'} en ${par(x.x, x.y)}`)));
  fila('Cóncava hacia arriba en', lista(intervalos(e.concavidad, 1)));
  fila('Cóncava hacia abajo en', lista(intervalos(e.concavidad, -1)));
  fila('Puntos de inflexión', oNinguno(e.inflexiones.map((q) => par(q.x, q.y))));
  if (m.tangente) fila(`Recta tangente en x₀ = ${n(m.tangente.x0)}`, recta(m.tangente.m, m.tangente.b));
  if (m.area) fila(`Área entre ${f} y ${m.g ? m.g.nombre : 'el eje x'}, de ${n(m.area.a)} a ${n(m.area.b)}`, `≈ ${n(m.area.total)}`);
  return { titulo: 'Graficadora', datos, resultado, notas: `El estudio es de ${f} y se busca en la ventana. Los valores con ≈ son aproximados.` };
}
