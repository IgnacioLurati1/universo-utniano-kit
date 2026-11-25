// Formal grammars of Sintaxis y Semántica de los Lenguajes («Gramáticas formales», «Derivaciones» and
// «Jerarquía de Chomsky y máquinas»): the type of each production, the words the grammar generates and the derivation
// of a word, with its syntax tree («Cómo trabaja el analizador sintáctico»). The method is El Santo
// Resumen's (its simulator code, leerGramatica, tipoDe, clasificar, lenguaje
// and derivar).

export const MAX_LARGO = 800;
export const esNT = (c) => /^\p{Lu}$/u.test(c);
const corto = (t) => (t.length > 40 ? `${t.slice(0, 40)}…` : t);
export const yLista = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : xs[0] || '');
export const ver = (w) => w || 'ε';
/** A production as the notes write it, A → B1. */
export const produccion = (p) => `${p.izq} → ${ver(p.der)}`;

/** The productions, one per line or separated by commas, with | for the alternatives. Capitals are the non-terminals and
 * the first left side is the axiom. */
export function leerGramatica(texto) {
  if (texto.length > MAX_LARGO) return { error: `Las producciones pasan de ${MAX_LARGO} caracteres.` };
  let t = texto.trim().replace(/^P\s*=\s*/, '');
  if (t.startsWith('{') && t.endsWith('}')) t = t.slice(1, -1);
  const items = t.split(/[\n;,]+/).map((s) => s.trim()).filter(Boolean);
  if (!items.length) return { error: 'Escribí las producciones, como S -> aS | b.' };
  const prods = [];
  for (let it of items) {
    // The notes write each production as a pair, (A → B1). Those brackets go, but not the ones of E -> (E).
    if (it.startsWith('(') && it.endsWith(')') && /->|→/.test(it)) it = it.slice(1, -1).trim();
    const partes = it.split(/->|→/);
    if (partes.length < 2) return { error: `A «${corto(it)}» le falta la flecha, como en S -> aS.` };
    if (partes.length > 2) return { error: `«${corto(it)}» tiene más de una flecha. Va una producción por renglón.` };
    const izq = partes[0].replace(/\s+/g, '').replace(/ε/g, '');
    if (!izq) return { error: `«${corto(it)}» no tiene nada a la izquierda de la flecha.` };
    if (izq.length > 10) return { error: `La izquierda de «${corto(it)}» pasa de 10 símbolos.` };
    for (const alt of partes[1].split('|')) {
      const der = alt.replace(/\s+/g, '').replace(/ε/g, '');
      if (der.length > 20) return { error: `«${corto(alt.trim())}» pasa de 20 símbolos.` };
      if (!prods.some((p) => p.izq === izq && p.der === der)) prods.push({ izq, der });
    }
    if (prods.length > 40) return { error: 'Son más de 40 producciones.' };
  }
  const izqs = prods.map((p) => p.izq);
  const axioma = esNT(izqs[0]) ? izqs[0] : [...izqs.join('')].find(esNT);
  if (!axioma) return { error: 'Falta un no terminal a la izquierda. Van en mayúscula, como S.' };
  const simbolos = [...new Set(prods.flatMap((p) => [...p.izq, ...p.der]))];
  const VN = [axioma, ...simbolos.filter((c) => esNT(c) && c !== axioma)];
  const VT = simbolos.filter((c) => !esNT(c));
  return { prods, axioma, VN, VT, libre: prods.every((p) => p.izq.length === 1 && esNT(p.izq)) };
}

const esTipo1 = (izq, der) => {
  for (let i = 0; i < izq.length; i += 1) {
    if (esNT(izq[i])) {
      const a = izq.slice(0, i);
      const b = izq.slice(i + 1);
      if (der.length >= a.length + b.length + 1 && der.startsWith(a) && der.endsWith(b)) return true;
    }
  }
  return false;
};

/** The type of one production, by the forms of the notes, and why it does not reach the next one. */
export function tipoDe(p, axioma, conEps) {
  const { izq, der } = p;
  const unNT = izq.length === 1 && esNT(izq);
  if (!der) {
    if (unNT && (izq === axioma || conEps)) return { tipo: 3, forma: 'eps', por: izq === axioma ? `El apunte admite ${axioma} → ε en el axioma.` : 'Da la cadena vacía.' };
    return { tipo: 0, eps: unNT, por: unNT ? `Da ε y ${izq} no es el axioma. El apunte admite ε solo en ${axioma} → ε.` : 'La derecha es ε. Achica la cadena.' };
  }
  if (unNT) {
    const nts = [...der].filter(esNT).length;
    if (!nts) return { tipo: 3, forma: 'term', por: 'Da solo terminales.' };
    if (nts === 1 && der.length > 1 && esNT(der[der.length - 1])) return { tipo: 3, forma: 'der', por: 'Terminales y un no terminal al final. Es regular por la derecha.' };
    if (nts === 1 && der.length > 1 && esNT(der[0])) return { tipo: 3, forma: 'izq', por: 'Un no terminal al principio y terminales. Es regular por la izquierda.' };
    return { tipo: 2, por: der.length === 1 ? 'Pasa de un no terminal a otro sin terminales. No es regular.' : 'Un solo no terminal a la izquierda, pero la derecha no tiene la forma regular.' };
  }
  if (esTipo1(izq, der)) return { tipo: 1, por: 'Reemplaza un no terminal según lo que lo rodea, sin achicar la cadena.' };
  return { tipo: 0, por: der.length < izq.length ? 'La derecha es más corta que la izquierda.' : 'No se puede escribir como αAβ → αγβ, aunque no achica la cadena.' };
}

export const NOMBRE_TIPO = ['sin restricciones', 'dependiente del contexto', 'libre del contexto', 'regular'];
export const MAQUINA = ['una máquina de Turing', 'un autómata linealmente acotado', 'un autómata de pila', 'un autómata finito'];

/** The type of the grammar: the highest one that all its productions meet. Right and left regular mixed is type 2. */
export function clasificar(g, conEps = false) {
  const tipos = g.prods.map((p) => tipoDe(p, g.axioma, conEps));
  let tipo = Math.min(...tipos.map((t) => t.tipo));
  const formas = new Set(tipos.map((t) => t.forma));
  const mezcla = tipo === 3 && formas.has('der') && formas.has('izq');
  if (mezcla) tipo = 2;
  const lado = tipo === 3 ? (formas.has('izq') ? 'por la izquierda' : formas.has('der') ? 'por la derecha' : '') : '';
  const peor = tipos.findIndex((t) => t.tipo === Math.min(...tipos.map((x) => x.tipo)));
  return { tipos, tipo, mezcla, lado, peor };
}

/** For a context-free grammar: shortest length of each non-terminal, which ones generate, and the words. */
export function lenguaje(g) {
  const NT = g.VN;
  const largo = new Map(NT.map((A) => [A, Infinity]));
  const med = (c) => (esNT(c) ? largo.get(c) ?? Infinity : 1);
  for (let vuelta = 0, otra = true; otra && vuelta < 100; vuelta += 1) {
    otra = false;
    for (const p of g.prods) {
      const v = [...p.der].reduce((a, c) => a + med(c), 0);
      if (v < largo.get(p.izq)) {
        largo.set(p.izq, v);
        otra = true;
      }
    }
  }
  const genera = (c) => !esNT(c) || Number.isFinite(largo.get(c));
  const utiles = g.prods.filter((p) => genera(p.izq) && [...p.der].every(genera));
  const alcanza = new Set([g.axioma]);
  for (let otra = true; otra;) {
    otra = false;
    for (const p of utiles) {
      if (!alcanza.has(p.izq)) continue;
      for (const c of p.der) {
        if (esNT(c) && !alcanza.has(c)) {
          alcanza.add(c);
          otra = true;
        }
      }
    }
  }
  const usadas = utiles.filter((p) => alcanza.has(p.izq));
  const lleno = new Set();
  for (let otra = true; otra;) {
    otra = false;
    for (const p of usadas) {
      if (!lleno.has(p.izq) && [...p.der].some((c) => !esNT(c) || lleno.has(c))) {
        lleno.add(p.izq);
        otra = true;
      }
    }
  }
  // Infinite when a non-terminal comes back on itself while some other symbol of the way adds terminals.
  const llega = (de, a) => {
    const vistos = new Set([de]);
    const cola = [{ X: de, camino: [] }];
    while (cola.length) {
      const { X, camino } = cola.shift();
      if (X === a) return camino;
      for (const p of usadas) {
        if (p.izq !== X) continue;
        for (const c of new Set(p.der)) {
          if (esNT(c) && !vistos.has(c)) {
            vistos.add(c);
            cola.push({ X: c, camino: [...camino, p] });
          }
        }
      }
    }
    return null;
  };
  let ciclo = null;
  for (const p of usadas) {
    if (ciclo) break;
    [...p.der].forEach((c, j) => {
      if (ciclo || !esNT(c)) return;
      const suma = [...p.der].some((x, i) => i !== j && (!esNT(x) || lleno.has(x)));
      if (!suma) return;
      const vuelta = llega(c, p.izq);
      if (vuelta) ciclo = [p, ...vuelta];
    });
  }
  // Words up to a length, by rounds, keeping at most TOPE of each non-terminal.
  const m = largo.get(g.axioma);
  let maxLargo = Infinity;
  if (!ciclo && Number.isFinite(m)) {
    const mayor = new Map(NT.map((A) => [A, -Infinity]));
    for (let vuelta = 0; vuelta < NT.length + 2; vuelta += 1) {
      for (const p of usadas) {
        const v = [...p.der].reduce((a, c) => a + (esNT(c) ? mayor.get(c) : 1), 0);
        if (v > mayor.get(p.izq)) mayor.set(p.izq, v);
      }
    }
    maxLargo = mayor.get(g.axioma);
  }
  const L = Number.isFinite(m) ? Math.min(40, Number.isFinite(maxLargo) ? maxLargo : m + 8) : 0;
  const TOPE_P = 300;
  const W = new Map(NT.map((A) => [A, new Set()]));
  let trabajo = 0;
  let cortado = false;
  for (let vuelta = 0, otra = Number.isFinite(m); otra && vuelta < 60; vuelta += 1) {
    otra = false;
    for (const p of usadas) {
      let parciales = [''];
      for (const c of p.der) {
        const sig = [];
        const opciones = esNT(c) ? [...W.get(c)] : [c];
        for (const a of parciales) {
          for (const b of opciones) {
            trabajo += 1;
            if (a.length + b.length > L) continue;
            if (sig.length < TOPE_P) sig.push(a + b);
            else cortado = true;
          }
        }
        parciales = sig;
      }
      const S = W.get(p.izq);
      for (const w of parciales) {
        if (S.has(w)) continue;
        if (S.size >= TOPE_P) {
          cortado = true;
          break;
        }
        S.add(w);
        otra = true;
      }
    }
    if (trabajo > 400000) {
      cortado = true;
      break;
    }
  }
  const palabras = [...(W.get(g.axioma) || [])].sort((a, b) => a.length - b.length || (a < b ? -1 : a > b ? 1 : 0));
  const porLargo = (n) => palabras.filter((w) => w.length === n);
  const sig = palabras.find((w) => w.length > m);
  return {
    m,
    ciclo,
    palabras,
    cortas: Number.isFinite(m) ? porLargo(m) : [],
    siguientes: sig === undefined ? [] : porLargo(sig.length),
    completo: !ciclo && Number.isFinite(maxLargo) && maxLargo <= 40 && !cortado,
    sinUso: NT.filter((A) => !Number.isFinite(largo.get(A))),
    largo,
  };
}

/** A derivation of the word, the shortest one. In a context-free grammar it replaces the leftmost (or rightmost)
 * non-terminal; otherwise any part that matches a left side. Each step keeps where it replaced, for the tree. */
export function derivar(g, objetivo, lado, largo) {
  const conNT = [...objetivo].some(esNT);
  const libre = g.libre && !conNT;
  const tope = objetivo.length + (libre ? 10 : 6);
  const terminales = [...objetivo].filter((c) => !esNT(c)).length;
  const min = (f) => [...f].reduce((a, c) => a + (esNT(c) ? largo.get(c) ?? Infinity : 1), 0);
  const sirve = (f) => {
    if (!g.libre) return true;
    if ([...f].filter((c) => !esNT(c)).length > terminales) return false;
    if (conNT) return true;
    if (min(f) > objetivo.length) return false;
    const a = [...f].findIndex(esNT);
    if (a < 0) return f === objetivo;
    const b = f.length - 1 - [...f].reverse().findIndex(esNT);
    return objetivo.startsWith(f.slice(0, a)) && objetivo.endsWith(f.slice(b + 1));
  };
  const visto = new Map([[g.axioma, null]]);
  const cola = [g.axioma];
  let cortado = false;
  for (let h = 0; h < cola.length; h += 1) {
    const f = cola[h];
    if (f === objetivo) {
      const camino = [];
      for (let x = f; x !== null; x = visto.get(x)?.de ?? null) camino.unshift({ f: x, p: visto.get(x)?.p, en: visto.get(x)?.en });
      return { camino, libre };
    }
    if (visto.size > 30000) {
      cortado = true;
      break;
    }
    const hijos = [];
    if (libre) {
      const nts = [...f].map((c, i) => (esNT(c) ? i : -1)).filter((i) => i >= 0);
      if (!nts.length) continue;
      const i = lado === 'derecha' ? nts[nts.length - 1] : nts[0];
      for (const p of g.prods) if (p.izq === f[i]) hijos.push({ nf: f.slice(0, i) + p.der + f.slice(i + 1), p, en: i });
    } else {
      for (const p of g.prods) {
        for (let i = f.indexOf(p.izq); i >= 0; i = f.indexOf(p.izq, i + 1)) hijos.push({ nf: f.slice(0, i) + p.der + f.slice(i + p.izq.length), p, en: i });
      }
    }
    for (const { nf, p, en } of hijos) {
      if (visto.has(nf)) continue;
      if (nf.length > tope) {
        cortado = true;
        continue;
      }
      if (!sirve(nf)) continue;
      visto.set(nf, { de: f, p, en });
      cola.push(nf);
    }
  }
  return { camino: null, cortado, revisadas: visto.size, libre };
}

/**
 * The syntax tree of a derivation of a context-free grammar: the axiom at the root and, under each non-terminal it
 * replaced, the symbols of the production in order (ε when it gives the empty string). The leaves, read left to right,
 * are the word. Placed by leaves: each leaf in its own column and each vertex over the middle of its children.
 */
export function arbolDerivacion(camino) {
  const raiz = { e: camino[0].f, hijos: [] };
  let hojas = [raiz];
  for (const paso of camino.slice(1)) {
    const v = hojas[paso.en];
    v.hijos = paso.p.der ? [...paso.p.der].map((c) => ({ e: c, hijos: [] })) : [{ e: 'ε', hijos: [], vacia: true }];
    hojas = [...hojas.slice(0, paso.en), ...v.hijos.filter((h) => !h.vacia), ...hojas.slice(paso.en + 1)];
  }
  const vertices = [];
  const aristas = [];
  let columna = 0;
  let altura = 0;
  const ir = (n, nivel, padre) => {
    n.y = nivel;
    n.id = vertices.length;
    vertices.push(n);
    altura = Math.max(altura, nivel);
    if (padre) aristas.push({ de: padre, a: n });
    if (!n.hijos.length) {
      n.x = columna;
      columna += 1;
      return;
    }
    n.hijos.forEach((h) => ir(h, nivel + 1, n));
    n.x = (n.hijos[0].x + n.hijos[n.hijos.length - 1].x) / 2;
  };
  ir(raiz, 0, null);
  return { vertices, aristas, columnas: columna, altura };
}
