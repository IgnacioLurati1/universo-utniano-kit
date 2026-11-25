// Lugar geométrico de las raíces, of Tecnologías para la Automatización: FTLA = k·N(s)/D(s) with unit feedback. The
// poles and zeros, the construction rules of the slides (real axis, asymptotes and centroid, crossing of the imaginary
// axis with s = iω, breakaway with dk/ds = 0, departure angles), the range of k that keeps it stable, the closed-loop
// poles for a chosen k and the branches for the drawing. Rules, notation and examples: El Santo Resumen
// (diapositivas «7 - Lugar geométrico de las raíces», págs. 2 a 11; «9 - Controladores», págs. 6 y 9).
import { leerNumero } from '../formulas/decimales.js';
import { compilar, intentar, usa } from '../formulas/formula.js';

// ---------- Polynomials in s, as coefficient lists from the constant up: s² + s is [0, 1, 1] ----------
const CERO = 1e-12;

export function limpio(a) {
  const r = a.map((c) => (Math.abs(c) < CERO ? 0 : c));
  while (r.length > 1 && r[r.length - 1] === 0) r.pop();
  return r;
}
const sumar = (a, b) => limpio(Array.from({ length: Math.max(a.length, b.length) }, (_, i) => (a[i] ?? 0) + (b[i] ?? 0)));
const escalar = (a, k) => limpio(a.map((c) => c * k));
function multiplicar(a, b) {
  const r = Array(a.length + b.length - 1).fill(0);
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y)));
  return limpio(r);
}
export const derivada = (a) => (a.length > 1 ? limpio(a.slice(1).map((c, i) => c * (i + 1))) : [0]);
const grado = (a) => limpio(a).length - 1;

/** The formula as the coefficients of a polynomial in s, or null when it isn't one. */
function coeficientes(n) {
  switch (n.t) {
    case 'n':
      return [n.v];
    case 'c':
      return [n.n === 'pi' ? Math.PI : Math.E];
    case 'v':
      return [0, 1];
    case 'neg': {
      const a = coeficientes(n.a);
      return a && escalar(a, -1);
    }
    case '+':
    case '-': {
      const a = coeficientes(n.a);
      const b = coeficientes(n.b);
      return a && b && sumar(a, n.t === '+' ? b : escalar(b, -1));
    }
    case '*': {
      const a = coeficientes(n.a);
      const b = coeficientes(n.b);
      return a && b && multiplicar(a, b);
    }
    case '/': {
      const a = coeficientes(n.a);
      const b = coeficientes(n.b);
      return a && b && b.length === 1 && b[0] !== 0 ? escalar(a, 1 / b[0]) : null;
    }
    case '^': {
      const a = coeficientes(n.a);
      const b = coeficientes(n.b);
      if (!a || !b || b.length !== 1 || !Number.isInteger(b[0]) || b[0] < 0 || b[0] > 20) return null;
      let r = [1];
      for (let i = 0; i < b[0]; i += 1) r = multiplicar(r, a);
      return r;
    }
    case 'f': {
      if (usa(n.a, 's')) return null;
      const v = compilar(n, [])();
      return Number.isFinite(v) ? [v] : null;
    }
    default:
      return null;
  }
}

// ---------- Complex numbers as [re, im] ----------
const cMul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
const cRes = (a, b) => [a[0] - b[0], a[1] - b[1]];
const cDiv = (a, b) => {
  const d = b[0] * b[0] + b[1] * b[1];
  return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d];
};
/** The polynomial at the complex z, by Horner. */
export function evaluar(a, z) {
  let r = [0, 0];
  for (let i = a.length - 1; i >= 0; i -= 1) r = [r[0] * z[0] - r[1] * z[1] + a[i], r[0] * z[1] + r[1] * z[0]];
  return r;
}

/** A root close to the real axis is real; a tiny part is 0. */
function prolijo([re, im]) {
  const escala = Math.max(1, Math.hypot(re, im));
  return [Math.abs(re) < 1e-7 * escala ? 0 : re, Math.abs(im) < 1e-6 * escala ? 0 : im];
}

/**
 * The roots, by Durand-Kerner. From the previous roots when there are, so each branch keeps its order as k grows.
 */
export function raices(a, previas, vueltas = 400) {
  const p = limpio(a);
  const n = p.length - 1;
  if (n < 1) return [];
  const m = p.map((c) => c / p[n]);
  const radio = 1 + Math.max(...m.slice(0, n).map(Math.abs));
  let r = previas?.length === n ? previas.map((z) => [z[0], z[1]]) : Array.from({ length: n }, (_, k) => [radio * Math.cos((2 * Math.PI * k) / n + 0.4), radio * Math.sin((2 * Math.PI * k) / n + 0.4)]);
  for (let v = 0; v < vueltas; v += 1) {
    let cambio = 0;
    r = r.map((ri, i) => {
      let den = [1, 0];
      r.forEach((rj, j) => {
        if (j !== i) den = cMul(den, cRes(ri, rj));
      });
      if (den[0] === 0 && den[1] === 0) den = [1e-12, 0];
      const paso = cDiv(evaluar(m, ri), den);
      cambio = Math.max(cambio, Math.hypot(...paso));
      return cRes(ri, paso);
    });
    if (cambio < 1e-14 * radio) break;
  }
  return r;
}

const ordenar = (zs) => zs.slice().sort((a, b) => a[0] - b[0] || b[1] - a[1]);
const angulo = (a, b) => (Math.atan2(a[1] - b[1], a[0] - b[0]) * 180) / Math.PI;
/** An angle between −180° and 180°. */
export function normal(x) {
  let v = ((((x + 180) % 360) + 360) % 360) - 180;
  if (Math.abs(v + 180) < 1e-9) v = 180;
  return v;
}

const fallo = (campo, texto) => ({ error: { campo, texto } });

function leerPolinomio(texto, campo, nombre) {
  if (!String(texto ?? '').trim()) return fallo(campo, `Falta ${nombre}.`);
  const r = intentar(texto, ['s']);
  if (r.error) return fallo(campo, r.error);
  const c = coeficientes(r.nodo);
  if (!c) return fallo(campo, `${nombre} tiene que ser un polinomio en s, como s^2 + 3s o s(s + 1).`);
  return { nodo: r.nodo, c: limpio(c) };
}

/**
 * d: { N, D, k }. Gives { error: { campo, texto } } or every rule with its numbers, the stable ranges and the closed-loop
 * poles for k.
 */
export function lgr(d) {
  const N = leerPolinomio(d.N, 'N', 'N(s)');
  if (N.error) return N;
  const D = leerPolinomio(d.D, 'D', 'D(s)');
  if (D.error) return D;
  if (N.c.every((c) => c === 0)) return fallo('N', 'N(s) no puede ser 0.');
  const n = grado(D.c);
  const m = grado(N.c);
  if (n < 1) return fallo('D', 'D(s) tiene que tener s. Sin polos no hay lugar de las raíces.');
  if (m > n) return fallo('N', 'N(s) tiene más grado que D(s). Hay más ceros que polos.');
  const kTexto = String(d.k ?? '').trim();
  let k = null;
  if (kTexto) {
    const r = leerNumero(kTexto, 'k');
    if (r.error) return fallo('k', r.error);
    if (r.v < 0) return fallo('k', 'k va de 0 en adelante.');
    if (r.v > 1e9) return fallo('k', 'k va hasta 1000000000.');
    k = r.v;
  }

  const polos = ordenar(raices(D.c).map(prolijo));
  const ceros = ordenar(raices(N.c).map(prolijo));
  const caracteristica = (kk) => sumar(D.c, escalar(N.c, kk));

  // Rule 5: a stretch of the real axis belongs when it has an odd number of real poles and zeros to its right.
  const marcas = [...polos, ...ceros].filter((z) => z[1] === 0).map((z) => z[0]);
  const unicos = [...new Set(marcas.map((x) => Math.round(x * 1e9) / 1e9))].sort((a, b) => b - a);
  const tramos = [];
  unicos.forEach((x, i) => {
    const derecha = marcas.filter((v) => v > x - 1e-9).length;
    if (derecha % 2 === 1) tramos.push([unicos[i + 1] ?? -Infinity, x]);
  });

  // Rules 6 and 7: asymptotes and centroid.
  const sumaRe = (zs) => zs.reduce((s, z) => s + z[0], 0);
  const asintotas =
    n > m
      ? {
          q: Array.from({ length: n - m }, (_, i) => 2 * i + 1),
          angulos: Array.from({ length: n - m }, (_, i) => (180 * (2 * i + 1)) / (n - m)),
          sumaPolos: sumaRe(polos),
          sumaCeros: sumaRe(ceros),
          centroide: (sumaRe(polos) - sumaRe(ceros)) / (n - m),
        }
      : null;

  // Rule 8: s = iω in D(s) + k·N(s) = 0. The real and the imaginary parts both vanish; without k, ω comes out.
  const partes = (a) => {
    const re = a.map((c, i) => c * [1, 0, -1, 0][i % 4]);
    const im = a.map((c, i) => c * [0, 1, 0, -1][i % 4]);
    return [limpio(re), limpio(im)];
  };
  const [Dr, Di] = partes(D.c);
  const [Nr, Ni] = partes(N.c);
  const sinK = sumar(multiplicar(Dr, Ni), escalar(multiplicar(Di, Nr), -1));
  const cruces = [];
  if (grado(sinK) >= 1) {
    for (const w of raices(sinK).map(prolijo)) {
      if (w[1] !== 0 || w[0] < -1e-9) continue;
      const om = Math.max(0, w[0]);
      const nn = evaluar(N.c, [0, om]);
      const dd = evaluar(D.c, [0, om]);
      const den = nn[0] * nn[0] + nn[1] * nn[1];
      if (den < 1e-18) continue;
      const kc = -(dd[0] * nn[0] + dd[1] * nn[1]) / den;
      if (kc > 1e-9 && !cruces.some((c) => Math.abs(c.omega - om) < 1e-6)) cruces.push({ omega: om, k: kc });
    }
  }
  cruces.sort((a, b) => a.k - b.k);

  // Rule 9: k = −D(s)/N(s) and dk/ds = 0, that is D'(s)·N(s) − D(s)·N'(s) = 0, at real points with k > 0.
  const dkds = sumar(multiplicar(derivada(D.c), N.c), escalar(multiplicar(D.c, derivada(N.c)), -1));
  const candidatos = grado(dkds) >= 1 ? ordenar(raices(dkds).map(prolijo)) : [];
  const quiebres = candidatos.map((s) => {
    if (s[1] !== 0) return { s, tipo: 'compleja' };
    const nn = evaluar(N.c, s)[0];
    if (Math.abs(nn) < 1e-12) return { s, tipo: 'cero' };
    const kk = -evaluar(D.c, s)[0] / nn;
    return { s, k: kk, tipo: kk > 1e-9 ? 'si' : 'negativa' };
  });

  // Rule 10: departure from a complex pole and arrival at a complex zero, by the angle condition.
  const salidas = [];
  polos.forEach((p, i) => {
    if (p[1] <= 0) return;
    const otros = polos.filter((_, j) => j !== i).map((q) => ({ desde: q, angulo: angulo(p, q) }));
    const deCeros = ceros.map((z) => ({ desde: z, angulo: angulo(p, z) }));
    const suma = otros.reduce((s, o) => s + o.angulo, 0);
    const sumaZ = deCeros.reduce((s, o) => s + o.angulo, 0);
    salidas.push({ tipo: 'salida', en: p, otros, deCeros, angulo: normal(180 - suma + sumaZ) });
  });
  ceros.forEach((z, i) => {
    if (z[1] <= 0) return;
    const otros = ceros.filter((_, j) => j !== i).map((q) => ({ desde: q, angulo: angulo(z, q) }));
    const dePolos = polos.map((p) => ({ desde: p, angulo: angulo(z, p) }));
    const suma = otros.reduce((s, o) => s + o.angulo, 0);
    const sumaP = dePolos.reduce((s, o) => s + o.angulo, 0);
    salidas.push({ tipo: 'llegada', en: z, otros, dePolos, angulo: normal(180 - suma + sumaP) });
  });

  // The range of k > 0 with every closed-loop pole on the left: the stretches between the k of the crossings.
  const estable = (kk) => raices(caracteristica(kk)).every((z) => z[0] < -1e-9);
  const cortes = [0, ...new Set(cruces.map((c) => c.k))];
  const estables = [];
  cortes.forEach((a, i) => {
    const b = cortes[i + 1];
    const prueba = b === undefined ? a * 1.5 + 1 : (a + b) / 2;
    if (estable(prueba)) {
      const ultimo = estables[estables.length - 1];
      if (ultimo && ultimo[1] === a) ultimo[1] = b ?? null;
      else estables.push([a, b ?? null]);
    }
  });

  const conK = k === null ? null : { k, ecuacion: caracteristica(k), polos: ordenar(raices(caracteristica(k)).map(prolijo)) };
  if (conK) conK.estable = conK.polos.every((z) => z[0] < -1e-9);

  return { N, D, n, m, polos, ceros, tramos, asintotas, partes: { Dr, Di, Nr, Ni }, sinK, cruces, dkds, quiebres, salidas, estables, conK, caracteristica };
}

/**
 * The branches for the drawing: the closed-loop poles from k = 0 up, each from the previous ones, until all leave the
 * window [x0, x1] × [y0, y1] (or k gets huge).
 */
export function ramas(r, [x0, x1], [y0, y1]) {
  const lineas = r.polos.map((p) => [p]);
  let previas = r.polos;
  const escala = Math.max(1, ...r.polos.map((p) => Math.hypot(...p)), ...r.ceros.map((z) => Math.hypot(...z)));
  const afuera = (z) => z[0] < x0 - (x1 - x0) || z[0] > x1 + (x1 - x0) || Math.abs(z[1]) > Math.max(Math.abs(y0), Math.abs(y1)) * 3;
  for (let j = 0; j <= 900; j += 1) {
    const kk = 1e-4 * escala * 1.03 ** j;
    const c = r.caracteristica(kk);
    if (grado(c) !== r.n) continue;
    previas = raices(c, previas, 60);
    previas.forEach((z, i) => lineas[i].push(z));
    if (previas.every(afuera) || kk > 1e9) break;
  }
  return lineas;
}
