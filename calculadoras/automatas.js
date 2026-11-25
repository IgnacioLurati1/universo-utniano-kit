// Regular expressions of Sintaxis y Semántica de los Lenguajes (parcial-2.md, «Expresiones regulares», «Finito o
// infinito, y la palabra más corta», «Método de Thompson» and «Subconjuntos»): the NFA by Thompson with its states
// numbered as the notes do, the DFA by subsets and a string tried on it. The method is El Santo Resumen's
// (its simulator code, leerER, thompson, afd and palabrasDe).

export const MAX_LARGO = 50;
export const MAX_ESTADOS = 80;
const MAX_AFD = 2000;

const esSimbolo = (c) => c !== 'ε' && /^[\p{L}\p{N}_]$/u.test(c);

/** The tree of a regular expression: | . * + ? ( ) [ ] and ε, with * over . over |, as the notes set. */
export function leerER(src) {
  let i = 0;
  const ver = () => {
    while (i < src.length && /\s/.test(src[i])) i += 1;
    return src[i];
  };
  const falla = (m) => {
    throw new Error(m);
  };
  const fin = (c) => c === undefined || c === '|' || c === ')';
  function alt() {
    ver();
    const ini = i;
    let a = cat();
    while (ver() === '|') {
      i += 1;
      if (fin(ver())) falla('Falta algo después de una |.');
      const b = cat();
      a = { t: 'alt', a, b, txt: src.slice(ini, i).trim() };
    }
    return a;
  }
  function cat() {
    ver();
    const ini = i;
    let a = rep();
    for (;;) {
      let c = ver();
      if (c === '.') {
        i += 1;
        c = ver();
        if (fin(c)) falla('Falta algo después del punto.');
      } else if (fin(c)) break;
      const b = rep();
      a = { t: 'cat', a, b, txt: src.slice(ini, i).trim() };
    }
    return a;
  }
  function rep() {
    ver();
    const ini = i;
    let a = atomo();
    for (let c = ver(); c === '*' || c === '+' || c === '?'; c = ver()) {
      i += 1;
      a = { t: c === '*' ? 'star' : c === '+' ? 'plus' : 'opt', a, txt: src.slice(ini, i).trim() };
    }
    return a;
  }
  function clase() {
    const ini = i;
    i += 1;
    const cierra = src.indexOf(']', i);
    if (cierra < 0) falla('Falta cerrar el corchete.');
    const dentro = src.slice(i, cierra).replace(/\s+/g, '');
    i = cierra + 1;
    const simbolos = [];
    for (let j = 0; j < dentro.length; j += 1) {
      const a = dentro[j];
      if (!esSimbolo(a)) falla(`«${a}» no puede ir en una clase. Van letras o dígitos, como [abc] o [a-c].`);
      if ((dentro[j + 1] === '-' || dentro[j + 1] === '–') && j + 2 < dentro.length) {
        const b = dentro[j + 2];
        const x = a.codePointAt(0);
        const y = b.codePointAt(0);
        if (!esSimbolo(b) || y < x || y - x > 25) falla(`El rango ${a}-${b} no sirve. Va de menor a mayor, como a-c o 0-9.`);
        for (let k = x; k <= y; k += 1) simbolos.push(String.fromCodePoint(k));
        j += 2;
      } else simbolos.push(a);
    }
    const unicos = [...new Set(simbolos)];
    if (!unicos.length) falla('Hay un par de corchetes vacío.');
    if (unicos.length > 26) falla('La clase tiene más de 26 símbolos.');
    const txt = src.slice(ini, i);
    let n = { t: 'sim', c: unicos[0], txt: unicos[0] };
    unicos.slice(1).forEach((c, k) => {
      n = { t: 'alt', a: n, b: { t: 'sim', c, txt: c }, txt: unicos.slice(0, k + 2).join('|') };
    });
    return { ...n, txtP: txt, clase: txt };
  }
  function atomo() {
    const c = ver();
    const ini = i;
    if (c === undefined) falla('Falta una parte de la expresión.');
    if (c === '(') {
      i += 1;
      if (ver() === ')') falla('Hay un par de paréntesis vacío.');
      const a = alt();
      if (ver() !== ')') falla('Falta cerrar un paréntesis.');
      i += 1;
      return { ...a, txtP: src.slice(ini, i).trim() };
    }
    if (c === '[') return clase();
    if (c === 'ε') {
      i += 1;
      return { t: 'eps', txt: 'ε' };
    }
    if (esSimbolo(c)) {
      i += 1;
      return { t: 'sim', c, txt: c };
    }
    if (c === ')') falla('Sobra un paréntesis que cierra.');
    if (c === '*' || c === '+' || c === '?') falla(`El ${c} va después de un símbolo o de un paréntesis.`);
    if (c === '|') falla('Falta algo antes de una |.');
    if (c === '.') falla('Falta algo antes del punto.');
    return falla(`No entiendo «${c}». Los símbolos son letras o dígitos. Los operadores son | . * + ? y los paréntesis.`);
  }
  if (!src.trim()) falla('Escribí una expresión regular, como a(a|b)*b.');
  if (src.length > MAX_LARGO) falla(`La expresión pasa de ${MAX_LARGO} caracteres.`);
  const r = alt();
  if (ver() === ')') falla('Sobra un paréntesis que cierra.');
  if (ver() !== undefined) falla(`No entiendo «${src[i]}».`);
  if (tamano(r) > MAX_ESTADOS) falla(`Esa expresión arma un AFN de más de ${MAX_ESTADOS} estados.`);
  return r;
}

const verTxt = (n) => n.txtP || n.txt;
const tamano = (n) => ({ sim: 2, eps: 2 }[n.t] ?? (n.t === 'cat' ? tamano(n.a) + tamano(n.b) - 1 : n.t === 'alt' ? tamano(n.a) + tamano(n.b) + 2 : n.t === 'star' ? tamano(n.a) + 2 : n.t === 'plus' ? 2 * tamano(n.a) + 1 : tamano(n.a) + 4));
const soloVacia = (n) => (n.t === 'eps' ? true : n.t === 'sim' ? false : n.t === 'alt' || n.t === 'cat' ? soloVacia(n.a) && soloVacia(n.b) : soloVacia(n.a));
const tieneVacia = (n) => (n.t === 'eps' || n.t === 'star' || n.t === 'opt' ? true : n.t === 'sim' ? false : n.t === 'alt' ? tieneVacia(n.a) || tieneVacia(n.b) : n.t === 'cat' ? tieneVacia(n.a) && tieneVacia(n.b) : tieneVacia(n.a));
/** The first closure that can repeat a non-empty word, which is what makes the language infinite. */
const cerraduraQueRepite = (n) => {
  if ((n.t === 'star' || n.t === 'plus') && !soloVacia(n.a)) return n;
  return n.a ? cerraduraQueRepite(n.a) || (n.b ? cerraduraQueRepite(n.b) : null) : null;
};

/**
 * Thompson as the notes number it: each state gets its number when its rule creates it, left to right, and in s.t the
 * final state of N(s) is the start of N(t). Each step is one rule, in the order the notes build them. `pos` places each
 * state on a grid (columns to the right, rows over and under the line of the start), and `curvas` are the ε of a
 * closure that go around: back over it and the jump under it.
 */
export function thompson(raiz) {
  const aristas = [];
  const pasos = [];
  const pasoDe = [];
  const pos = [];
  const curvas = new Map();
  let n = 0;
  const nuevo = () => {
    n += 1;
    return n - 1;
  };
  const arista = (de, a, c) => aristas.push({ de, a, c, paso: -1 }) - 1;
  const paso = (regla, para, texto, estados, ars) => {
    const k = pasos.length;
    pasos.push({ regla, para, texto });
    estados.forEach((s) => (pasoDe[s] = k));
    ars.forEach((x) => (aristas[x].paso = k));
  };
  function hacer(nodo, inicio) {
    if (nodo.t === 'sim' || nodo.t === 'eps') {
      const i = inicio ?? nuevo();
      const f = nuevo();
      const c = nodo.t === 'eps' ? 'ε' : nodo.c;
      paso(nodo.t === 'eps' ? '1' : '2', c, `Una arista ${c} del ${i} al ${f}.`, inicio === undefined ? [i, f] : [f], [arista(i, f, c)]);
      return { i, f, w: 1, up: 0.5, down: 0.5, colocar: (x, y) => {
        pos[i] = { x, y };
        pos[f] = { x: x + 1, y };
      } };
    }
    if (nodo.t === 'cat' || nodo.t === 'plus') {
      const izq = nodo.a;
      const der = nodo.t === 'cat' ? nodo.b : { t: 'star', a: nodo.a, txt: `${verTxt(nodo.a)}*` };
      const s = hacer(izq, inicio);
      const t = hacer(der, s.f);
      const como = nodo.t === 'plus' ? `, que es ${verTxt(nodo.a)}${verTxt(nodo.a)}*` : '';
      paso('3.b', `${nodo.txt}${como}`, `En serie. El final de ${verTxt(izq)}, el ${s.f}, se fusiona con el inicio de ${verTxt(der)}.`, [], []);
      return { i: s.i, f: t.f, w: s.w + t.w, up: Math.max(s.up, t.up), down: Math.max(s.down, t.down), colocar: (x, y) => {
        s.colocar(x, y);
        t.colocar(x + s.w, y);
      } };
    }
    if (nodo.t === 'alt' || nodo.t === 'opt') {
      const a = nodo.a;
      const b = nodo.t === 'alt' ? nodo.b : { t: 'eps', txt: 'ε' };
      const i = inicio ?? nuevo();
      const s = hacer(a);
      const t = hacer(b);
      const f = nuevo();
      const xs = [arista(i, s.i, 'ε'), arista(i, t.i, 'ε'), arista(s.f, f, 'ε'), arista(t.f, f, 'ε')];
      const que = nodo.t === 'opt' ? `${nodo.txt}, que es ${verTxt(a)}|ε` : nodo.clase ? `${nodo.txt}, de ${nodo.clase}` : nodo.txt;
      paso('3.a', que, `En paralelo. Un inicio ${i} que va con ε al ${s.i} y al ${t.i}. Un final ${f} al que llegan con ε el ${s.f} y el ${t.f}.`, inicio === undefined ? [i, f] : [f], xs);
      const G = 0.25;
      const w = Math.max(s.w, t.w) + 2;
      return { i, f, w, up: s.up + s.down + G, down: t.up + t.down + G, colocar: (x, y) => {
        pos[i] = { x, y };
        s.colocar(x + 1 + (w - 2 - s.w) / 2, y - s.down - G);
        t.colocar(x + 1 + (w - 2 - t.w) / 2, y + t.up + G);
        pos[f] = { x: x + w, y };
      } };
    }
    // star
    const i = inicio ?? nuevo();
    const s = hacer(nodo.a);
    const f = nuevo();
    const vuelta = arista(s.f, s.i, 'ε');
    const salto = arista(i, f, 'ε');
    const xs = [arista(i, s.i, 'ε'), vuelta, arista(s.f, f, 'ε'), salto];
    paso('3.c', nodo.txt, `Un inicio ${i} y un final ${f}. Con ε, del ${i} al ${s.i} para entrar y del ${i} al ${f} para no pasar nunca. Del ${s.f}, con ε, al ${s.i} para repetir y al ${f} para salir.`, inicio === undefined ? [i, f] : [f], xs);
    return { i, f, w: s.w + 2, up: s.up + 0.45, down: s.down + 0.45, colocar: (x, y) => {
      pos[i] = { x, y };
      s.colocar(x + 1, y);
      pos[f] = { x: x + s.w + 2, y };
      curvas.set(vuelta, { arriba: true, nivel: y - s.up - 0.25 });
      curvas.set(salto, { arriba: false, nivel: y + s.down + 0.25 });
    } };
  }
  const r = hacer(raiz);
  r.colocar(0, 0);
  const alfabeto = [];
  aristas.forEach((a) => {
    if (a.c !== 'ε' && !alfabeto.includes(a.c)) alfabeto.push(a.c);
  });
  const sale = Array.from({ length: n }, () => []);
  aristas.forEach((a) => sale[a.de].push(a));
  return { n, inicio: r.i, final: r.f, aristas, sale, pasos, pasoDe, pos, curvas, alfabeto, w: r.w, up: r.up, down: r.down };
}

const cerradura = (afn, T) => {
  const vistos = new Set(T);
  const pila = [...T];
  while (pila.length) {
    const s = pila.pop();
    for (const a of afn.sale[s]) {
      if (a.c === 'ε' && !vistos.has(a.a)) {
        vistos.add(a.a);
        pila.push(a.a);
      }
    }
  }
  return [...vistos].sort((x, y) => x - y);
};
const mueve = (afn, T, c) => [...new Set(T.flatMap((s) => afn.sale[s].filter((a) => a.c === c).map((a) => a.a)))].sort((x, y) => x - y);
export const letra = (j) => (j < 26 ? String.fromCharCode(65 + j) : `Q${j}`);
export const conj = (xs) => `{${xs.join(',')}}`;

/** Subset construction as in the notes: A = cerradura-ε(s₀), and cerradura-ε(mueve(T, a)) for each set and symbol. */
export function afd(afn) {
  const estados = [];
  const idx = new Map();
  const cuentas = [];
  const agregar = (T) => {
    const k = T.join(',');
    if (!idx.has(k)) {
      idx.set(k, estados.length);
      estados.push({ T, final: T.includes(afn.final), trans: {} });
    }
    return idx.get(k);
  };
  agregar(cerradura(afn, [afn.inicio]));
  for (let q = 0; q < estados.length; q += 1) {
    for (const c of afn.alfabeto) {
      const m = mueve(afn, estados[q].T, c);
      if (!m.length) {
        estados[q].trans[c] = -1;
        cuentas.push({ de: q, c, m, vacio: true });
        continue;
      }
      const T = cerradura(afn, m);
      const nuevo = !idx.has(T.join(','));
      const j = agregar(T);
      if (estados.length > MAX_AFD) return null;
      estados[q].trans[c] = j;
      cuentas.push({ de: q, c, m, T, a: j, nuevo });
    }
  }
  return { estados, cuentas };
}

/** Words of exactly length r, in the order of the alphabet, using the automaton without trying dead ends. */
function palabrasDe(d, alfabeto, MAXL) {
  const llega = [d.estados.map((e) => e.final)];
  for (let r = 1; r <= MAXL; r += 1) llega.push(d.estados.map((e) => alfabeto.some((c) => e.trans[c] >= 0 && llega[r - 1][e.trans[c]])));
  const largos = [];
  for (let r = 0; r <= MAXL; r += 1) if (llega[r][0]) largos.push(r);
  const listar = (r, tope) => {
    const out = [];
    const ir = (q, falta, pref) => {
      if (out.length > tope) return;
      if (!falta) {
        out.push(pref);
        return;
      }
      for (const c of alfabeto) {
        const t = d.estados[q].trans[c];
        if (t >= 0 && llega[falta - 1][t]) ir(t, falta - 1, pref + c);
      }
    };
    ir(0, r, '');
    return out;
  };
  return { largos, listar };
}

/** What the language of r is: finite or not and why, whether ε is in it, and its shortest words. */
export function lenguaje(raiz, afn, d) {
  const repite = cerraduraQueRepite(raiz);
  const out = { infinito: Boolean(repite), repite: repite?.txt ?? null, soloVacia: soloVacia(raiz), conVacia: tieneVacia(raiz), cortas: null, siguientes: null, todas: null };
  if (!d) return out;
  const p = palabrasDe(d, afn.alfabeto, 50);
  const TOPE = 12;
  const de = (r) => {
    const ws = p.listar(r, TOPE);
    return { largo: r, palabras: ws.slice(0, TOPE), mas: ws.length > TOPE };
  };
  const [m, sig] = p.largos;
  if (m !== undefined) out.cortas = de(m);
  if (sig !== undefined) out.siguientes = de(sig);
  if (!repite && p.largos.length) {
    const todas = p.largos.flatMap((x) => p.listar(x, 40));
    if (todas.length <= 40) out.todas = todas;
  }
  return out;
}

/** A string tried on the DFA: each move, and whether it ends accepted, not accepted or aborted, as the notes say. */
export function probar(afn, d, texto) {
  const w = texto === 'ε' ? '' : texto.replace(/\s+/g, '').replace(/ε/g, '');
  const pasos = [];
  let q = 0;
  for (const c of w) {
    const t = afn.alfabeto.includes(c) ? d.estados[q].trans[c] : -1;
    if (t < 0) return { w, pasos, fin: q, resultado: 'abortada', fuera: !afn.alfabeto.includes(c), con: c };
    pasos.push({ de: q, c, a: t });
    q = t;
  }
  return { w, pasos, fin: q, resultado: d.estados[q].final ? 'aceptada' : 'no aceptada' };
}

/** Everything the sheet shows of r. */
export function resolverER(src) {
  const raiz = leerER(src);
  const afn = thompson(raiz);
  const d = afd(afn);
  return { raiz, afn, d, lenguaje: lenguaje(raiz, afn, d) };
}
