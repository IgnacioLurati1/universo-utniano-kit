// Formulas written as in class («e^(-x) - x», «2xy^3», «sen(x)/x», «4e^(0,8x) - 0,5y»): read into a tree, never into
// code (no eval, so it works under a strict CSP too), then evaluated, derived by the rules and written back with the course's notation. The
// reading is El Santo Resumen's (its expression reader), with what a student types on a phone: the decimal comma,
// multiplication without a sign (2x, 3(x + 1), xy), sen and tg, −, ·, π, √, ² and ³.

const MAX_LARGO = 300;
const MAX_PROFUNDIDAD = 40;

export class ErrorFormula extends Error {}
const falla = (m) => {
  throw new ErrorFormula(m);
};

// The course's names. Each one with its value and, for the reader, how it's said.
const FUNCIONES = {
  sen: Math.sin,
  cos: Math.cos,
  tg: Math.tan,
  arcsen: Math.asin,
  arccos: Math.acos,
  arctg: Math.atan,
  senh: Math.sinh,
  cosh: Math.cosh,
  tgh: Math.tanh,
  raiz: Math.sqrt,
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  abs: Math.abs,
};
const OTROS_NOMBRES = {
  sin: 'sen',
  tan: 'tg',
  asin: 'arcsen',
  arcsin: 'arcsen',
  acos: 'arccos',
  atan: 'arctg',
  arctan: 'arctg',
  sinh: 'senh',
  tanh: 'tgh',
  sqrt: 'raiz',
  log10: 'log',
};
const CONSTANTES = { pi: Math.PI, e: Math.E };

// ---------- Nodes ----------
export const N = (v) => (v < 0 ? { t: 'neg', a: { t: 'n', v: -v } } : { t: 'n', v: v === 0 ? 0 : v });
const V = (n) => ({ t: 'v', n });
const C = (n) => ({ t: 'c', n });
const NEG = (a) => ({ t: 'neg', a });
const OP = (t, a, b) => ({ t, a, b });
const F = (n, a) => ({ t: 'f', n, a });

// ---------- Reading ----------
function preparar(texto) {
  let t = String(texto ?? '')
    .replace(/[−–—]/g, '-')
    .replace(/[·×∙⋅]/g, '*')
    .replace(/÷/g, '/')
    .replace(/π/g, ' pi ')
    .replace(/√/g, 'raiz')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/\*\*/g, '^');
  // The decimal comma, between digits. Any other comma is a mistake.
  t = t.replace(/(\d),(\d)/g, '$1.$2');
  return t;
}

function fichas(t) {
  const out = [];
  let i = 0;
  while (i < t.length) {
    const c = t[i];
    if (/\s/.test(c)) {
      i += 1;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)/.exec(t.slice(i, i + 40));
    if (num) {
      if (/\.\d*\./.test(t.slice(i, i + num[0].length + 1))) falla('Un número tiene dos comas.');
      out.push({ t: 'num', v: Number(num[0]), x: num[0].replace('.', ',') });
      i += num[0].length;
      continue;
    }
    const id = /^[A-Za-zñÑ]+/.exec(t.slice(i, i + 40));
    if (id) {
      out.push({ t: 'id', x: id[0] });
      i += id[0].length;
      continue;
    }
    if ('+-*/^()'.includes(c)) {
      out.push({ t: 'op', x: c });
      i += 1;
      continue;
    }
    if (c === ',' || c === ';') falla('Sobra una coma. La coma va solo entre las cifras de un número, como 0,5.');
    if (c === '=') falla('Va solo lo que está a la derecha del =.');
    if (c === '[' || c === '{') falla('Usá paréntesis comunes.');
    falla(`No entiendo «${c}».`);
  }
  return out;
}

/**
 * Reads a formula in the given variables (one letter each). Gives its tree, or throws ErrorFormula with what's wrong,
 * said for a person.
 */
export function leer(texto, variables = ['x']) {
  const t = preparar(texto);
  if (!t.trim()) falla('Falta la fórmula.');
  if (t.length > MAX_LARGO) falla('La fórmula es demasiado larga.');
  const validas = new Set(variables);
  const conocido = (x) => FUNCIONES[OTROS_NOMBRES[x.toLowerCase()] ?? x.toLowerCase()] || validas.has(x) || x === 'pi';
  // «xy», «xyz», «xe»: letters of variables written together are a product, as on paper, and the power goes with the
  // last one (2xy^3 is 2·x·y³).
  const lista = fichas(t).flatMap((f) =>
    f.t === 'id' && !conocido(f.x) && f.x.length > 1 && [...f.x].every((l) => validas.has(l) || l === 'e') ? [...f.x].map((l) => ({ t: 'id', x: l })) : [f],
  );
  let p = 0;
  let prof = 0;
  const ver = () => lista[p];
  const esOp = (x) => ver()?.t === 'op' && ver().x === x;
  const hondo = (fn) => {
    prof += 1;
    if (prof > MAX_PROFUNDIDAD) falla('La fórmula tiene demasiados paréntesis uno dentro de otro.');
    const r = fn();
    prof -= 1;
    return r;
  };
  const cualesVan = () => {
    if (variables.length === 0) return 'Acá va solo un número.';
    if (variables.length === 1) return `Acá la variable es ${variables[0]}.`;
    if (variables.length === 2) return `Acá las variables son ${variables[0]} e ${variables[1]}.`;
    return `Acá las variables son ${variables.join(', ')}.`;
  };

  const nombre = (x) => {
    const fn = OTROS_NOMBRES[x.toLowerCase()] ?? x.toLowerCase();
    if (FUNCIONES[fn]) {
      if (!esOp('(')) falla(`${fn} lleva paréntesis, como ${fn}(${variables[0]}).`);
      p += 1;
      const dentro = hondo(suma);
      if (!esOp(')')) falla(`Falta cerrar el paréntesis de ${fn}.`);
      p += 1;
      return F(fn, dentro);
    }
    if (validas.has(x)) return V(x);
    if (x === 'pi') return C('pi');
    if (x === 'e' && !validas.has('e')) return C('e');
    const fn2 = Object.keys(FUNCIONES).find((f) => x.toLowerCase().startsWith(f) && x.length > f.length);
    if (fn2) falla(`Después de ${fn2} va un paréntesis, como ${fn2}(${x.slice(fn2.length)}).`);
    return falla(`No conozco «${x}». ${cualesVan()}`);
  };

  const atomo = () => {
    const f = ver();
    if (!f) falla('La fórmula termina antes de tiempo.');
    if (f.t === 'num') {
      p += 1;
      return N(f.v);
    }
    if (f.t === 'id') {
      p += 1;
      return nombre(f.x);
    }
    if (f.x === '(') {
      p += 1;
      const dentro = hondo(suma);
      if (!esOp(')')) falla('Falta cerrar un paréntesis.');
      p += 1;
      return dentro;
    }
    if (f.x === ')') falla('Sobra un paréntesis que cierra.');
    return falla(`Falta algo antes de «${f.x}».`);
  };

  const potencia = () => {
    const base = atomo();
    if (!esOp('^')) return base;
    p += 1;
    return OP('^', base, hondo(unario));
  };

  function unario() {
    if (esOp('-')) {
      p += 1;
      return NEG(hondo(unario));
    }
    if (esOp('+')) {
      p += 1;
      return hondo(unario);
    }
    return potencia();
  }

  const empiezaFactor = (f) => f && (f.t === 'num' || f.t === 'id' || f.x === '(');
  const producto = () => {
    let a = unario();
    for (;;) {
      const f = ver();
      if (f?.t === 'op' && (f.x === '*' || f.x === '/')) {
        p += 1;
        const b = unario();
        a = OP(f.x, a, b);
      } else if (empiezaFactor(f)) {
        if (f.t === 'num' && lista[p - 1]?.t === 'num') falla('Falta un signo entre dos números.');
        a = OP('*', a, potencia());
      } else return a;
    }
  };

  function suma() {
    let a = producto();
    while (esOp('+') || esOp('-')) {
      const x = ver().x;
      p += 1;
      a = OP(x, a, producto());
    }
    return a;
  }

  const arbol = suma();
  if (p < lista.length) {
    const f = ver();
    if (f.x === ')') falla('Sobra un paréntesis que cierra.');
    falla(`No entiendo lo que sigue desde «${f.x}».`);
  }
  return arbol;
}

/** The same, without throwing: { nodo } or { error }. */
export function intentar(texto, variables) {
  try {
    return { nodo: leer(texto, variables) };
  } catch (e) {
    if (e instanceof ErrorFormula) return { error: e.message };
    throw e;
  }
}

// ---------- Evaluating ----------
/** A function of plain numbers, in the order of `variables`. Out of its domain it gives NaN, never throws. */
export function compilar(nodo, variables = ['x']) {
  const ir = (n) => {
    switch (n.t) {
      case 'n': {
        const v = n.v;
        return () => v;
      }
      case 'c': {
        const v = CONSTANTES[n.n];
        return () => v;
      }
      case 'v': {
        const i = variables.indexOf(n.n);
        return (a) => a[i];
      }
      case 'neg': {
        const a = ir(n.a);
        return (s) => -a(s);
      }
      case 'f': {
        const a = ir(n.a);
        const fn = FUNCIONES[n.n];
        return (s) => fn(a(s));
      }
      default: {
        const a = ir(n.a);
        const b = ir(n.b);
        if (n.t === '+') return (s) => a(s) + b(s);
        if (n.t === '-') return (s) => a(s) - b(s);
        if (n.t === '*') return (s) => a(s) * b(s);
        if (n.t === '/') return (s) => a(s) / b(s);
        return (s) => potenciaReal(a(s), b(s));
      }
    }
  };
  const raiz = ir(nodo);
  return (...valores) => {
    const v = raiz(valores);
    return Number.isFinite(v) ? v : NaN;
  };
}

/** x^y, also with a negative base and an odd root: (−8)^(1/3) = −2, as on paper. */
function potenciaReal(x, y) {
  const r = Math.pow(x, y);
  if (!Number.isNaN(r) || x >= 0) return r;
  for (const q of [3, 5, 7, 9]) {
    const pq = Math.round(y * q);
    if (Math.abs(y * q - pq) < 1e-12) return (pq % 2 ? -1 : 1) * Math.pow(-x, y);
  }
  return NaN;
}

/** Whether the variable appears in the tree. */
export const usa = (n, x) => {
  if (n.t === 'v') return n.n === x;
  if (n.t === 'n' || n.t === 'c') return false;
  return usa(n.a, x) || (n.b ? usa(n.b, x) : false);
};

// ---------- Simplifying ----------
const valor = (n) => (n.t === 'n' ? n.v : n.t === 'neg' && n.a.t === 'n' ? -n.a.v : null);
const clave = (n) => {
  switch (n.t) {
    case 'n':
      return String(n.v);
    case 'v':
    case 'c':
      return n.n;
    case 'neg':
      return `-(${clave(n.a)})`;
    case 'f':
      return `${n.n}(${clave(n.a)})`;
    default:
      return `(${clave(n.a)}${n.t}${clave(n.b)})`;
  }
};
export const iguales = (a, b) => clave(a) === clave(b);

/** A quotient that is worth writing as a decimal: it ends within six decimals. */
const decimalCorto = (v) => Number.isFinite(v) && Math.abs(v * 1e6 - Math.round(v * 1e6)) < 1e-6;

/** Factors of a product: a number in front and the rest, each with its exponent. */
function factores(n, signo = 1) {
  if (n.t === '*') {
    const a = factores(n.a);
    const b = factores(n.b);
    return { k: signo * a.k * b.k, lista: [...a.lista, ...b.lista] };
  }
  if (n.t === 'neg') return factores(n.a, -signo);
  const v = valor(n);
  if (v !== null) return { k: signo * v, lista: [] };
  if (n.t === '^' && valor(n.b) !== null) return { k: signo, lista: [{ base: n.a, exp: valor(n.b) }] };
  return { k: signo, lista: [{ base: n, exp: 1 }] };
}

function armarProducto(k, lista) {
  // Equal bases join: x·x² = x³.
  const juntos = [];
  for (const f of lista) {
    const igual = juntos.find((g) => iguales(g.base, f.base));
    if (igual) igual.exp += f.exp;
    else juntos.push({ ...f });
  }
  const restos = juntos.filter((f) => Math.abs(f.exp) > 1e-12).map((f) => (f.exp === 1 ? f.base : OP('^', f.base, N(f.exp))));
  if (k === 0) return N(0);
  if (!restos.length) return N(k);
  const cuerpo = restos.reduce((a, b) => OP('*', a, b));
  if (k === 1) return cuerpo;
  if (k === -1) return NEG(cuerpo);
  return k < 0 ? NEG(OP('*', N(-k), cuerpo)) : OP('*', N(k), cuerpo);
}

/** Terms of a sum, each as a number times a rest. */
function terminos(n, signo = 1) {
  if (n.t === '+') return [...terminos(n.a, signo), ...terminos(n.b, signo)];
  if (n.t === '-') return [...terminos(n.a, signo), ...terminos(n.b, -signo)];
  if (n.t === 'neg') return terminos(n.a, -signo);
  const { k, lista } = factores(n);
  return [{ k: signo * k, lista, resto: lista.length ? armarProducto(1, lista) : null }];
}

function armarSuma(lista) {
  const juntos = [];
  let numero = 0;
  for (const t of lista) {
    if (!t.resto) {
      numero += t.k;
      continue;
    }
    const igual = juntos.find((u) => iguales(u.resto, t.resto));
    if (igual) igual.k += t.k;
    else juntos.push({ ...t });
  }
  const quedan = juntos.filter((t) => Math.abs(t.k) > 1e-12);
  if (Math.abs(numero) > 1e-12) quedan.push({ k: numero, resto: null });
  if (!quedan.length) return N(0);
  const comoNodo = (t) => (t.resto ? armarProducto(t.k, t.lista) : N(t.k));
  const [primero, ...resto] = quedan;
  let r = comoNodo(primero);
  for (const t of resto) {
    const pos = comoNodo({ ...t, k: Math.abs(t.k) });
    r = OP(t.k < 0 ? '-' : '+', r, pos);
  }
  return r;
}

/** Simplified as on paper: numbers done, 0 and 1 gone, like terms together, the number in front. */
export function simplificar(n) {
  switch (n.t) {
    case 'n':
    case 'v':
    case 'c':
      return n;
    case 'neg': {
      const a = simplificar(n.a);
      const v = valor(a);
      if (v !== null) return N(-v);
      if (a.t === 'neg') return a.a;
      return NEG(a);
    }
    case 'f': {
      const a = simplificar(n.a);
      const v = valor(a);
      if (v !== null) {
        const r = FUNCIONES[n.n](v);
        if (Number.isInteger(r)) return N(r);
      }
      if (n.n === 'exp' && v === 0) return N(1);
      if (n.n === 'ln' && a.t === 'c' && a.n === 'e') return N(1);
      return F(n.n, a);
    }
    case '+':
    case '-':
      return armarSuma(terminos(OP(n.t, simplificar(n.a), simplificar(n.b))));
    case '*': {
      const { k, lista } = factores(OP('*', simplificar(n.a), simplificar(n.b)));
      // A fraction among the factors takes the rest on top: −2x·1/(2·√u) = −x/√u.
      const quebrados = lista.filter((f) => f.exp === 1 && f.base.t === '/');
      if (quebrados.length) {
        const arriba = armarProducto(k, lista.filter((f) => !quebrados.includes(f)));
        const num = quebrados.reduce((a, f) => OP('*', a, f.base.a), arriba);
        const den = quebrados.map((f) => f.base.b).reduce((a, b) => OP('*', a, b));
        return simplificar(OP('/', num, den));
      }
      return armarProducto(k, lista);
    }
    case '/': {
      const a = simplificar(n.a);
      const b = simplificar(n.b);
      const va = valor(a);
      const vb = valor(b);
      if (vb === 1) return a;
      if (va === 0 && vb !== 0) return N(0);
      if (va !== null && vb !== null && vb !== 0 && decimalCorto(va / vb)) return N(va / vb);
      if (iguales(a, b)) return N(1);
      if (a.t === 'neg') return simplificar(NEG(OP('/', a.a, b)));
      if (b.t === 'neg') return simplificar(NEG(OP('/', a, b.a)));
      // A number over a number in front: (6x)/2 = 3x.
      if (vb !== null && vb !== 0) {
        const fa = factores(a);
        if (decimalCorto(fa.k / vb)) return armarProducto(fa.k / vb, fa.lista);
      }
      // The number in front of both, when it goes whole: (2x)/(2·√u) = x/√u.
      const [arriba, abajo] = [factores(a), factores(b)];
      if (abajo.lista.length && abajo.k !== 1 && abajo.k !== 0 && Number.isInteger(arriba.k / abajo.k)) {
        return OP('/', armarProducto(arriba.k / abajo.k, arriba.lista), armarProducto(1, abajo.lista));
      }
      return OP('/', a, b);
    }
    case '^': {
      const a = simplificar(n.a);
      const b = simplificar(n.b);
      const va = valor(a);
      const vb = valor(b);
      if (vb === 0) return N(1);
      if (vb === 1) return a;
      if (va === 1) return N(1);
      if (va !== null && vb !== null && Number.isInteger(vb) && Math.abs(vb) < 12) {
        const r = va ** vb;
        if (decimalCorto(r)) return N(r);
      }
      if (a.t === '^' && valor(a.b) !== null && vb !== null) return simplificar(OP('^', a.a, N(valor(a.b) * vb)));
      return OP('^', a, b);
    }
    default:
      return n;
  }
}

// ---------- Deriving ----------
/** The derivative with respect to x, by the rules, simplified. */
export function derivar(nodo, x = 'x') {
  return simplificar(d(nodo, x));
}

function d(n, x) {
  if (!usa(n, x)) return N(0);
  switch (n.t) {
    case 'v':
      return N(1);
    case 'neg':
      return NEG(d(n.a, x));
    case '+':
    case '-':
      return OP(n.t, d(n.a, x), d(n.b, x));
    case '*':
      return OP('+', OP('*', d(n.a, x), n.b), OP('*', n.a, d(n.b, x)));
    case '/':
      if (!usa(n.b, x)) return OP('/', d(n.a, x), n.b);
      return OP('/', OP('-', OP('*', d(n.a, x), n.b), OP('*', n.a, d(n.b, x))), OP('^', n.b, N(2)));
    case '^': {
      const { a, b } = n;
      if (!usa(b, x)) return OP('*', OP('*', b, OP('^', a, OP('-', b, N(1)))), d(a, x));
      if (!usa(a, x)) return OP('*', OP('*', n, a.t === 'c' && a.n === 'e' ? N(1) : F('ln', a)), d(b, x));
      return OP('*', n, OP('+', OP('*', d(b, x), F('ln', a)), OP('/', OP('*', b, d(a, x)), a)));
    }
    case 'f': {
      const u = n.a;
      const du = d(u, x);
      const regla = {
        sen: () => F('cos', u),
        cos: () => NEG(F('sen', u)),
        tg: () => OP('/', N(1), OP('^', F('cos', u), N(2))),
        arcsen: () => OP('/', N(1), F('raiz', OP('-', N(1), OP('^', u, N(2))))),
        arccos: () => NEG(OP('/', N(1), F('raiz', OP('-', N(1), OP('^', u, N(2)))))),
        arctg: () => OP('/', N(1), OP('+', N(1), OP('^', u, N(2)))),
        senh: () => F('cosh', u),
        cosh: () => F('senh', u),
        tgh: () => OP('/', N(1), OP('^', F('cosh', u), N(2))),
        raiz: () => OP('/', N(1), OP('*', N(2), F('raiz', u))),
        ln: () => OP('/', N(1), u),
        log: () => OP('/', N(1), OP('*', u, F('ln', N(10)))),
        exp: () => F('exp', u),
        abs: () => OP('/', u, F('abs', u)),
      }[n.n];
      return OP('*', regla(), du);
    }
    default:
      return N(0);
  }
}

// ---------- Writing ----------
const SUPER = { 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹', '-': '⁻' };
export const superindice = (texto) => [...String(texto)].map((c) => SUPER[c] ?? c).join('');
const SUB = { 0: '₀', 1: '₁', 2: '₂', 3: '₃', 4: '₄', 5: '₅', 6: '₆', 7: '₇', 8: '₈', 9: '₉', '-': '₋', '+': '₊', i: 'ᵢ', n: 'ₙ', k: 'ₖ' };
/** x₁₂, x₋₁: an index written low. */
export const subindice = (texto) => [...String(texto)].map((c) => SUB[c] ?? c).join('');

/** A number of a formula as the course writes it: 8,5, −0,146843, 667,38. */
export const numeroFormula = (v) => {
  const t = Number(v.toPrecision(10)).toString();
  return /e/.test(t) ? t.replace('.', ',') : t.replace('.', ',');
};

const NIVEL = { '+': 1, '-': 1, neg: 2, '*': 2, '/': 2, '^': 4, n: 5, v: 5, c: 5, f: 5 };
const nivel = (n) => NIVEL[n.t];

/**
 * The tree as a list of pieces for the screen: strings, { sup: [...] } for an exponent and { par: [...] } for a group.
 * `escribir` joins them into plain text; the sheet draws them with <sup>.
 */
export function piezas(n) {
  const entre = (m, minimo) => (nivel(m) < minimo ? [{ par: piezas(m) }] : piezas(m));
  switch (n.t) {
    case 'n':
      return [n.texto ?? numeroFormula(n.v)];
    case 'v':
      return [n.n];
    case 'c':
      return [n.n === 'pi' ? 'π' : 'e'];
    case 'neg':
      return ['−', ...entre(n.a, 2)];
    case '+':
      if (n.b.t === 'neg') return [...piezas(n.a), ' − ', ...entre(n.b.a, 2)];
      return [...piezas(n.a), ' + ', ...piezas(n.b)];
    case '-':
      return [...piezas(n.a), ' − ', ...entre(n.b, 2)];
    case '*': {
      const izq = entre(n.a, 2);
      const der = n.b.t === 'neg' ? [{ par: piezas(n.b) }] : entre(n.b, 2);
      return [...izq, pegado(n.a, n.b) ? '' : '·', ...der].filter((p) => p !== '');
    }
    case '/':
      return [...entre(n.a, 2), '/', ...entre(n.b, 3)];
    case '^': {
      if (n.a.t === 'c' && n.a.n === 'e') return ['e', { sup: piezas(n.b) }];
      return [...entre(n.a, 5), { sup: piezas(n.b) }];
    }
    case 'f':
      if (n.n === 'exp') return ['e', { sup: piezas(n.a) }];
      if (n.n === 'abs') return ['|', ...piezas(n.a), '|'];
      if (n.n === 'raiz') return ['√', { par: piezas(n.a) }];
      return [n.n, { par: piezas(n.a) }];
    default:
      return [];
  }
}

const ultimo = (m) => (m.t === '*' ? ultimo(m.b) : m.t === 'neg' ? ultimo(m.a) : m);
const primero = (m) => (m.t === '*' ? primero(m.a) : m);
const letra = (m) => m.t === 'v' || m.t === 'c' || (m.t === '^' && (m.a.t === 'v' || m.a.t === 'c')) || (m.t === 'f' && m.n === 'exp');

/** Two factors written together, without the dot: 2x, xy, 3x², 2(x + 1), 4e^x. A function keeps its dot: 0,5·sen(x). */
function pegado(a, b) {
  const fa = ultimo(a);
  const ib = primero(b);
  if (ib.t === 'neg') return false;
  if (fa.t === 'n') return letra(ib) || nivel(ib) < 2;
  // A letter or a group before a group: s(s + 1), (s + 0,5)(s + 1).
  if (nivel(ib) < 2 && ((fa.t !== 'f' && letra(fa)) || nivel(fa) < 2)) return true;
  return fa.t !== 'f' && letra(fa) && (ib.t === 'v' || (ib.t === '^' && ib.a.t === 'v'));
}

/** Plain text, with the exponents raised when they're short: −2x³ + 12x² − 20x + 8,5, e^(−x) − x. */
export function escribir(n) {
  const unir = (lista) =>
    lista
      .map((p) => {
        if (typeof p === 'string') return p;
        if (p.par) return `(${unir(p.par)})`;
        const dentro = unir(p.sup);
        return /^[−-]?\d+$/.test(dentro) ? superindice(dentro.replace('−', '-')) : `^(${dentro})`;
      })
      .join('');
  return unir(piezas(n));
}
