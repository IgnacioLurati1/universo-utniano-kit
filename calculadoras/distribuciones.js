// The distributions of Probabilidad y Estadística as the course notes define them (V.A.D., V.A.C. and Material 5 of
// El Santo Resumen): Binomial, Hipergeométrica, Poisson,
// Normal, Exponencial, Uniforme, t de Student and Chi-cuadrado. The numeric pieces (log-gamma, the normal's
// distribution, the incomplete gamma and beta, inversion by halves) are the simulator's of El Santo Resumen
// (its simulator code), ported as they are.

/** ln Γ(x), Lanczos. */
export function lgam(x) {
  const c = [76.18009172947146, -86.50532032941678, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let t = x + 5.5;
  t -= (x + 0.5) * Math.log(t);
  let s = 1.000000000190015;
  for (const v of c) {
    y += 1;
    s += v / y;
  }
  return -t + Math.log((2.5066282746310007 * s) / x);
}

/** ln of the binomial coefficient. −∞ outside 0..a. */
const lnComb = (a, b) => (b < 0 || b > a ? -Infinity : lgam(a + 1) - lgam(b + 1) - lgam(a - b + 1));

/** The binomial coefficient itself, exact while it fits (product of integers, each step stays an integer). */
export function combinatorio(a, b) {
  if (b < 0 || b > a) return 0;
  const k = Math.min(b, a - b);
  let r = 1;
  for (let i = 1; i <= k; i += 1) r = (r * (a - k + i)) / i;
  return r < 1e15 ? Math.round(r) : r;
}

/** Φ(x), the standard normal's distribution (Hart, as El Santo Resumen). */
export function fiNormal(x) {
  const a = Math.abs(x);
  let c = 0;
  if (a <= 37) {
    const e = Math.exp((-a * a) / 2);
    if (a < 7.07106781186547) {
      let b = 3.52624965998911e-2 * a + 0.700383064443688;
      b = b * a + 6.37396220353165;
      b = b * a + 33.912866078383;
      b = b * a + 112.079291497871;
      b = b * a + 221.213596169931;
      b = b * a + 220.206867912376;
      c = e * b;
      b = 8.83883476483184e-2 * a + 1.75566716318264;
      b = b * a + 16.064177579207;
      b = b * a + 86.7807322029461;
      b = b * a + 296.564248779674;
      b = b * a + 637.333633378831;
      b = b * a + 793.826512519948;
      b = b * a + 440.413735824752;
      c /= b;
    } else {
      let b = a + 0.65;
      b = a + 4 / b;
      b = a + 3 / b;
      b = a + 2 / b;
      b = a + 1 / b;
      c = e / b / 2.506628274631;
    }
  }
  return x > 0 ? 1 - c : c;
}

/** The regularized lower incomplete gamma P(a, x). */
function gammaInf(a, x) {
  if (x <= 0) return 0;
  const pre = Math.exp(-x + a * Math.log(x) - lgam(a));
  if (x < a + 1) {
    let ap = a;
    let del = 1 / a;
    let s = del;
    for (let i = 0; i < 2000; i += 1) {
      ap += 1;
      del *= x / ap;
      s += del;
      if (Math.abs(del) < Math.abs(s) * 1e-15) break;
    }
    return s * pre;
  }
  let b = x + 1 - a;
  let c = 1e300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 2000; i += 1) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return 1 - pre * h;
}

function betaCf(a, b, x) {
  let c = 1;
  let d = 1 - ((a + b) * x) / (a + 1);
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d;
  let h = d;
  for (let m = 1; m < 2000; m += 1) {
    let aa = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-15) break;
  }
  return h;
}

function betaReg(a, b, x) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const pre = Math.exp(lgam(a + b) - lgam(a) - lgam(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (pre * betaCf(a, b, x)) / a : 1 - (pre * betaCf(b, a, 1 - x)) / b;
}

/** P(T < x) for the t de Student with g degrees of freedom. */
export function acumT(g, x) {
  const cola = betaReg(g / 2, 0.5, g / (g + x * x)) / 2;
  return x > 0 ? 1 - cola : cola;
}

/** P(χ² < x) with g degrees of freedom. */
export const acumChi = (g, x) => gammaInf(g / 2, x / 2);

/** The x where F(x) = p, by halves between a and b (F grows). */
export function invertir(F, p, a, b) {
  let lo = a;
  let hi = b;
  for (let i = 0; i < 200; i += 1) {
    const m = (lo + hi) / 2;
    if (F(m) < p) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

// ----- The models. Each field: its symbol, its name, and what it accepts (the simulator's checks).
export const CAMPOS = {
  n: { simbolo: 'n', nombre: 'ensayos', entero: true, min: 1 },
  pi: { simbolo: 'π', nombre: 'probabilidad de éxito', abierto: true },
  k: { simbolo: 'k', nombre: 'valor', entero: true, min: 0 },
  N: { simbolo: 'N', nombre: 'tamaño del lote', entero: true, min: 1 },
  r: { simbolo: 'r', nombre: 'defectuosos en el lote', entero: true, min: 0 },
  m: { simbolo: 'n', nombre: 'tamaño de la muestra', entero: true, min: 1 },
  lam: { simbolo: 'λ', nombre: 'promedio', positivo: true },
  mu: { simbolo: 'μ', nombre: 'media' },
  sig: { simbolo: 'σ', nombre: 'desvío', positivo: true },
  a: { simbolo: 'a', nombre: 'extremo izquierdo' },
  b: { simbolo: 'b', nombre: 'extremo derecho' },
  g: { simbolo: 'g', nombre: 'grados de libertad', entero: true, min: 1 },
};

/** Checks one field. '' when it is right, or what is wrong, said for the student. */
export function revisarCampo(clave, valor) {
  const C = CAMPOS[clave] ?? {};
  if (C.entero && !Number.isInteger(valor)) return `${C.simbolo} tiene que ser un entero.`;
  if (C.min !== undefined && valor < C.min) return `${C.simbolo} tiene que ser ${C.min} o más.`;
  if (C.positivo && !(valor > 0)) return `${C.simbolo} tiene que ser mayor que 0.`;
  if (C.abierto && !(valor > 0 && valor < 1)) return `${C.simbolo} va entre 0 y 1, sin incluirlos.`;
  return '';
}

const poissonPmf = (lam) => (i) => Math.exp(i * Math.log(lam) - lam - lgam(i + 1));

export const MODELOS = {
  binomial: {
    nombre: 'Binomial',
    discreta: true,
    variable: 'X',
    campos: ['n', 'pi'],
    pmf: ({ n, pi }) => (i) => (i < 0 || i > n ? 0 : Math.exp(lnComb(n, i) + i * Math.log(pi) + (n - i) * Math.log(1 - pi))),
    rango: ({ n }) => [0, n],
    esperanza: ({ n, pi }) => n * pi,
    varianza: ({ n, pi }) => n * pi * (1 - pi),
  },
  hipergeometrica: {
    nombre: 'Hipergeométrica',
    discreta: true,
    variable: 'X',
    campos: ['N', 'r', 'm'],
    revisar: ({ N, r, m }) => (r > N ? 'r no puede pasar a N.' : m > N ? 'n no puede pasar a N.' : ''),
    pmf: ({ N, r, m }) => (i) => (i < Math.max(0, m - (N - r)) || i > Math.min(m, r) ? 0 : Math.exp(lnComb(r, i) + lnComb(N - r, m - i) - lnComb(N, m))),
    rango: ({ N, r, m }) => [Math.max(0, m - (N - r)), Math.min(m, r)],
    esperanza: ({ N, r, m }) => (m * r) / N,
    varianza: ({ N, r, m }) => (N > 1 ? (m * (r / N) * (1 - r / N) * (N - m)) / (N - 1) : 0),
  },
  poisson: {
    nombre: 'Poisson',
    discreta: true,
    variable: 'X',
    campos: ['lam'],
    pmf: ({ lam }) => (i) => (i < 0 ? 0 : poissonPmf(lam)(i)),
    // Infinite: up to where what's left is less than 1 in 10 000, and never shorter than the mean plus four desvíos.
    rango: ({ lam }) => {
      const p = poissonPmf(lam);
      let acum = 0;
      let i = 0;
      while (i < 2000 && (acum < 0.9999 || i < lam + 4 * Math.sqrt(lam))) {
        acum += p(i);
        i += 1;
      }
      return [0, i - 1];
    },
    esperanza: ({ lam }) => lam,
    varianza: ({ lam }) => lam,
  },
  normal: {
    nombre: 'Normal',
    variable: 'X',
    campos: ['mu', 'sig'],
    F: ({ mu, sig }) => (x) => fiNormal((x - mu) / sig),
    inversa: ({ mu, sig }) => (p) => mu + sig * invertir(fiNormal, p, -40, 40),
    densidad: ({ mu, sig }) => (x) => Math.exp(-0.5 * ((x - mu) / sig) ** 2) / (sig * Math.sqrt(2 * Math.PI)),
    soporte: ({ mu, sig }) => [mu - 4 * sig, mu + 4 * sig],
    esperanza: ({ mu }) => mu,
    varianza: ({ sig }) => sig * sig,
  },
  exponencial: {
    nombre: 'Exponencial',
    variable: 'T',
    campos: ['lam'],
    F: ({ lam }) => (t) => (t <= 0 ? 0 : 1 - Math.exp(-lam * t)),
    inversa: ({ lam }) => (p) => -Math.log(1 - p) / lam,
    densidad: ({ lam }) => (t) => (t < 0 ? 0 : lam * Math.exp(-lam * t)),
    soporte: ({ lam }) => [0, 5 / lam],
    esperanza: ({ lam }) => 1 / lam,
    varianza: ({ lam }) => 1 / (lam * lam),
  },
  uniforme: {
    nombre: 'Uniforme',
    variable: 'X',
    campos: ['a', 'b'],
    revisar: ({ a, b }) => (a >= b ? 'a tiene que ser menor que b.' : ''),
    F: ({ a, b }) => (x) => Math.min(1, Math.max(0, (x - a) / (b - a))),
    inversa: ({ a, b }) => (p) => a + p * (b - a),
    densidad: ({ a, b }) => (x) => (x < a || x > b ? 0 : 1 / (b - a)),
    soporte: ({ a, b }) => [a - (b - a) * 0.25, b + (b - a) * 0.25],
    esperanza: ({ a, b }) => (a + b) / 2,
    varianza: ({ a, b }) => (b - a) ** 2 / 12,
  },
  student: {
    nombre: 't de Student',
    variable: 'T',
    campos: ['g'],
    F: ({ g }) => (x) => acumT(g, x),
    inversa: ({ g }) => (p) => invertir((v) => acumT(g, v), p, -1e5, 1e5),
    densidad: ({ g }) => (x) => Math.exp(lgam((g + 1) / 2) - lgam(g / 2) - 0.5 * Math.log(g * Math.PI) - ((g + 1) / 2) * Math.log(1 + (x * x) / g)),
    soporte: () => [-4.5, 4.5],
  },
  chi: {
    nombre: 'Chi-cuadrado',
    variable: 'χ²',
    campos: ['g'],
    F: ({ g }) => (x) => acumChi(g, x),
    inversa: ({ g }) => (p) => invertir((v) => acumChi(g, v), p, 0, g + 200 * Math.sqrt(2 * g) + 1000),
    densidad: ({ g }) => (x) => (x <= 0 ? 0 : Math.exp((g / 2 - 1) * Math.log(x) - x / 2 - (g / 2) * Math.log(2) - lgam(g / 2))),
    soporte: ({ g }) => [0, g + 5 * Math.sqrt(2 * g) + 2],
  },
};

/**
 * What a discrete model gives for the asked probability. `que`: 'igual' P(X = k), 'hasta' P(X ≤ k) or 'desde'
 * P(X ≥ k). `terminos`: each P(X = i) summed (for 'desde', the ones of the complement, P(X ≤ k − 1)).
 */
export function discreta(modelo, d, que, k) {
  const M = MODELOS[modelo];
  const p = M.pmf(d);
  const [desde, hasta] = M.rango(d);
  const puntual = p(k);
  const hastaK = (tope) => {
    const terminos = [];
    for (let i = desde; i <= Math.min(tope, hasta); i += 1) terminos.push({ i, p: p(i) });
    return { terminos, suma: Math.min(1, terminos.reduce((s, t) => s + t.p, 0)) };
  };
  let valor = puntual;
  let terminos = [];
  let complemento = null;
  if (que === 'hasta') {
    const r = hastaK(k);
    terminos = r.terminos;
    valor = r.suma;
  } else if (que === 'desde') {
    const r = hastaK(k - 1);
    terminos = r.terminos;
    complemento = r.suma;
    valor = Math.max(0, 1 - r.suma);
  }
  const tabla = [];
  for (let i = desde; i <= hasta; i += 1) tabla.push({ i, p: p(i) });
  return { valor, puntual, terminos, complemento, tabla, esperanza: M.esperanza(d), varianza: M.varianza(d) };
}

/**
 * What a continuous model gives. `que`: 'menor' P(X < x), 'mayor' P(X > x), 'entre' P(x₁ < X < x₂) or 'percentil'
 * (the value that accumulates p).
 */
export function continua(modelo, d, que, { x, x2, p }) {
  const M = MODELOS[modelo];
  const F = M.F(d);
  const base = { esperanza: M.esperanza?.(d), varianza: M.varianza?.(d) };
  if (que === 'percentil') {
    const valor = M.inversa(d)(p);
    const z = modelo === 'normal' ? (valor - d.mu) / d.sig : undefined;
    return { ...base, valor, z };
  }
  if (que === 'entre') {
    const F1 = F(x);
    const F2 = F(x2);
    return { ...base, valor: Math.max(0, F2 - F1), F1, F2, z1: modelo === 'normal' ? (x - d.mu) / d.sig : undefined, z2: modelo === 'normal' ? (x2 - d.mu) / d.sig : undefined };
  }
  const Fx = F(x);
  return { ...base, valor: que === 'mayor' ? 1 - Fx : Fx, F: Fx, z: modelo === 'normal' ? (x - d.mu) / d.sig : undefined };
}
