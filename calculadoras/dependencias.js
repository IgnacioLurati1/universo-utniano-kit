// Functional dependencies of Bases de Datos («Claves y reglas de integridad» and «Normalización»): the
// closure of a set, the candidate keys, the normal form and the decomposition into 3FN, with the tables written as the
// course does (CP and CF, the course's own corrections to the conversion). The method is El Santo Resumen's
// (its simulator code, motor, pasosCierre, pasosClaves, formas and descomponer).

export const MAX_ATRIBUTOS = 12;
export const MAX_DF = 20;
const MAX_TABLAS = 16;
const NOMBRE = /^[\p{L}_][\p{L}\p{N}_]{0,29}$/u;
const corto = (t) => (t.length > 40 ? `${t.slice(0, 40)}…` : t);

// ----- Sets of attributes as bit masks
export const bits = (m) => {
  const r = [];
  for (let i = 0; i < MAX_ATRIBUTOS; i += 1) if ((m >> i) & 1) r.push(i);
  return r;
};
export const cuantos = (m) => bits(m).length;
const subconjuntos = (m) => {
  const b = bits(m);
  const r = [];
  for (let s = 1; s < 1 << b.length; s += 1) r.push(b.reduce((a, x, j) => ((s >> j) & 1 ? a | (1 << x) : a), 0));
  return r.sort((x, y) => cuantos(x) - cuantos(y) || x - y);
};

export function leerRelacion(texto) {
  const t = texto.trim();
  if (!t) return { error: 'Escribí la relación, como R(a, b, c).' };
  const m = /^([^\s(),]*)\s*\(([^()]*)\)$/.exec(t);
  if (!m && /[()]/.test(t)) return { error: 'Revisá los paréntesis de la relación, como en R(a, b, c).' };
  const nombre = m ? m[1] || 'R' : 'R';
  if (!NOMBRE.test(nombre)) return { error: `«${corto(nombre)}» no sirve como nombre. Van letras, números y guion bajo.` };
  const attrs = (m ? m[2] : t).split(/[\s,;]+/).filter(Boolean);
  if (!attrs.length) return { error: 'La relación no tiene atributos.' };
  const malo = attrs.find((a) => !NOMBRE.test(a));
  if (malo) return { error: `«${corto(malo)}» no es un nombre de atributo. Van letras, números y guion bajo, sin espacios.` };
  const rep = attrs.find((a, i) => attrs.indexOf(a) !== i);
  if (rep) return { error: `«${rep}» está dos veces en la relación.` };
  if (attrs.length > MAX_ATRIBUTOS) return { error: `Son ${attrs.length} atributos y el tope es ${MAX_ATRIBUTOS}.` };
  return { nombre, attrs };
}

const ladoDe = (s) => s.replace(/[(){}]/g, ' ').split(/[\s,]+/).filter(Boolean);
export function leerAtributos(texto, attrs) {
  const idx = new Map(attrs.map((a, i) => [a, i]));
  let m = 0;
  for (const a of ladoDe(texto)) {
    if (!idx.has(a)) {
      const parecido = attrs.find((b) => b.toLowerCase() === a.toLowerCase());
      return { error: `«${corto(a)}» no está en la relación.${parecido ? ` ¿Es «${parecido}»?` : ''}` };
    }
    m |= 1 << idx.get(a);
  }
  return { m };
}

export function leerDF(texto, attrs) {
  const lineas = texto.split(/[\n;]+/).map((l) => l.trim()).filter(Boolean);
  if (lineas.length > MAX_DF) return { error: `Son ${lineas.length} dependencias y el tope es ${MAX_DF}.` };
  const dfs = [];
  for (const l of lineas) {
    const partes = l.split(/->|→/);
    if (partes.length > 2) return { error: `«${corto(l)}» tiene más de una flecha. Va una DF por renglón.` };
    if (partes.length !== 2) return { error: `A «${corto(l)}» le falta la flecha, como en a -> b.` };
    const izq = leerAtributos(partes[0], attrs);
    if (izq.error) return izq;
    const der = leerAtributos(partes[1], attrs);
    if (der.error) return der;
    if (!izq.m) return { error: `A «${corto(l)}» le falta el determinante, a la izquierda.` };
    if (!der.m) return { error: `A «${corto(l)}» le falta lo que determina, a la derecha.` };
    const solo = der.m & ~izq.m;
    if (!solo) return { error: `«${corto(l)}» no agrega nada, porque lo de la derecha ya está a la izquierda.` };
    dfs.push({ izq: izq.m, der: solo });
  }
  return { dfs };
}

/** The relation, its DF and, if there is one, the set for the closure. The error says which field it comes from. */
export function leer(relacion, df, conjunto = '') {
  const r = leerRelacion(relacion);
  if (r.error) return { error: r.error, campo: 'relacion' };
  const d = leerDF(df, r.attrs);
  if (d.error) return { error: d.error, campo: 'df' };
  let X = 0;
  if (conjunto.trim()) {
    const x = leerAtributos(conjunto, r.attrs);
    if (x.error) return { error: x.error, campo: 'conjunto' };
    X = x.m;
  }
  return { rel: r, dfs: d.dfs, X };
}

// ----- Closure, keys and how each set is written
export function motor(attrs, dfs) {
  const U = (1 << attrs.length) - 1;
  const memo = new Map();
  const cierre = (m) => {
    if (memo.has(m)) return memo.get(m);
    let c = m;
    let otra = true;
    while (otra) {
      otra = false;
      for (const d of dfs) {
        if ((d.izq & c) === d.izq && d.der & ~c) {
          c |= d.der;
          otra = true;
        }
      }
    }
    memo.set(m, c);
    return c;
  };
  const nombres = (m) => bits(m).map((i) => attrs[i]);
  const lista = (m) => nombres(m).join(', ');
  const conj = (m) => `{${lista(m)}}`;
  const det = (m) => (cuantos(m) > 1 ? `(${lista(m)})` : lista(m));
  const df = (d) => `${lista(d.izq)} → ${lista(d.der)}`;
  /** Candidate keys of the table T: the least sets inside T whose closure covers T. */
  const clavesDe = (T) => {
    const nucleo = bits(T).reduce((a, i) => ((cierre(T & ~(1 << i)) >> i) & 1 ? a : a | (1 << i)), 0);
    if ((cierre(nucleo) & T) === T) return [nucleo];
    const ks = [];
    for (const s of subconjuntos(T & ~nucleo)) {
      const m = nucleo | s;
      if (ks.some((k) => (k & m) === k)) continue;
      if ((cierre(m) & T) === T) ks.push(m);
    }
    return ks;
  };
  return { U, attrs, cierre, nombres, lista, conj, det, df, clavesDe };
}

/** The closure of X, DF by DF: each row says which DF it used, what it added and how the set stands. */
export function pasosCierre(e, dfs, X) {
  let c = X;
  const pasos = [];
  let otra = true;
  while (otra) {
    otra = false;
    for (const d of dfs) {
      if ((d.izq & c) === d.izq && d.der & ~c) {
        const suma = d.der & ~c;
        c |= d.der;
        pasos.push({ d, suma, queda: c });
        otra = true;
      }
    }
  }
  const superclave = c === e.U;
  const sobra = superclave ? bits(X).find((i) => e.cierre(X & ~(1 << i)) === e.U) : undefined;
  return { c, pasos, superclave, candidata: superclave && sobra === undefined, sobra: sobra === undefined ? null : e.attrs[sobra] };
}

/** The steps the notes' order asks for to find the key: who nobody determines, who only appears on the right, and the
 * sets that are left, from the smallest. */
export function pasosClaves(e, dfs) {
  const { U } = e;
  let derecha = 0;
  let izquierda = 0;
  dfs.forEach((d) => {
    derecha |= d.der;
    izquierda |= d.izq;
  });
  const nucleo = U & ~derecha;
  const soloDer = derecha & ~izquierda;
  const medio = U & ~nucleo & ~soloDer;
  const ks = [];
  const pruebas = [];
  const directa = Boolean(nucleo) && e.cierre(nucleo) === U;
  if (directa) ks.push(nucleo);
  else {
    for (const s of subconjuntos(medio)) {
      const m = nucleo | s;
      if (ks.some((k) => (k & m) === k)) continue;
      const c = e.cierre(m);
      if (c === U) ks.push(m);
      pruebas.push({ m, c, clave: c === U });
    }
  }
  const primos = ks.reduce((a, k) => a | k, 0);
  return { nucleo, soloDer, medio, directa, ks, pruebas, primos, noClave: U & ~primos };
}

/** 2FN, 3FN and FNBC of the whole relation, each with the dependency that breaks it. */
export function formas(e, dfs, ks) {
  const { U } = e;
  const primos = ks.reduce((a, k) => a | k, 0);
  const noClave = U & ~primos;
  const compuestas = ks.filter((k) => cuantos(k) > 1);
  // Partial: a non-key attribute that a proper part of a key already determines, with the least such part.
  const partes = [...new Set(compuestas.flatMap((k) => subconjuntos(k).filter((s) => s !== k)))].sort((x, y) => cuantos(x) - cuantos(y) || x - y);
  const parciales = [];
  let puestos = 0;
  for (const S of partes) {
    const D = e.cierre(S) & noClave & ~S & ~puestos;
    if (!D) continue;
    puestos |= D;
    const clave = compuestas.find((k) => (k & S) === S);
    const dada = dfs.some((d) => d.izq === S && d.der & D);
    parciales.push({ S, D, clave, dada });
  }
  const esParte = (X) => compuestas.some((k) => (k & X) === X && X !== k);
  const transitivas = [];
  dfs.forEach((d) => {
    const A = d.der & noClave;
    if (A && e.cierre(d.izq) !== U && !esParte(d.izq)) transitivas.push({ d, A });
  });
  const fnbc = dfs.filter((d) => e.cierre(d.izq) !== U);
  const nivel = parciales.length ? 1 : transitivas.length ? 2 : fnbc.length ? 3 : 4;
  // What each DF of the diagram is: partial, transitive or neither.
  const tipo = dfs.map((x) => {
    if (parciales.some((p) => p.S === x.izq && x.der & p.D) || (compuestas.some((k) => (k & x.izq) === x.izq && k !== x.izq) && x.der & noClave)) return 'parcial';
    return transitivas.some((t) => t.d === x) ? 'transitiva' : '';
  });
  return { primos, noClave, compuestas, parciales, transitivas, fnbc, nivel, tipo };
}

export const NIVEL = ['', 'Está en 1FN, pero no en 2FN.', 'Está en 2FN, pero no en 3FN.', 'Está en 3FN, pero no en FNBC.', 'Está en FNBC.'];

/** Form by form, in the notes' order, with what makes it hold or fail. */
export function pasosFormas(e, f, cp) {
  const plural = (m, uno, varios) => (cuantos(m) > 1 ? varios : uno);
  const dos = (() => {
    if (!f.noClave) return 'No hay atributos no clave.';
    if (!f.compuestas.length) return 'La clave es simple. No hay una parte de la clave de la que depender.';
    if (!f.parciales.length) return 'Cada no clave depende de toda la clave.';
    return f.parciales.map((p) => `${e.lista(p.D)} ${plural(p.D, 'depende', 'dependen')} de ${e.det(p.S)}, que es solo una parte de la clave ${e.det(p.clave)}. Es parcial.${p.dada ? '' : ` Se deduce de ${e.conj(p.S)}⁺.`}`).join(' ');
  })();
  const tres = (() => {
    if (!f.transitivas.length) return f.parciales.length ? 'Ningún no clave depende de otro no clave, pero antes falla 2FN.' : 'Ningún no clave depende de algo que no sea clave.';
    const primeras = f.transitivas.slice(0, 3).map(({ d, A }) => `Por ${e.df(d)}, ${e.lista(A)} ${plural(A, 'es no clave y depende', 'son no clave y dependen')} de ${e.det(d.izq)}, que no es clave. Es transitiva, ${e.det(cp)} → ${e.det(d.izq)} → ${e.lista(A)}.`);
    if (f.transitivas.length > 3) primeras.push(`Pasa lo mismo con ${f.transitivas.slice(3).map((t) => e.df(t.d)).join(' y ')}.`);
    return primeras.join(' ');
  })();
  const bc = f.fnbc.length
    ? `Por ${e.df(f.fnbc[0])}, ${e.det(f.fnbc[0].izq)} es un determinante que no es clave candidata ni la contiene.${f.fnbc.length > 1 ? ` Pasa lo mismo con ${f.fnbc.slice(1).map((x) => e.df(x)).join(' y ')}.` : ''}`
    : 'Todo determinante es clave candidata o la contiene.';
  return [
    { forma: '1FN', cumple: true, texto: 'Se supone que cada valor es atómico, porque eso no se ve en las DF. Con un atributo multivaluado o un grupo repetido no llega a 1FN.' },
    { forma: '2FN', cumple: f.nivel >= 2, texto: dos },
    { forma: '3FN', cumple: f.nivel >= 3, texto: tres },
    { forma: 'FNBC', cumple: f.nivel >= 4, texto: bc },
  ];
}

/** The method of the notes: for each problem dependency a new table with the determinant as key and what it
 * determines, and the determinant stays in the original as a foreign key. First the partial ones, then the rest. */
export function descomponer(e, dfs, rel, cp, f) {
  const tablas = [{ nombre: rel.nombre, attrs: e.U, cp, cfs: [] }];
  const pasos = [];
  let n = 0;
  const nueva = (attrs, clave) => {
    n += 1;
    const t = { nombre: `R${n}`, attrs, cp: clave, cfs: [] };
    tablas.push(t);
    return t;
  };
  const mudar = (T, R, mover) => {
    T.cfs = T.cfs.filter((cf) => {
      if (!(cf.attrs & mover) || cf.attrs & ~R.attrs) return true;
      R.cfs.push(cf);
      return false;
    });
    T.attrs &= ~mover;
    T.cfs.push({ attrs: R.cp, ref: R.nombre });
  };
  for (const p of f.parciales) {
    const T = tablas[0];
    const mover = p.D & T.attrs;
    if (!mover) continue;
    const R = nueva(p.S | mover, p.S);
    mudar(T, R, mover);
    pasos.push({ df: `${e.det(p.S)} → ${e.lista(mover)}`, tipo: 'parcial', texto: `Es parcial. Sale ${R.nombre} con ${e.lista(R.attrs)} y CP ${e.det(p.S)}. En ${T.nombre}, ${e.det(p.S)} queda en la CP y es CF a ${R.nombre}.` });
  }
  // In each table, a dependency whose determinant is not a key of that table and that gives a non-key attribute.
  const falla = (T) => {
    const ks = e.clavesDe(T.attrs);
    const primos = ks.reduce((a, k) => a | k, 0);
    const esSuper = (X) => (e.cierre(X) & T.attrs) === T.attrs;
    const candidatos = [...dfs.map((d) => d.izq).filter((X) => (X & T.attrs) === X), ...subconjuntos(T.attrs)];
    for (const X of candidatos) {
      if (esSuper(X)) continue;
      const A = e.cierre(X) & T.attrs & ~X & ~primos;
      if (A) return { X, A, parcial: ks.some((k) => (k & X) === X), dada: dfs.some((d) => d.izq === X && d.der & A) };
    }
    return null;
  };
  for (let i = 0, vueltas = 0; i < tablas.length && vueltas < 60; vueltas += 1) {
    const T = tablas[i];
    const v = tablas.length < MAX_TABLAS ? falla(T) : null;
    if (!v) {
      i += 1;
      continue;
    }
    const R = nueva(v.X | v.A, v.X);
    mudar(T, R, v.A);
    const tipo = v.parcial ? 'parcial' : 'transitiva';
    pasos.push({ df: `${e.det(v.X)} → ${e.lista(v.A)}`, tipo, texto: `En ${T.nombre} es ${tipo}, porque ${e.det(v.X)} no es clave de ${T.nombre}.${v.dada ? '' : ` Se deduce de ${e.conj(v.X)}⁺.`} Sale ${R.nombre} con ${e.lista(R.attrs)} y CP ${e.det(v.X)}. En ${T.nombre} queda ${e.det(v.X)} como CF a ${R.nombre}.` });
  }
  // The keys of each new table and whether it reaches FNBC.
  tablas.forEach((T) => {
    const ks = e.clavesDe(T.attrs);
    if (!ks.some((k) => k === T.cp)) T.cp = ks.find((k) => (k & T.cp) === k) || ks[0];
    const X = [...dfs.map((d) => d.izq).filter((m) => (m & T.attrs) === m), ...subconjuntos(T.attrs)].find((m) => (e.cierre(m) & T.attrs) !== T.attrs && e.cierre(m) & T.attrs & ~m);
    T.noBC = X ? { X, A: e.cierre(X) & T.attrs & ~X } : null;
    // As the course writes it: the CP first.
    T.orden = [...bits(T.cp), ...bits(T.attrs & ~T.cp)].map((b) => e.attrs[b]);
    T.claves = bits(T.cp).map((b) => e.attrs[b]);
  });
  return { tablas, pasos };
}
