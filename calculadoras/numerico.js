import { leerNumero } from '../formulas/decimales.js';
import { compilar, derivar, intentar } from '../formulas/formula.js';

// Análisis Numérico: roots (bisección, falsa posición, Newton-Raphson, secante), iteración de punto fijo and the
// one-step methods for an initial value problem (Euler, Heun, punto medio, Runge-Kutta de cuarto orden). Formulas,
// order of the operations, names and errors (εa, εs, εt) are the course's (El Santo Resumen, analisis-numerico,
// from the PPT de Métodos Cerrados y Abiertos and the Chapra). The student's own run
// is El Santo Resumen's simulator (interactivos.js), with the derivative of Newton-Raphson done by the rules.

const MAX_ITERACIONES = 50;
const MAX_PASOS = 100;

/** εa or εt of the course: |(actual − anterior) / actual| · 100 %. */
export const errorRelativo = (actual, otro) => Math.abs((actual - otro) / actual) * 100;

const mal = (campo, texto) => ({ error: { campo, texto } });

function formula(texto, variables, campo) {
  const r = intentar(texto, variables);
  return r.error ? mal(campo, r.error) : { nodo: r.nodo, fn: compilar(r.nodo, variables) };
}

function numero(texto, nombre, campo) {
  const r = leerNumero(texto, nombre);
  return r.error ? mal(campo, r.error) : r;
}

/** What every iterative method shares: how many at most, when to stop and the true value, all optional but the first. */
function comunes(d) {
  const max = numero(d.max, 'La cantidad de iteraciones', 'max');
  if (max.error) return max;
  if (!Number.isInteger(max.v) || max.v < 1 || max.v > MAX_ITERACIONES) return mal('max', `Van de 1 a ${MAX_ITERACIONES} iteraciones.`);
  let es = null;
  if (String(d.es ?? '').trim()) {
    const r = numero(d.es, 'εs', 'es');
    if (r.error) return r;
    if (!(r.v > 0)) return mal('es', 'εs tiene que ser mayor que 0.');
    es = r.v;
  }
  let xv = null;
  if (String(d.verdadero ?? '').trim()) {
    const r = numero(d.verdadero, 'El valor verdadero', 'verdadero');
    if (r.error) return r;
    if (r.v === 0) return mal('verdadero', 'Con valor verdadero 0, εt no se puede calcular.');
    xv = r.v;
  }
  return { max: max.v, es, xv, et: (x) => (xv === null ? null : errorRelativo(xv, x)) };
}

// ---------- Roots ----------
export const METODOS_RAICES = ['biseccion', 'falsa', 'newton', 'secante'];

/**
 * Roots of f(x) with the chosen method. `d` are the texts: metodo, f, a and b (xₗ and xᵤ, or x₋₁ and x₀ for the
 * secant), x0 (Newton-Raphson), max, es and verdadero. Gives { error: { campo, texto } } or the whole run.
 */
export function raices(d) {
  const metodo = METODOS_RAICES.includes(d.metodo) ? d.metodo : 'biseccion';
  const f = formula(d.f, ['x'], 'f');
  if (f.error) return f;
  const c = comunes(d);
  if (c.error) return c;
  const filas = [];
  let fin = null;
  const parar = (ea, i) => {
    if (c.es !== null && ea !== null && ea < c.es) {
      fin = { tipo: 'tolerancia', i };
      return true;
    }
    return false;
  };

  if (metodo === 'biseccion' || metodo === 'falsa') {
    const a = numero(d.a, 'xₗ', 'a');
    if (a.error) return a;
    const b = numero(d.b, 'xᵤ', 'b');
    if (b.error) return b;
    let xl = a.v;
    let xu = b.v;
    if (!(xl < xu)) return mal('b', 'xᵤ tiene que ser mayor que xₗ.');
    let fl = f.fn(xl);
    let fu = f.fn(xu);
    if (Number.isNaN(fl)) return mal('a', 'f(xₗ) no da un número real.');
    if (Number.isNaN(fu)) return mal('b', 'f(xᵤ) no da un número real.');
    const inicio = { xl, xu, fl, fu };
    if (fl * fu > 0) return { ...mal('b', 'f(xₗ) y f(xᵤ) tienen el mismo signo. El intervalo no encierra la raíz.'), inicio };
    if (fl === 0) return mal('a', 'f(xₗ) da 0. xₗ ya es la raíz.');
    if (fu === 0) return mal('b', 'f(xᵤ) da 0. xᵤ ya es la raíz.');
    let previo = null;
    for (let i = 1; i <= c.max; i += 1) {
      const xr = metodo === 'biseccion' ? (xl + xu) / 2 : xu - (fu * (xl - xu)) / (fl - fu);
      const fr = f.fn(xr);
      if (Number.isNaN(fr)) {
        fin = { tipo: 'nan', i, x: xr };
        break;
      }
      const ea = previo === null ? null : errorRelativo(xr, previo);
      const prod = fl * fr;
      filas.push({ i, xl, xu, fl, fu, xr, fr, prod, queda: prod < 0 ? 'xu' : prod > 0 ? 'xl' : 'raiz', ea, et: c.et(xr) });
      if (prod === 0) {
        fin = { tipo: 'raiz', i };
        break;
      }
      if (parar(ea, i)) break;
      if (prod < 0) {
        xu = xr;
        fu = fr;
      } else {
        xl = xr;
        fl = fr;
      }
      previo = xr;
    }
    return terminar({ metodo, f, inicio, filas, fin, c, x: (u) => u.xr });
  }

  if (metodo === 'newton') {
    const x0 = numero(d.x0, 'x₀', 'x0');
    if (x0.error) return x0;
    const nodoD = derivar(f.nodo, 'x');
    const df = compilar(nodoD, ['x']);
    let x = x0.v;
    for (let i = 0; i < c.max; i += 1) {
      const fx = f.fn(x);
      const dx = df(x);
      if (Number.isNaN(fx) || Number.isNaN(dx)) {
        fin = { tipo: 'nan', i, x };
        break;
      }
      if (dx === 0) {
        fin = { tipo: 'plana', i, x };
        break;
      }
      const x1 = x - fx / dx;
      const ea = errorRelativo(x1, x);
      filas.push({ i, x, fx, dx, x1, ea, et: c.et(x1) });
      if (!(Math.abs(x1) < 1e12)) {
        fin = { tipo: 'lejos', i };
        break;
      }
      if (fx === 0) {
        fin = { tipo: 'raiz', i };
        break;
      }
      if (parar(ea, i)) break;
      x = x1;
    }
    if (!filas.length) return mal('x0', fin?.tipo === 'plana' ? "f'(x₀) da 0. La tangente no corta al eje." : 'f o su derivada no dan un número real en x₀.');
    return terminar({ metodo, f, nodoD, inicio: { x: x0.v }, filas, fin, c, x: (u) => u.x1 });
  }

  // Secante.
  const a = numero(d.a, 'x₋₁', 'a');
  if (a.error) return a;
  const b = numero(d.b, 'x₀', 'b');
  if (b.error) return b;
  if (a.v === b.v) return mal('b', 'x₋₁ y x₀ tienen que ser distintos.');
  let xa = a.v;
  let xb = b.v;
  for (let i = 0; i < c.max; i += 1) {
    const fa = f.fn(xa);
    const fb = f.fn(xb);
    if (Number.isNaN(fa) || Number.isNaN(fb)) {
      fin = { tipo: 'nan', i, x: Number.isNaN(fa) ? xa : xb };
      break;
    }
    if (fa === fb) {
      fin = { tipo: 'plana', i };
      break;
    }
    const x1 = xb - (fb * (xa - xb)) / (fa - fb);
    const ea = errorRelativo(x1, xb);
    filas.push({ i, xa, xb, fa, fb, x1, ea, et: c.et(x1) });
    if (!(Math.abs(x1) < 1e12)) {
      fin = { tipo: 'lejos', i };
      break;
    }
    if (parar(ea, i)) break;
    xa = xb;
    xb = x1;
  }
  if (!filas.length) return mal('b', fin?.tipo === 'plana' ? 'f(x₋₁) y f(x₀) son iguales. La recta no corta al eje.' : 'f no da un número real en x₋₁ o en x₀.');
  return terminar({ metodo, f, inicio: { xa: a.v, xb: b.v }, filas, fin, c, x: (u) => u.x1 });
}

function terminar({ metodo, f, nodoD, inicio, filas, fin, c, x }) {
  const u = filas[filas.length - 1];
  return {
    metodo,
    nodoF: f.nodo,
    f: f.fn,
    nodoD,
    inicio,
    filas,
    fin: fin ?? { tipo: 'max', i: filas.length },
    raiz: x(u),
    fRaiz: f.fn(x(u)),
    ea: u.ea,
    et: u.et,
    es: c.es,
    xv: c.xv,
    max: c.max,
  };
}

// ---------- Fixed point ----------
/** Iteración simple de punto fijo, xᵢ₊₁ = g(xᵢ). `d`: g, x0, max, es, verdadero. */
export function puntoFijo(d) {
  const g = formula(d.g, ['x'], 'g');
  if (g.error) return g;
  const x0 = numero(d.x0, 'x₀', 'x0');
  if (x0.error) return x0;
  const c = comunes(d);
  if (c.error) return c;
  const filas = [{ i: 0, x: x0.v, ea: null, et: c.et(x0.v) }];
  let fin = null;
  for (let i = 1; i <= c.max; i += 1) {
    const x = g.fn(filas[i - 1].x);
    if (Number.isNaN(x) || Math.abs(x) > 1e12) {
      fin = { tipo: Number.isNaN(x) ? 'nan' : 'lejos', i };
      break;
    }
    const ea = errorRelativo(x, filas[i - 1].x);
    filas.push({ i, x, ea, et: c.et(x) });
    if (c.es !== null && ea < c.es) {
      fin = { tipo: 'tolerancia', i };
      break;
    }
  }
  const nodoD = derivar(g.nodo, 'x');
  const dg = compilar(nodoD, ['x']);
  const ultimo = filas[filas.length - 1];
  const pendiente = Math.abs(dg(ultimo.x));
  return {
    nodoG: g.nodo,
    g: g.fn,
    nodoD,
    dg,
    filas,
    fin: fin ?? { tipo: 'max', i: filas.length - 1 },
    x: ultimo.x,
    ea: ultimo.ea,
    et: ultimo.et,
    pendiente,
    es: c.es,
    xv: c.xv,
  };
}

// ---------- Initial value problem ----------
export const METODOS_PVI = ['euler', 'heun', 'medio', 'rk4'];

/**
 * y' = f(x, y) with y(x₀) = y₀, from x₀ to xf with step h. `d`: metodo, f, x0, y0, h, xf and exacta (y(x), optional).
 * Each step keeps what the course writes down for its method.
 */
export function pvi(d) {
  const metodo = METODOS_PVI.includes(d.metodo) ? d.metodo : 'euler';
  const f = formula(d.f, ['x', 'y'], 'f');
  if (f.error) return f;
  const v = {};
  for (const [k, nombre] of [['x0', 'x₀'], ['y0', 'y₀'], ['h', 'h'], ['xf', 'El x final']]) {
    const r = numero(d[k], nombre, k);
    if (r.error) return r;
    v[k] = r.v;
  }
  let exacta = null;
  if (String(d.exacta ?? '').trim()) {
    exacta = formula(d.exacta, ['x'], 'exacta');
    if (exacta.error) return exacta;
  }
  const { x0, y0, h, xf } = v;
  if (!(h > 0)) return mal('h', 'h tiene que ser mayor que 0.');
  if (!(xf > x0)) return mal('xf', 'El x final tiene que ser mayor que x₀.');
  const n = Math.round((xf - x0) / h);
  if (n < 1 || Math.abs(x0 + n * h - xf) > 1e-9 * Math.max(1, Math.abs(xf))) return mal('h', 'Con ese h no se llega justo al x final.');
  if (n > MAX_PASOS) return mal('h', `Serían ${n} pasos. Van hasta ${MAX_PASOS}.`);
  const fn = f.fn;
  const pasos = [];
  let x = x0;
  let y = y0;
  let fin = null;
  for (let i = 0; i < n; i += 1) {
    const x1 = Number((x0 + (i + 1) * h).toPrecision(12));
    const k1 = fn(x, y);
    const p = { i, x, y, x1, k1 };
    if (metodo === 'euler') {
      p.y1 = y + k1 * h;
    } else if (metodo === 'heun') {
      p.predictor = y + k1 * h;
      p.k2 = fn(x1, p.predictor);
      p.promedio = (k1 + p.k2) / 2;
      p.y1 = y + p.promedio * h;
      p.ea = errorRelativo(p.y1, p.predictor);
    } else if (metodo === 'medio') {
      p.xm = x + h / 2;
      p.ym = y + k1 * (h / 2);
      p.k2 = fn(p.xm, p.ym);
      p.y1 = y + p.k2 * h;
    } else {
      p.k2 = fn(x + h / 2, y + (k1 * h) / 2);
      p.k3 = fn(x + h / 2, y + (p.k2 * h) / 2);
      p.k4 = fn(x + h, y + p.k3 * h);
      p.y1 = y + ((k1 + 2 * p.k2 + 2 * p.k3 + p.k4) / 6) * h;
    }
    if (!Number.isFinite(p.y1)) {
      fin = { tipo: 'nan', x };
      break;
    }
    if (exacta) {
      p.yv = exacta.fn(x1);
      p.et = Number.isFinite(p.yv) && p.yv !== 0 ? errorRelativo(p.yv, p.y1) : null;
    }
    pasos.push(p);
    x = x1;
    y = p.y1;
  }
  if (!pasos.length) return mal('f', `En x = ${x0} la cuenta no da un número real.`);
  const u = pasos[pasos.length - 1];
  return { metodo, nodoF: f.nodo, f: fn, nodoExacta: exacta?.nodo ?? null, exacta: exacta?.fn ?? null, x0, y0, h, xf, pasos, fin, x: u.x1, y: u.y1, yv: u.yv ?? null, et: u.et ?? null };
}
