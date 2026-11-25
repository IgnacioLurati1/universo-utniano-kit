// Propositional logic for the truth table: the parser and the table of El Santo Resumen's core (its simulator core,
// tokensLogica, parsearLogica, textoLogica and tablaVerdad), written with the symbols of each subject. Lógica y Estructuras
// Discretas writes ∼ ∧ ∨ ⇒ ⇔ with V and F (parcial-1.md, «Conectivos»); Inteligencia Artificial writes ∼ ⋅ ∨ ⊃ ≡ with
// T and F (ad.md, «Los conectivos» and «Condicionales»).

export const MAX_VARIABLES = 6;
export const MAX_LARGO = 200;

export const NOTACIONES = {
  logica: { no: '∼', y: '∧', o: '∨', xor: '⊻', imp: '⇒', ssi: '⇔', V: 'V', F: 'F' },
  ia: { no: '∼', y: '⋅', o: '∨', xor: '⊻', imp: '⊃', ssi: '≡', V: 'T', F: 'F' },
};

// What can be typed for each connective: the symbols of both subjects, the ones of the keyboard and the words.
const SIMBOLOS = [
  ['<->', 'ssi'], ['<=>', 'ssi'], ['↔', 'ssi'], ['⇔', 'ssi'], ['≡', 'ssi'],
  ['->', 'imp'], ['=>', 'imp'], ['→', 'imp'], ['⇒', 'imp'], ['⊃', 'imp'],
  ['∧', 'y'], ['^', 'y'], ['&', 'y'], ['·', 'y'], ['⋅', 'y'], ['.', 'y'],
  ['∨', 'o'], ['|', 'o'],
  ['¬', 'no'], ['~', 'no'], ['∼', 'no'], ['!', 'no'],
  ['⊻', 'xor'], ['⊕', 'xor'],
  ['(', '('], [')', ')'], ['[', '('], [']', ')'],
];

function fichas(src) {
  const out = [];
  const t = src.replace(/\s+/g, ' ').trim();
  let i = 0;
  while (i < t.length) {
    if (t[i] === ' ') {
      i += 1;
      continue;
    }
    const s = SIMBOLOS.find(([x]) => t.startsWith(x, i));
    if (s) {
      out.push({ k: s[1] });
      i += s[0].length;
      continue;
    }
    const m = /^[A-Za-z]+/.exec(t.slice(i, i + 12));
    if (!m) throw new Error(`«${t[i]}» no es un conectivo ni una variable.`);
    const w = m[0];
    i += w.length;
    if (w === 'no') out.push({ k: 'no' });
    else if (w === 'y') out.push({ k: 'y' });
    else if (w === 'o' || w === 'v') out.push({ k: 'o' });
    else if (w === 'xor') out.push({ k: 'xor' });
    else if (w === 'V' || w === 'F') out.push({ k: 'cte', v: w === 'V' });
    else if (w.length === 1) out.push({ k: 'var', n: w });
    else throw new Error(`«${w}» no es una variable. Las variables van de una letra, como p.`);
  }
  return out;
}

/** The tree of a formula. ∼ binds the most, then ∧, then ∨ and ⊻, then ⇒ (from the right) and last ⇔. */
export function parsear(src) {
  if (!src.trim()) throw new Error('Escribí una fórmula.');
  if (src.length > MAX_LARGO) throw new Error(`La fórmula pasa de ${MAX_LARGO} caracteres.`);
  const ts = fichas(src);
  let p = 0;
  const es = (k) => ts[p]?.k === k;
  const hondo = (prof) => {
    if (prof > 30) throw new Error('La fórmula tiene demasiados niveles de paréntesis.');
  };
  const unaria = (prof = 0) => {
    hondo(prof);
    if (es('no')) {
      p += 1;
      return { k: 'no', a: unaria(prof + 1) };
    }
    if (es('(')) {
      p += 1;
      const d = ssi(prof + 1);
      if (!es(')')) throw new Error('Falta cerrar un paréntesis.');
      p += 1;
      return d;
    }
    if (es('var') || es('cte')) {
      p += 1;
      return ts[p - 1];
    }
    if (p >= ts.length) throw new Error('Falta una variable al final.');
    throw new Error('Falta una variable antes de un conectivo.');
  };
  const izquierda = (k, sig) => (prof) => {
    let a = sig(prof);
    while (es(k) || (k === 'o' && es('xor'))) {
      const op = ts[p].k;
      p += 1;
      a = { k: op, a, b: sig(prof) };
    }
    return a;
  };
  const conj = izquierda('y', unaria);
  const disy = izquierda('o', conj);
  const imp = (prof) => {
    hondo(prof);
    const a = disy(prof);
    if (!es('imp')) return a;
    p += 1;
    return { k: 'imp', a, b: imp(prof + 1) };
  };
  function ssi(prof) {
    hondo(prof);
    let a = imp(prof);
    while (es('ssi')) {
      p += 1;
      a = { k: 'ssi', a, b: imp(prof) };
    }
    return a;
  }
  const r = ssi(0);
  if (p < ts.length) throw new Error(ts[p].k === ')' ? 'Sobra un paréntesis que cierra.' : 'Falta un conectivo entre dos partes de la fórmula.');
  return r;
}

const FUERZA = { ssi: 1, imp: 2, o: 3, xor: 3, y: 4, no: 5, var: 6, cte: 6 };

/** The formula written with the symbols of a subject. As the notes write it, a part with a connective of its own goes
 * in brackets inside another connective, except a chain of ∧ or of ∨. */
export function texto(n, notacion = 'logica') {
  const s = NOTACIONES[notacion];
  if (n.k === 'var') return n.n;
  if (n.k === 'cte') return n.v ? s.V : s.F;
  const binaria = (h) => h.b !== undefined;
  const cadena = (h) => h.k === n.k && (n.k === 'y' || n.k === 'o');
  const par = (h) => (!cadena(h) && (FUERZA[h.k] <= FUERZA[n.k] || binaria(h)) ? `(${texto(h, notacion)})` : texto(h, notacion));
  if (n.k === 'no') return `${s.no}${par(n.a)}`;
  return `${par(n.a)} ${s[n.k]} ${par(n.b)}`;
}

export function valor(n, v) {
  switch (n.k) {
    case 'var':
      return v[n.n];
    case 'cte':
      return n.v;
    case 'no':
      return !valor(n.a, v);
    case 'y':
      return valor(n.a, v) && valor(n.b, v);
    case 'o':
      return valor(n.a, v) || valor(n.b, v);
    case 'xor':
      return valor(n.a, v) !== valor(n.b, v);
    case 'imp':
      return !valor(n.a, v) || valor(n.b, v);
    default:
      return valor(n.a, v) === valor(n.b, v);
  }
}

/**
 * The truth table: one column per variable (in alphabetical order) and one per part of the formula, from the inside
 * out, the whole formula last. The first row has every variable true, as the course writes it.
 */
export function tablaVerdad(src) {
  const raiz = parsear(src);
  const variables = new Set();
  const partes = [];
  const clave = (n) => texto(n);
  const recorrer = (n) => {
    if (n.k === 'var') return variables.add(n.n);
    if (n.k === 'cte') return null;
    recorrer(n.a);
    if (n.b) recorrer(n.b);
    if (!partes.some((s) => clave(s) === clave(n))) partes.push(n);
    return null;
  };
  recorrer(raiz);
  const nombres = [...variables].sort();
  if (nombres.length > MAX_VARIABLES) throw new Error(`Son ${nombres.length} variables y el tope es ${MAX_VARIABLES}.`);
  const filas = 2 ** nombres.length;
  const asignaciones = Array.from({ length: filas }, (_, i) => Object.fromEntries(nombres.map((n, j) => [n, !(i & (1 << (nombres.length - 1 - j)))])));
  const columnas = partes.map((nodo) => ({ nodo, vals: asignaciones.map((a) => valor(nodo, a)) }));
  if (!partes.length) columnas.push({ nodo: raiz, vals: asignaciones.map((a) => valor(raiz, a)) });
  const final = columnas.at(-1).vals;
  const verdaderas = final.filter(Boolean).length;
  const clase = verdaderas === filas ? 'tautologia' : verdaderas === 0 ? 'contradiccion' : 'contingente';
  return { raiz, variables: nombres, asignaciones, columnas, final, verdaderas, clase };
}
