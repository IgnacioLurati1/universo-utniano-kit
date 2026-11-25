// Exact fractions with BigInt, for the calculators: a result that drifts by a rounding error is worse than none.
// A fraction is { n, d } with d > 0 and n, d without common factors, so two equal values always look the same.

const abs = (x) => (x < 0n ? -x : x);

export function mcd(a, b) {
  let x = abs(a);
  let y = abs(b);
  while (y) [x, y] = [y, x % y];
  return x;
}

export function frac(n, d = 1n) {
  let num = BigInt(n);
  let den = BigInt(d);
  if (den === 0n) throw new RangeError('denominador cero');
  if (den < 0n) {
    num = -num;
    den = -den;
  }
  const g = mcd(num, den) || 1n;
  return { n: num / g, d: den / g };
}

export const CERO = frac(0);
export const UNO = frac(1);

export const sumar = (a, b) => frac(a.n * b.d + b.n * a.d, a.d * b.d);
export const restar = (a, b) => frac(a.n * b.d - b.n * a.d, a.d * b.d);
export const multiplicar = (a, b) => frac(a.n * b.n, a.d * b.d);
export const negar = (a) => ({ n: -a.n, d: a.d });
export const absoluto = (a) => ({ n: abs(a.n), d: a.d });
export const esCero = (a) => a.n === 0n;
export const esEntero = (a) => a.d === 1n;
export const signo = (a) => (a.n < 0n ? -1 : a.n > 0n ? 1 : 0);
export const iguales = (a, b) => a.n === b.n && a.d === b.d;

export function dividir(a, b) {
  if (b.n === 0n) throw new RangeError('división por cero');
  return frac(a.n * b.d, a.d * b.n);
}

/** -1, 0 or 1. */
export function comparar(a, b) {
  const x = a.n * b.d - b.n * a.d;
  return x < 0n ? -1 : x > 0n ? 1 : 0;
}

/** The integer part toward minus infinity, as a BigInt. */
export function piso(a) {
  const q = a.n / a.d;
  return a.n < 0n && q * a.d !== a.n ? q - 1n : q;
}

/** What is left after the integer part: always in [0, 1). */
export const parteFraccionaria = (a) => restar(a, frac(piso(a)));

export const potencia = (base, exponente) => (exponente >= 0 ? frac(BigInt(base) ** BigInt(exponente)) : frac(1n, BigInt(base) ** BigInt(-exponente)));

// «3», «-3/4», «2,5», «-0.125», «1e3» or «1,5E-2». Spaces around are fine; anything else is not a number.
const DECIMAL = /^([+-]?)(\d*)(?:[.,](\d*))?(?:[eE]([+-]?\d{1,4}))?$/;
const FRACCION = /^([+-]?\d+)\s*\/\s*([+-]?\d+)$/;

/** A fraction from what the student typed, or null. Decimals are exact: «0,1» is 1/10, never a float. */
export function leerFraccion(texto) {
  const t = String(texto ?? '').trim().replace(/−/g, '-');
  if (!t || t.length > 80) return null;
  const f = FRACCION.exec(t);
  if (f) return BigInt(f[2]) === 0n ? null : frac(BigInt(f[1]), BigInt(f[2]));
  const m = DECIMAL.exec(t);
  if (!m || (!m[2] && !m[3])) return null;
  const digitos = `${m[2]}${m[3] ?? ''}` || '0';
  const exponente = Number(m[4] ?? 0) - (m[3]?.length ?? 0);
  const valor = multiplicar(frac(BigInt(digitos)), potencia(10, exponente));
  return m[1] === '-' ? negar(valor) : valor;
}

/** «3», «-3/4». */
export const enTexto = (a) => (a.d === 1n ? `${a.n}` : `${a.n}/${a.d}`);

// How many times a prime divides a number.
function veces(numero, primo) {
  let n = numero;
  let k = 0;
  while (n % primo === 0n) {
    n /= primo;
    k += 1;
  }
  return { k, resto: n };
}

/** Whether the fraction ends in base 10: its denominator has only twos and fives. */
export function terminaEnDecimal(a) {
  return veces(veces(a.d, 2n).resto, 5n).resto === 1n;
}

/** The exact decimal of a fraction that ends in base 10 («0,625», «-12»), with a comma. Null when it doesn't end. */
export function enDecimalExacto(a, separador = ',') {
  const dos = veces(a.d, 2n);
  const cinco = veces(dos.resto, 5n);
  if (cinco.resto !== 1n) return null;
  // d = 2^x 5^y: multiplied by 10^max(x, y) it's an integer.
  const cifras = Math.max(dos.k, cinco.k);
  const escalado = (abs(a.n) * 10n ** BigInt(cifras)) / a.d;
  const texto = escalado.toString().padStart(cifras + 1, '0');
  const entero = texto.slice(0, texto.length - cifras);
  const fraccion = texto.slice(texto.length - cifras).replace(/0+$/, '');
  return `${a.n < 0n ? '-' : ''}${entero}${fraccion ? `${separador}${fraccion}` : ''}`;
}
