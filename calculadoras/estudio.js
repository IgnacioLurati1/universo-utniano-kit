import { compilar, derivar } from '../formulas/formula.js';
import { borde, integral, limpio, salto } from './trazado.js';

// The study of a function of Análisis Matemático I, in the order the exams ask for it (parcial-2.md of El Santo Resumen,
// «Estudio completo de una función»): domain, cuts with the axes, parity, asymptotes, growth and extrema with the sign
// of f', concavity and inflection with the sign of f''. Also the tangent line («La derivada») and the area between
// curves (integrales.md). Everything is found by numbers inside the window, so it's a check of what the student worked
// out by hand, never a proof: the sheet writes it with ≈.

const N = 1200;
const finito = Number.isFinite;
const cerca = (a, b) => Math.abs(a - b) <= 1e-7 * (1 + Math.abs(a) + Math.abs(b));

function muestras(f, [a, b], n = N) {
  const xs = new Float64Array(n + 1);
  const ys = new Float64Array(n + 1);
  for (let i = 0; i <= n; i += 1) {
    xs[i] = a + ((b - a) * i) / n;
    ys[i] = f(xs[i]);
  }
  return { xs, ys };
}

/** A size for the values of f: the spread of its middle 80 %, so a pole doesn't count. */
function escala(ys) {
  const v = [...ys].filter(finito).sort((p, q) => p - q);
  if (!v.length) return 1;
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * (v.length - 1)))];
  return Math.max(q(0.9) - q(0.1), Math.abs(q(0.5)), 1e-9);
}

/**
 * How f behaves coming to x from one side (`lado` −1 from the left, 1 from the right): { tipo: 'inf', signo },
 * { tipo: 'fin', v } or { tipo: 'nada' } when f isn't defined on that side. It goes to infinity when it keeps growing
 * at every step closer and the steps don't shrink (1/x, ln x); a finite limit shrinks them.
 */
export function lateral(f, x, lado) {
  const esc = Math.max(1, Math.abs(x));
  const en = (h) => f(x + lado * h * esc);
  const v = [];
  for (const h of [1e-3, 1e-4, 1e-5, 1e-6, 1e-7, 1e-8]) {
    const y = en(h);
    if (!finito(y)) break;
    v.push(y);
  }
  if (v.length < 3) {
    // Too few: either that side isn't in the domain, or the values overflow on the way (e^(1/x)). From a bit further:
    // the values that do exist, up to where they stop.
    const w = [];
    for (const y of [en(1e-1), en(1e-2), ...v]) {
      if (finito(y)) w.push(y);
      else if (w.length) break;
    }
    if (!w.length) return { tipo: 'nada' };
    const ultimo = w[w.length - 1];
    const explota = w.length > 1 && Math.abs(ultimo) > 1e6 && Math.abs(ultimo) > 100 * Math.abs(w[w.length - 2]);
    if (explota) return { tipo: 'inf', signo: Math.sign(ultimo) };
    return v.length ? { tipo: 'fin', v: v[v.length - 1] } : { tipo: 'nada' };
  }
  const signo = Math.sign(v[v.length - 1]);
  let crece = v.every((y) => Math.sign(y) === signo);
  let previo = null;
  for (let k = 1; crece && k < v.length; k += 1) {
    const d = Math.abs(v[k]) - Math.abs(v[k - 1]);
    if (!(d > 0) || (previo !== null && d < 0.5 * previo)) crece = false;
    previo = d;
  }
  return crece ? { tipo: 'inf', signo } : { tipo: 'fin', v: v[v.length - 1] };
}

/**
 * Where f breaks inside the window: the edges of its domain and its jumps, each { x, izq, der } with how f arrives from
 * each side. And the stretches where it gives no real number: `huecos`, each { a, b } (a === b for a single point).
 */
export function quiebres(f, X, n = N) {
  const { xs, ys } = muestras(f, X, n);
  const esc = escala(ys);
  const puntos = [];
  const huecos = [];
  const sumar = (x) => {
    if (!puntos.some((p) => cerca(p, x))) puntos.push(x);
  };
  let desde = finito(ys[0]) ? null : X[0];
  for (let i = 1; i <= n; i += 1) {
    const antes = finito(ys[i - 1]);
    const ahora = finito(ys[i]);
    if (antes && ahora) {
      if (Math.abs(ys[i] - ys[i - 1]) > 0.05 * esc) {
        const s = salto(f, xs[i - 1], xs[i], ys[i - 1], ys[i]);
        if (s) sumar((s.a + s.b) / 2);
      }
    } else if (antes) {
      desde = borde(f, xs[i - 1], xs[i]);
      sumar(desde);
    } else if (ahora) {
      const hasta = borde(f, xs[i], xs[i - 1]);
      sumar(hasta);
      huecos.push({ a: desde, b: cerca(desde, hasta) ? desde : hasta });
      desde = null;
    }
  }
  if (desde !== null) huecos.push({ a: desde, b: X[1] });
  const lista = puntos.sort((p, q) => p - q).map((x) => ({ x: limpio(x), crudo: x, izq: lateral(f, x, -1), der: lateral(f, x, 1) }));
  return { puntos: lista, huecos: huecos.map((h) => ({ a: limpio(h.a), b: limpio(h.b) })) };
}

/**
 * The sign of h along the window: `tramos`, each { a, b, signo }, and `cambios`, each { x, antes, despues, cero } where
 * it goes from one sign to the other (`cero`: passing through 0, and not by a jump). `cortes`: points where the stretch
 * is cut anyway, because the function itself breaks there.
 */
export function signos(h, X, cortes = [], n = N) {
  const { xs, ys } = muestras(h, X, n);
  const esc = escala(ys);
  const nulo = 1e-12 * (1 + esc);
  const sg = (y) => (!finito(y) ? null : Math.abs(y) <= nulo ? 0 : Math.sign(y));
  const corteEntre = (p, q) => cortes.find((c) => c > p && c <= q);

  // Runs of samples with the same sign. `une`: it follows the one before with nothing in between.
  let corridas = [];
  let act = null;
  for (let i = 0; i <= n; i += 1) {
    const s = sg(ys[i]);
    const corte = i > 0 ? corteEntre(xs[i - 1], xs[i]) : undefined;
    if (s === null) {
      if (act) corridas.push(act);
      act = null;
      continue;
    }
    if (act && corte === undefined && s === act.s) {
      act.i1 = i;
      continue;
    }
    const nueva = { i0: i, i1: i, s, une: Boolean(act) && corte === undefined, corte };
    if (act) corridas.push(act);
    act = nueva;
  }
  if (act) corridas.push(act);

  // A single sample that lands exactly on 0 isn't a stretch: it's the crossing itself, or a touch.
  const limpias = [];
  for (let k = 0; k < corridas.length; k += 1) {
    const c = corridas[k];
    const sig = corridas[k + 1];
    const ant = limpias[limpias.length - 1];
    if (c.s === 0 && c.i0 === c.i1 && c.une && sig?.une && ant) {
      if (ant.s === sig.s) {
        ant.i1 = sig.i1;
        k += 1;
      } else sig.enX = xs[c.i0];
      continue;
    }
    limpias.push(c);
  }
  corridas = limpias;

  const tramos = [];
  const cambios = [];
  corridas.forEach((c, k) => {
    const ant = corridas[k - 1];
    let a;
    if (c.i0 === 0) a = X[0];
    else if (c.une && ant) {
      if (c.enX !== undefined) {
        a = c.enX;
        cambios.push({ x: limpio(a), antes: ant.s, despues: c.s, cero: true });
      } else if (ant.s === 0 || c.s === 0) a = c.s === 0 ? xs[c.i0] : xs[ant.i1];
      else {
        let [lo, hi] = [xs[ant.i1], xs[c.i0]];
        for (let v = 0; v < 70; v += 1) {
          const m = (lo + hi) / 2;
          if (m === lo || m === hi) break;
          // The exact sign here, with no margin: a flat root (x³) is still found where it is.
          if (Math.sign(h(m)) === ant.s) lo = m;
          else hi = m;
        }
        a = (lo + hi) / 2;
        const cero = Math.max(Math.abs(h(lo)), Math.abs(h(hi))) < 1e-6 * (1 + esc);
        cambios.push({ x: limpio(a), antes: ant.s, despues: c.s, cero });
      }
    } else if (c.corte !== undefined) a = c.corte;
    else {
      a = borde(h, xs[c.i0], xs[c.i0 - 1]);
      // A single point without a value between two signs (the corner of |x|, where f' doesn't exist).
      const pegado = ant && ant.s && c.s && ant.s !== c.s && cerca(tramos[tramos.length - 1].b, a);
      if (pegado && !cortes.some((k) => cerca(k, a))) cambios.push({ x: limpio(a), antes: ant.s, despues: c.s, cero: false });
    }
    const sig = corridas[k + 1];
    let b;
    if (c.i1 === n) b = X[1];
    else if (sig?.une) b = null;
    else if (sig?.corte !== undefined) b = sig.corte;
    else b = borde(h, xs[c.i1], xs[c.i1 + 1]);
    tramos.push({ a: limpio(a), b: b === null ? null : limpio(b), signo: c.s });
  });
  // The end of a stretch that the next one follows is where the next one starts.
  tramos.forEach((t, k) => {
    if (t.b === null) t.b = tramos[k + 1].a;
  });
  return { tramos: tramos.filter((t) => t.b > t.a), cambios };
}

/** The limit of f towards +∞ (`lado` 1) or −∞ (−1), when its values settle: a number, or null. */
function limiteLejos(f, lado) {
  const v = [1e6, 1e9, 2.7e10, 1e12].map((x) => f(lado * x));
  if (!v.every(finito)) return null;
  const tol = 1e-4 * (1 + Math.abs(v[3]));
  if (Math.abs(v[3] - v[2]) > tol || Math.abs(v[2] - v[1]) > tol) return null;
  return limpio(Math.round(v[3] * 1e4) / 1e4);
}

/** The oblique asymptote y = mx + b towards one side, or null. */
function oblicua(f, lado) {
  const pendiente = (x) => (f(2 * lado * x) - f(lado * x)) / (lado * x);
  const [m1, m2] = [pendiente(1e6), pendiente(1e8)];
  if (!finito(m1) || !finito(m2) || Math.abs(m1 - m2) > 1e-6 * (1 + Math.abs(m2))) return null;
  const m = Math.round(m2 * 1e6) / 1e6;
  if (Math.abs(m) < 1e-6) return null;
  const b = [1e4, 1e5, 1e6].map((x) => f(lado * x) - m * lado * x);
  if (!b.every(finito) || Math.abs(b[2] - b[1]) > 1e-3 || Math.abs(b[1] - b[0]) > 1e-2) return null;
  return { m: limpio(m), b: limpio(Math.round(b[2] * 1e4) / 1e4) };
}

/** Whether f is even, odd or neither, tried on pairs x and −x: { tipo: 'par' | 'impar' | 'ninguna' | 'dominio', x, fx, fmx }. */
function paridad(f, X) {
  const M = Math.max(Math.abs(X[0]), Math.abs(X[1]), 1);
  let par = true;
  let impar = true;
  let muestra = null;
  let rompe = null;
  for (let i = 1; i <= 40; i += 1) {
    // Never a round number, so a pole doesn't hide the pair.
    const x = (M * (i - 0.37)) / 40;
    const [p, q] = [f(x), f(-x)];
    if (finito(p) !== finito(q)) return { tipo: 'dominio', x: limpio(finito(p) ? x : -x, 4) };
    if (!finito(p)) continue;
    const tol = 1e-9 * (1 + Math.abs(p) + Math.abs(q));
    const esPar = Math.abs(p - q) <= tol;
    const esImpar = Math.abs(p + q) <= tol;
    if (!muestra) muestra = x;
    if ((par && !esPar) || (impar && !esImpar)) rompe = rompe ?? x;
    par = par && esPar;
    impar = impar && esImpar;
  }
  if (muestra === null) return null;
  // The pair shown on the sheet: 1 and −1 when f is defined there, since it's the one a student would try.
  const x = finito(f(1)) && finito(f(-1)) && (par || impar || Math.abs(f(1) - f(-1)) > 1e-9) ? 1 : limpio(par || impar ? muestra : rompe, 4);
  return { tipo: par ? 'par' : impar ? 'impar' : 'ninguna', x, fx: limpio(f(x)), fmx: limpio(f(-x)) };
}

/**
 * The whole study of f (its tree `nodo`) inside the window X.
 */
export function estudiar(nodo, X) {
  const f = compilar(nodo, ['x']);
  const nodoD = derivar(nodo);
  const nodoD2 = derivar(nodoD);
  const d1 = compilar(nodoD, ['x']);
  const d2 = compilar(nodoD2, ['x']);

  const { puntos, huecos } = quiebres(f, X);
  const cortes = puntos.map((p) => p.x);
  const escF = escala(muestras(f, X, 400).ys);

  // Growth and extrema, with the sign of f'.
  const s1 = signos(d1, X, cortes);
  const extremos = s1.cambios
    .filter((c) => c.antes && c.despues && c.antes !== c.despues && finito(f(c.x)))
    .map((c) => ({ x: c.x, y: limpio(f(c.x)), tipo: c.antes > 0 ? 'max' : 'min', derivada: c.cero ? 'cero' : 'no existe' }));

  // Concavity and inflection, with the sign of f''.
  const s2 = signos(d2, X, cortes);
  const inflexiones = s2.cambios.filter((c) => c.antes && c.despues && c.antes !== c.despues && finito(f(c.x))).map((c) => ({ x: c.x, y: limpio(f(c.x)) }));

  // Cuts with the axes. A root where f only touches the axis is one of its extrema.
  const ceros = signos(f, X, cortes).cambios.filter((c) => c.cero).map((c) => c.x);
  const tambien = (x) => {
    if (Math.abs(f(x)) <= 1e-7 * (1 + escF) && !ceros.some((c) => cerca(c, x))) ceros.push(x);
  };
  extremos.forEach((e) => tambien(e.x));
  X.forEach(tambien);
  // The edge of the domain, when f reaches 0 right there (√(4 − x²) at ±2). A round edge where f isn't defined is
  // open (x·ln x at 0), and there's no root.
  for (const p of puntos) {
    const esBorde = (p.izq.tipo === 'nada') !== (p.der.tipo === 'nada');
    const cerrado = finito(f(p.x)) || p.x !== Number(p.x.toPrecision(6));
    if (esBorde && cerrado && Math.abs(f(p.crudo)) <= 1e-3 * (1 + escF) && !ceros.some((c) => cerca(c, p.x))) ceros.push(p.x);
  }
  ceros.sort((p, q) => p - q);
  const y0 = f(0);

  // Asymptotes: vertical where a side goes to infinity; far away, horizontal, and oblique only without a horizontal.
  const verticales = puntos.filter((p) => p.izq.tipo === 'inf' || p.der.tipo === 'inf');
  const lejos = [1, -1].map((lado) => {
    const b = limiteLejos(f, lado);
    if (b !== null) return { lado, tipo: 'horizontal', b };
    const o = oblicua(f, lado);
    return o ? { lado, tipo: 'oblicua', ...o } : null;
  });

  return {
    f,
    nodo,
    nodoD,
    nodoD2,
    d1,
    d2,
    X,
    huecos,
    quiebres: puntos,
    ordenada: finito(y0) ? limpio(y0) : null,
    ceros,
    paridad: paridad(f, X),
    verticales,
    lejos: lejos.filter(Boolean),
    crecimiento: s1.tramos,
    extremos,
    concavidad: s2.tramos,
    inflexiones,
  };
}

/** The tangent line to f at x0: y = y0 + m(x − x0) = mx + b. Or { error }. */
export function tangente(f, d1, x0) {
  const y0 = f(x0);
  if (!finito(y0)) return { error: 'f no está definida en x₀.' };
  const m = d1(x0);
  if (!finito(m)) return { error: 'f no es derivable en x₀.' };
  return { x0, y0: limpio(y0), m: limpio(m), b: limpio(y0 - m * x0) };
}

/** The integral with as many pieces as it takes for two rounds to agree. NaN if it isn't a number, null if the rounds
 * never agree: the stretch is too long for what the function moves. */
function integralFirme(f, a, b) {
  let antes = integral(f, a, b, 400);
  if (!finito(antes)) return NaN;
  for (let n = 800; n <= 51200; n *= 2) {
    const v = integral(f, a, b, n);
    if (!finito(v)) return NaN;
    // Enough for the four decimals the sheet writes, also where the curve starts upright (a root at its border).
    if (Math.abs(v - antes) <= 1e-6 * Math.max(1, Math.abs(v))) return v;
    antes = v;
  }
  return null;
}

/**
 * The area between f and g from a to b (integrales.md, «Área entre curvas»): where they cross, and in each stretch the
 * integral of roof minus floor. Gives { cortes, tramos: [{ a, b, techo, valor }], total } or { error }.
 */
export function areaEntre(f, g, a, b) {
  const dif = (x) => f(x) - g(x);
  const q = quiebres(dif, [a, b], 800);
  const sinDefinir = 'Entre a y b hay un tramo donde alguna de las dos no está definida.';
  if (q.huecos.some((h) => h.b > h.a)) return { error: sinDefinir };
  if (q.puntos.some((p) => p.izq.tipo === 'inf' || p.der.tipo === 'inf')) return { error: 'Entre a y b hay una asíntota vertical. Esa área no da un número.' };
  if (q.huecos.length) return { error: sinDefinir };
  const cortes = signos(dif, [a, b], [], 800)
    .cambios.filter((c) => c.cero && c.x > a && c.x < b)
    .map((c) => c.x);
  const bordes = [a, ...cortes, b];
  const partes = [];
  let total = 0;
  for (let k = 0; k + 1 < bordes.length; k += 1) {
    const v = integralFirme(dif, bordes[k], bordes[k + 1]);
    if (v === null) return { error: 'Entre a y b el área no se pudo calcular bien. Probá un tramo más corto.' };
    if (!finito(v)) return { error: 'Entre a y b el área no da un número.' };
    partes.push({ a: bordes[k], b: bordes[k + 1], techo: v >= 0 ? 'f' : 'g', valor: limpio(Math.abs(v)) });
    total += Math.abs(v);
  }
  return { cortes, tramos: partes, total: limpio(total) };
}
