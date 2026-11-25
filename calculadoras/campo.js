// Campo vectorial, of Análisis Matemático II: F = P i + Q j (+ R k), whether it is conservative by the crossed
// derivatives and the domain, its potential function as the notes find it, the work between two points, and the
// divergence and the rotor at a point. Definitions, conditions, method and examples: El Santo Resumen
// (course notes «7A», «7D» and «7F»; versión por unidad «18» and «19»).
import { leerNumero } from '../formulas/decimales.js';
import { compilar, derivar, intentar, N, simplificar, usa } from '../formulas/formula.js';

export const VARIABLES = ['x', 'y', 'z'];
const NOMBRES = ['P', 'Q', 'R'];

// ---------- Polynomials: a Map from 'i,j,k' (the powers of x, y and z) to the coefficient ----------
const CERO = 1e-12;
const potencias = (k) => k.split(',').map(Number);

function sumar(a, b, signo = 1) {
  const r = new Map(a);
  for (const [k, c] of b) {
    const v = (r.get(k) ?? 0) + signo * c;
    if (Math.abs(v) < CERO) r.delete(k);
    else r.set(k, v);
  }
  return r;
}

function multiplicar(a, b) {
  let r = new Map();
  for (const [ka, ca] of a) {
    const ea = potencias(ka);
    for (const [kb, cb] of b) {
      const eb = potencias(kb);
      r = sumar(r, new Map([[ea.map((v, i) => v + eb[i]).join(','), ca * cb]]));
    }
  }
  return r;
}

const constante = (c) => (Math.abs(c) < CERO ? new Map() : new Map([['0,0,0', c]]));
const escalar = (p, c) => new Map([...p].map(([k, v]) => [k, v * c]).filter(([, v]) => Math.abs(v) >= CERO));
const valorFijo = (p) => (p.size === 0 ? 0 : p.size === 1 && p.has('0,0,0') ? p.get('0,0,0') : null);

/** The formula as a polynomial in x, y and z, or null when it isn't one (a quotient by x, a sen(x), a power of x). */
export function polinomio(n) {
  switch (n.t) {
    case 'n':
      return constante(n.v);
    case 'c':
      return constante(n.n === 'pi' ? Math.PI : Math.E);
    case 'v': {
      const e = [0, 0, 0];
      e[VARIABLES.indexOf(n.n)] = 1;
      return new Map([[e.join(','), 1]]);
    }
    case 'neg': {
      const a = polinomio(n.a);
      return a && escalar(a, -1);
    }
    case '+':
    case '-': {
      const a = polinomio(n.a);
      const b = polinomio(n.b);
      return a && b && sumar(a, b, n.t === '+' ? 1 : -1);
    }
    case '*': {
      const a = polinomio(n.a);
      const b = polinomio(n.b);
      return a && b && multiplicar(a, b);
    }
    case '/': {
      const a = polinomio(n.a);
      const b = polinomio(n.b);
      const v = b && valorFijo(b);
      return a && v ? escalar(a, 1 / v) : null;
    }
    case '^': {
      const a = polinomio(n.a);
      const b = polinomio(n.b);
      const v = b && valorFijo(b);
      if (!a || v === null || !Number.isInteger(v) || v < 0 || v > 12) return null;
      let r = constante(1);
      for (let i = 0; i < v; i += 1) r = multiplicar(r, a);
      return r;
    }
    case 'f': {
      if (VARIABLES.some((x) => usa(n.a, x))) return null;
      const v = compilar(n, [])();
      return Number.isFinite(v) ? constante(v) : null;
    }
    default:
      return null;
  }
}

/** ∫ p d(variable i), without the constant. */
function integrar(p, i) {
  const r = new Map();
  for (const [k, c] of p) {
    const e = potencias(k);
    e[i] += 1;
    r.set(e.join(','), c / e[i]);
  }
  return r;
}

/** ∂p/∂(variable i). */
function derivarPol(p, i) {
  let r = new Map();
  for (const [k, c] of p) {
    const e = potencias(k);
    if (e[i] === 0) continue;
    const m = e[i];
    e[i] -= 1;
    r = sumar(r, new Map([[e.join(','), c * m]]));
  }
  return r;
}

const dependeDe = (p, i) => [...p.keys()].some((k) => potencias(k)[i] > 0);

// ---------- A polynomial back to a formula, with the fractions as the notes write them: ½x² + x²y − y³ ----------
const VULGARES = { '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘', '1/6': '⅙', '5/6': '⅚', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞' };

function numeroDe(c) {
  for (let q = 1; q <= 12; q += 1) {
    const p = Math.round(c * q);
    if (Math.abs(c * q - p) > 1e-9 * Math.max(1, Math.abs(c * q))) continue;
    if (q === 1) return { t: 'n', v: c };
    const vulgar = VULGARES[`${p}/${q}`];
    return { t: 'n', v: c, texto: vulgar ?? `(${p}/${q})` };
  }
  return { t: 'n', v: c };
}

const V = (n) => ({ t: 'v', n });
const OP = (t, a, b) => ({ t, a, b });

function monomio(k, c) {
  const e = potencias(k);
  const letras = e.flatMap((m, i) => (m === 0 ? [] : [m === 1 ? V(VARIABLES[i]) : OP('^', V(VARIABLES[i]), N(m))]));
  const lista = Math.abs(c - 1) < 1e-12 && letras.length ? letras : [numeroDe(c), ...letras];
  return lista.reduce((a, b) => OP('*', a, b));
}

/** The order of the notes: the higher powers of x first, and in a tie the lower powers of y. */
function orden(a, b) {
  const ea = potencias(a);
  const eb = potencias(b);
  return eb[0] - ea[0] || ea[1] - eb[1] || ea[2] - eb[2];
}

export function nodoDe(p) {
  const claves = [...p.keys()].sort(orden);
  if (!claves.length) return N(0);
  return claves.reduce((suma, k, i) => {
    const c = p.get(k);
    const termino = monomio(k, Math.abs(c));
    if (i === 0) return c < 0 ? { t: 'neg', a: termino } : termino;
    return OP(c < 0 ? '-' : '+', suma, termino);
  }, null);
}

// ---------- Reading ----------
/** «1; 2» or «1; 2; 0»: a point. Gives { v } or { error }. */
export function leerPunto(texto, cuantas, nombre) {
  const t = String(texto ?? '').trim();
  if (!t) return { error: `Falta ${nombre}.` };
  let partes = t.includes(';') ? t.split(';') : t.split(/,\s+/);
  if (partes.length === 1 && (t.match(/,/g) ?? []).length === cuantas - 1) partes = t.split(',');
  if (partes.length !== cuantas) {
    const como = cuantas === 2 ? 'x e y, como 1; 2' : 'x, y, z, como 1; 2; 0';
    const texto = `${nombre} lleva ${como}. Van separadas por punto y coma.`;
    return { error: texto[0].toUpperCase() + texto.slice(1) };
  }
  const v = [];
  for (const [i, parte] of partes.entries()) {
    const r = leerNumero(parte, `la ${VARIABLES[i]} de ${nombre}`);
    if (r.error) return { error: r.error[0].toUpperCase() + r.error.slice(1) };
    v.push(r.v);
  }
  return { v };
}

const fallo = (campo, texto) => ({ error: { campo, texto } });

// ---------- The domain ----------
const FUERA_DE_R = new Set(['ln', 'log', 'raiz', 'tg', 'arcsen', 'arccos']);
const conVariables = (n) => VARIABLES.some((x) => usa(n, x));

/** Whether the formula may be undefined somewhere: a quotient by the variables, a ln, a root, a tangent. */
function puedeFaltar(n) {
  switch (n.t) {
    case '/':
      return conVariables(n.b) || puedeFaltar(n.a) || puedeFaltar(n.b);
    case 'f':
      return (FUERA_DE_R.has(n.n) && conVariables(n.a)) || puedeFaltar(n.a);
    case '^': {
      const b = polinomio(n.b);
      const v = b && valorFijo(b);
      const entero = v !== null && Number.isInteger(v) && v >= 0;
      return (conVariables(n.a) && !entero) || puedeFaltar(n.a) || puedeFaltar(n.b);
    }
    case 'neg':
      return puedeFaltar(n.a);
    case '+':
    case '-':
    case '*':
      return puedeFaltar(n.a) || puedeFaltar(n.b);
    default:
      return false;
  }
}

/** Points of the window where F isn't defined but is defined all around: holes, as the origin of (−y i + x j)/(x² + y²). */
function huecos(definido, R, z) {
  const encontrados = [];
  const tope = Math.floor(R);
  for (let i = -tope; i <= tope && encontrados.length < 3; i += 1) {
    for (let j = -tope; j <= tope && encontrados.length < 3; j += 1) {
      if (definido(i, j, z)) continue;
      const h = 1e-3;
      const alrededor = [[h, 0], [-h, 0], [0, h], [0, -h], [h, h], [-h, -h], [h, -h], [-h, h]];
      if (alrededor.every(([dx, dy]) => definido(i + dx, j + dy, z))) encontrados.push([i, j]);
    }
  }
  return encontrados;
}

// ---------- The field ----------
// The crossed derivatives that have to match: P_y = Q_x, and in three variables also P_z = R_x and Q_z = R_y («7D», p. 5).
const CRUZADAS = [
  [0, 1, 1, 0],
  [0, 2, 2, 0],
  [1, 2, 2, 1],
];

/**
 * d: { P, Q, R (empty in the plane), punto: «1; 1», A, B (optional) }. Gives { error: { campo, texto } } or the whole
 * resolution.
 */
export function campo(d) {
  const tres = String(d.R ?? '').trim() !== '';
  const cuantas = tres ? 3 : 2;
  const vars = VARIABLES.slice(0, cuantas);
  const nodos = [];
  for (let i = 0; i < cuantas; i += 1) {
    const nombre = NOMBRES[i];
    if (!String(d[nombre] ?? '').trim()) return fallo(nombre, `Falta ${nombre}.`);
    const r = intentar(d[nombre], VARIABLES);
    if (r.error) return fallo(nombre, r.error);
    if (!tres && usa(r.nodo, 'z')) return fallo(nombre, 'En el plano el campo va con x e y. Para usar z, escribí R.');
    nodos.push(r.nodo);
  }
  const punto = leerPunto(d.punto, cuantas, 'el punto');
  if (punto.error) return fallo('punto', punto.error);
  const conTrabajo = String(d.A ?? '').trim() !== '' || String(d.B ?? '').trim() !== '';
  let A = null;
  let B = null;
  if (conTrabajo) {
    const a = leerPunto(d.A, cuantas, 'A');
    if (a.error) return fallo('A', a.error);
    const b = leerPunto(d.B, cuantas, 'B');
    if (b.error) return fallo('B', b.error);
    A = a.v;
    B = b.v;
  }

  const f = nodos.map((n) => compilar(n, VARIABLES));
  const valorEn = (x, y, z = 0) => f.map((g) => g(x, y, z));
  const definido = (x, y, z = 0) => valorEn(x, y, z).every(Number.isFinite);

  // Every partial derivative, by the rules: parcial[i][j] = ∂(component i)/∂(variable j).
  const parcial = nodos.map((n) => vars.map((x) => derivar(n, x)));
  const [a, b, c = 0] = punto.v;
  const R = Math.max(2.4, Math.ceil(1.25 * Math.max(Math.abs(a), Math.abs(b))));

  // Whether two derivatives match: the same after simplifying, or the same number all over the window (the rules
  // don't always write two equal quotients the same way).
  const muestras = [];
  for (let i = 0; i < 7; i += 1) {
    for (let j = 0; j < 7; j += 1) {
      for (let k = 0; k < (tres ? 3 : 1); k += 1) {
        muestras.push([-R + ((2 * R) * (i + 0.37)) / 7, -R + ((2 * R) * (j + 0.41)) / 7, tres ? -R + ((2 * R) * (k + 0.29)) / 3 : 0]);
      }
    }
  }
  const coinciden = (u, v) => {
    const resta = simplificar(OP('-', u, v));
    if (resta.t === 'n' && resta.v === 0) return true;
    const gu = compilar(u, VARIABLES);
    const gv = compilar(v, VARIABLES);
    let vistas = 0;
    for (const m of muestras) {
      const x = gu(...m);
      const y = gv(...m);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      vistas += 1;
      if (Math.abs(x - y) > 1e-7 * Math.max(1, Math.abs(x), Math.abs(y))) return false;
    }
    return vistas > 0;
  };
  const cruzadas = CRUZADAS.slice(0, tres ? 3 : 1).map(([i, xi, j, xj]) => {
    const u = parcial[i][xi];
    const v = parcial[j][xj];
    return { i, xi, j, xj, u, v, iguales: coinciden(u, v) };
  });
  const igualan = cruzadas.every((k) => k.iguales);

  // Where they don't match: at the point if they differ there, or at the first place of the window where they do.
  let distintoEn = null;
  if (!igualan) {
    const mal = cruzadas.find((k) => !k.iguales);
    const gu = compilar(mal.u, VARIABLES);
    const gv = compilar(mal.v, VARIABLES);
    const lejos = (m) => Math.abs(gu(...m) - gv(...m)) > 1e-7 * Math.max(1, Math.abs(gu(...m)));
    const aca = [a, b, c];
    distintoEn = lejos(aca) ? aca : muestras.find(lejos) ?? null;
  }

  const restringido = nodos.some(puedeFaltar);
  const agujeros = restringido && !tres ? huecos(definido, R, 0) : [];
  const faltaEnVentana = restringido && muestras.some((m) => !definido(...m));
  let veredicto;
  if (!igualan) veredicto = 'no';
  else if (!restringido) veredicto = 'si';
  else if (agujeros.length) veredicto = 'hueco';
  else veredicto = 'dominio';

  // The potential function, as «7D» finds it: integrate P with respect to x, derive with respect to y, match Q, and the
  // same with z in three variables. Only for polynomials: the rest is by hand.
  let potencial = null;
  const pols = nodos.map(polinomio);
  if (veredicto === 'si' && pols.every(Boolean)) {
    const f1 = integrar(pols[0], 0);
    const f1y = derivarPol(f1, 1);
    const phiPrima = sumar(pols[1], f1y, -1);
    const phi = integrar(phiPrima, 1);
    const pasos = { f1, f1y, phiPrima, phi };
    let f = sumar(f1, phi);
    if (tres) {
      const fz = derivarPol(f, 2);
      const psiPrima = sumar(pols[2], fz, -1);
      const psi = integrar(psiPrima, 2);
      Object.assign(pasos, { fz, psiPrima, psi });
      f = sumar(f, psi);
    }
    const g = compilar(nodoDe(f), VARIABLES);
    potencial = {
      f1: nodoDe(f1),
      f1y: nodoDe(f1y),
      phiPrima: nodoDe(phiPrima),
      phi: nodoDe(phi),
      ...(tres && { fz: nodoDe(pasos.fz), psiPrima: nodoDe(pasos.psiPrima), psi: nodoDe(pasos.psi) }),
      // φ' depends only on y (and ψ' only on z): if not, the field wasn't conservative after all.
      limpio: !dependeDe(phiPrima, 0) && (!tres || (!dependeDe(pasos.psiPrima, 0) && !dependeDe(pasos.psiPrima, 1))),
      nodo: nodoDe(f),
      en: (p) => g(...p, 0),
    };
  }

  let trabajo = null;
  if (conTrabajo) {
    if (potencial) {
      const fA = potencial.en(A);
      const fB = potencial.en(B);
      trabajo = { A, B, fA, fB, W: fB - fA };
    } else {
      trabajo = { A, B, W: null };
    }
  }

  // At the point: F, its module, the divergence and the rotor («7F»; in the plane, with R = 0).
  const enPunto = valorEn(a, b, c);
  const derivadasEn = parcial.map((fila) => fila.map((n) => compilar(n, VARIABLES)(a, b, c)));
  const D = (i, j) => (j < cuantas && i < cuantas ? derivadasEn[i][j] : 0);
  const divergencia = D(0, 0) + D(1, 1) + (tres ? D(2, 2) : 0);
  const rotor = [D(2, 1) - D(1, 2), D(0, 2) - D(2, 0), D(1, 0) - D(0, 1)];
  // A sum that is 0 everywhere but the rules don't cancel (2yx/(x² + y²)² − 2xy/(x² + y²)²) is written 0.
  const cero = (n) => (coinciden(n, N(0)) ? N(0) : n);
  const nodoDiv = cero(simplificar(vars.map((x, i) => parcial[i][i]).reduce((u, v) => OP('+', u, v))));
  const nodoRot = tres
    ? [OP('-', parcial[2][1], parcial[1][2]), OP('-', parcial[0][2], parcial[2][0]), OP('-', parcial[1][0], parcial[0][1])].map((n) => cero(simplificar(n)))
    : [N(0), N(0), cero(simplificar(OP('-', parcial[1][0], parcial[0][1])))];

  return {
    tres,
    cuantas,
    nodos,
    f,
    valorEn,
    definido,
    parcial,
    cruzadas,
    igualan,
    distintoEn,
    restringido,
    agujeros,
    faltaEnVentana,
    veredicto,
    potencial,
    trabajo,
    R,
    punto: {
      v: punto.v,
      F: enPunto,
      definido: enPunto.every(Number.isFinite),
      modulo: Math.hypot(...enPunto),
      parciales: derivadasEn,
      divergencia,
      rotor,
    },
    nodoDiv,
    nodoRot,
  };
}
