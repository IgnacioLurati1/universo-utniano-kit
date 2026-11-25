// Measures of a data set, the box plot and a discrete random variable from its table, as the course notes of
// Probabilidad y Estadística define them (El Santo Resumen, probabilidad-y-estadistica/parcial-1.md and parcial-2.md:
// Tratamiento de datos, pág. 20 a 33, and V.A.D., pág. 2 a 6).

/** The frequency table of the data, ordered: each value with its absolute frequency n and its cumulative N. */
export function frecuencias(datos) {
  const cuenta = new Map();
  for (const x of datos) cuenta.set(x, (cuenta.get(x) ?? 0) + 1);
  let N = 0;
  return [...cuenta.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([x, n]) => {
      N += n;
      return { x, n, N };
    });
}

/** A table of values and frequencies, back to the data one by one. */
export const desplegar = (filas) => filas.flatMap(({ x, n }) => Array.from({ length: n }, () => x));

/**
 * Media, mediana, moda, varianza muestral (with n − 1), desvío, rango and coeficiente de variación (pág. 20 a 28).
 * The median of an even n averages the two central data (pág. 22). `tabla` carries each value with x·n and
 * (x − x̄)²·n, the columns of the hand made table.
 */
export function medidas(datos) {
  const orden = [...datos].sort((a, b) => a - b);
  const n = orden.length;
  const suma = orden.reduce((s, x) => s + x, 0);
  const media = suma / n;
  const filas = frecuencias(orden).map((f) => ({ ...f, xn: f.x * f.n, cuadrados: (f.x - media) ** 2 * f.n }));
  const sumaCuadrados = filas.reduce((s, f) => s + f.cuadrados, 0);
  const s2 = n > 1 ? sumaCuadrados / (n - 1) : NaN;
  const s = Math.sqrt(s2);
  const centro = n % 2 ? [(n + 1) / 2] : [n / 2, n / 2 + 1];
  const mediana = centro.reduce((t, p) => t + orden[p - 1], 0) / centro.length;
  const maxFrec = Math.max(...filas.map((f) => f.n));
  // No mode when every value repeats the same: one value alone is its own mode (pág. 22, «puede no haber»).
  const modas = filas.length > 1 && filas.every((f) => f.n === maxFrec) ? [] : filas.filter((f) => f.n === maxFrec).map((f) => f.x);
  const min = orden[0];
  const max = orden[n - 1];
  return { n, orden, filas, suma, media, centro, mediana, modas, maxFrec, sumaCuadrados, s2, s, min, max, rango: max - min, cv: media !== 0 ? s / media : NaN };
}

/**
 * The quartiles as the notes define them: the least value that accumulates at least 25%, 50% or 75% of the ordered
 * data (pág. 20 and 21). The median of an even n averages the two central ones (pág. 22). Whiskers to the minimum and
 * maximum (pág. 32 and 33) or, with `riq`, the rule of 1,5 riq of the Drive's summaries.
 */
export function caja(datos, { bigotes = 'extremos' } = {}) {
  const orden = [...datos].sort((a, b) => a - b);
  const n = orden.length;
  const cuartil = (porcentaje) => {
    const cuanto = (porcentaje * n) / 100;
    const posicion = Math.max(1, Math.ceil(cuanto - 1e-9));
    return { cuanto, posicion, valor: orden[posicion - 1] };
  };
  const q1 = cuartil(25);
  const q3 = cuartil(75);
  const centro = n % 2 ? [(n + 1) / 2] : [n / 2, n / 2 + 1];
  const me = { posiciones: centro, valor: centro.reduce((t, p) => t + orden[p - 1], 0) / centro.length };
  const riq = q3.valor - q1.valor;
  const min = orden[0];
  const max = orden[n - 1];
  const conRiq = bigotes === 'riq';
  const bajo = q1.valor - 1.5 * riq;
  const alto = q3.valor + 1.5 * riq;
  // The rule as the summaries write it: lower whisker max{x_m, q₁ − 1,5 riq}, upper min{x_M, q₃ + 1,5 riq}.
  const bInf = conRiq ? Math.max(min, bajo) : min;
  const bSup = conRiq ? Math.min(max, alto) : max;
  const atipicos = conRiq ? orden.filter((x) => x < bajo - 1e-9 || x > alto + 1e-9) : [];
  return { orden, n, q1, q3, me, riq, min, max, rango: max - min, conRiq, bajo, alto, bInf, bSup, atipicos };
}

/**
 * A discrete random variable from its table: the closing condition (the p add up to 1), E(X) = Σ x·p,
 * V(X) = Σ (x − μ)²·p and σ = √V(X) (V.A.D., pág. 2 to 6). Rows in the order given, with the cumulative F.
 */
export function variableDiscreta(xs, ps) {
  const suma = ps.reduce((s, p) => s + p, 0);
  const esperanza = xs.reduce((s, x, i) => s + x * ps[i], 0);
  let F = 0;
  const filas = xs.map((x, i) => {
    F += ps[i];
    return { x, p: ps[i], xp: x * ps[i], cuadrados: (x - esperanza) ** 2 * ps[i], F };
  });
  const varianza = filas.reduce((s, f) => s + f.cuadrados, 0);
  return { suma, cierra: Math.abs(suma - 1) < 1e-9, filas, esperanza, varianza, desvio: Math.sqrt(varianza) };
}
