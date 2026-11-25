// Determinant, inverse, rank and echelon form with exact fractions, step by step. The method and its order of
// operations are El Santo Resumen's (its simulator core, the matrix simulator of Álgebra y Geometría Analítica): Gaussian
// elimination with the first nonzero pivot of each column, Gauss-Jordan on [A | I] for the inverse, as in the course
// notes ([A | I] ~ … ~ [I | A⁻¹]). Each step says which rows changed and where the pivot is, so the sheet can mark them.

export const MAX = 6;

const mcd = (a, b) => {
  let x = a < 0n ? -a : a;
  let y = b < 0n ? -b : b;
  while (y) [x, y] = [y, x % y];
  return x;
};

/** An exact fraction n/d, reduced, with the sign on top. */
export const fr = (n, d = 1n) => {
  const g = mcd(n, d) || 1n;
  const s = d < 0n ? -1n : 1n;
  return { n: (s * n) / g, d: (s * d) / g };
};
const mas = (a, b) => fr(a.n * b.d + b.n * a.d, a.d * b.d);
const menos = (a, b) => fr(a.n * b.d - b.n * a.d, a.d * b.d);
const por = (a, b) => fr(a.n * b.n, a.d * b.d);
const entre = (a, b) => fr(a.n * b.d, a.d * b.n);
export const esCero = (a) => a.n === 0n;
const esUno = (a) => a.n === 1n && a.d === 1n;
const CERO = fr(0n);
const UNO = fr(1n);
const opuesto = (a) => fr(-a.n, a.d);

/** «−3», «2/5». */
export const textoFr = (a) => `${a.n < 0n ? '−' : ''}${a.n < 0n ? -a.n : a.n}${a.d === 1n ? '' : `/${a.d}`}`;

/** Reads «3», «-2,5», «0.25» or «1/3». Null when it is not a number. Empty is null too. */
export function leerFr(txt) {
  const t = String(txt).trim().replace(/−/g, '-').replace(',', '.');
  const q = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/.exec(t);
  if (q) return BigInt(q[2]) === 0n ? null : fr(BigInt(q[1]), BigInt(q[2]));
  const m = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(t);
  if (!m || (!m[2] && !m[3]) || t.length > 24) return null;
  const dec = m[3] || '';
  const v = fr(BigInt((m[2] || '0') + dec), 10n ** BigInt(dec.length));
  return m[1] === '-' ? opuesto(v) : v;
}

const copia = (M) => M.map((f) => f.slice());

/**
 * Gaussian elimination. `reducida` also clears above each pivot and turns pivots into 1 (Gauss-Jordan). `columnas`:
 * how many columns choose pivots (the left block of [A | I]). Steps: { tipo: 'cambio', a, b } swaps rows a and b;
 * { tipo: 'escalar', fila, k } is Ffila = k·Ffila; { tipo: 'restar', fila, k, con } is Ffila = Ffila − k·Fcon. Each
 * one with the matrix after it, the rows it changed and the pivot it works with (0-based).
 */
export function escalonar(A, { reducida = false, columnas = A[0].length } = {}) {
  const M = copia(A);
  const pasos = [];
  const filas = M.length;
  let r = 0;
  let signo = 1;
  const pivotes = [];
  for (let c = 0; c < columnas && r < filas; c += 1) {
    let piv = -1;
    for (let i = r; i < filas; i += 1) {
      if (!esCero(M[i][c])) {
        piv = i;
        break;
      }
    }
    if (piv < 0) continue;
    const pivote = { fila: r, columna: c };
    if (piv !== r) {
      [M[piv], M[r]] = [M[r], M[piv]];
      signo = -signo;
      pasos.push({ tipo: 'cambio', a: r, b: piv, matriz: copia(M), cambiadas: [r, piv], pivote });
    }
    if (reducida && !esUno(M[r][c])) {
      const k = entre(UNO, M[r][c]);
      M[r] = M[r].map((v) => por(v, k));
      pasos.push({ tipo: 'escalar', fila: r, k, matriz: copia(M), cambiadas: [r], pivote });
    }
    for (let i = reducida ? 0 : r + 1; i < filas; i += 1) {
      if (i === r || esCero(M[i][c])) continue;
      const k = entre(M[i][c], M[r][c]);
      M[i] = M[i].map((v, j) => menos(v, por(k, M[r][j])));
      pasos.push({ tipo: 'restar', fila: i, k, con: r, matriz: copia(M), cambiadas: [i], pivote });
    }
    pivotes.push(pivote);
    r += 1;
  }
  return { matriz: M, pasos, rango: r, signo, pivotes };
}

/** The determinant: triangular by rows, then the product of the diagonal, with the sign of the swaps. */
export function determinante(M) {
  if (M.length !== M[0].length) return null;
  const e = escalonar(M);
  const diagonal = e.matriz.map((f, i) => f[i]);
  const valor = diagonal.reduce((d, v) => por(d, v), fr(BigInt(e.signo)));
  return { valor, pasos: e.pasos, final: e.matriz, diagonal, cambios: e.pasos.filter((p) => p.tipo === 'cambio').length };
}

export function rango(M) {
  const e = escalonar(M);
  return { valor: e.rango, pasos: e.pasos, final: e.matriz, pivotes: e.pivotes };
}

/** The inverse by Gauss-Jordan on [A | I]. Without one when the rank of A is less than its size. */
export function inversa(M) {
  const n = M.length;
  if (n !== M[0].length) return null;
  const aumentada = M.map((f, i) => [...f, ...f.map((_, j) => (i === j ? UNO : CERO))]);
  const e = escalonar(aumentada, { reducida: true, columnas: n });
  if (e.rango < n) return { existe: false, pasos: e.pasos, inicial: aumentada, rango: e.rango };
  return { existe: true, valor: e.matriz.map((f) => f.slice(n)), pasos: e.pasos, inicial: aumentada, final: e.matriz };
}

/** The cells as typed into fractions, or the first one that is not a number (0-based) as { fila, columna, texto }. */
export function leerMatriz(valores) {
  const M = [];
  for (let i = 0; i < valores.length; i += 1) {
    M.push([]);
    for (let j = 0; j < valores[i].length; j += 1) {
      const v = leerFr(valores[i][j]);
      if (!v) return { error: { fila: i, columna: j, texto: String(valores[i][j]).trim() } };
      M[i].push(v);
    }
  }
  return { matriz: M };
}

export { mas, menos, por, entre };
