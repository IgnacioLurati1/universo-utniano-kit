import { compilar, intentar, superindice } from './formula.js';

// Real numbers on the sheet, as the course writes them: decimal comma, the real minus sign, and powers of ten for the
// very big or very small (3,6 × 10⁵ N/C, 1,6 × 10⁻¹⁹ C).

const MENOS = '−';

/** With `d` decimals, without the zeros that don't say anything: 14,7802, 0,5, −2,2688. */
export function dec(x, d = 4, { ceros = false } = {}) {
  if (!Number.isFinite(x)) return Number.isNaN(x) ? 'no da un número' : x > 0 ? '∞' : `${MENOS}∞`;
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e9 || a < 10 ** -d / 2) && a < 1e300) return cientifico(x, Math.max(3, Math.min(d, 6)));
  let t = x.toFixed(d);
  if (!ceros && t.includes('.')) t = t.replace(/0+$/, '').replace(/\.$/, '');
  if (/^-0(\.0*)?$/.test(t)) t = t.slice(1);
  return t.replace('.', ',').replace('-', MENOS);
}

/** With powers of ten: 3,6 × 10⁵. `cifras` significant digits. */
export function cientifico(x, cifras = 3) {
  if (!Number.isFinite(x)) return dec(x);
  if (x === 0) return '0';
  const [m, e] = x.toExponential(Math.max(0, cifras - 1)).split('e');
  const mantisa = m.replace(/\.?0+$/, '').replace('.', ',').replace('-', MENOS);
  const exp = Number(e);
  return exp === 0 ? mantisa : `${mantisa}\u00a0×\u00a010${superindice(exp)}`;
}

/** Big or small numbers in powers of ten, the rest with decimals: for physics, where both happen. */
export function fisico(x, cifras = 3) {
  const a = Math.abs(x);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) return cientifico(x, cifras);
  return dec(x, Math.max(0, cifras - 1 - Math.floor(Math.log10(a || 1))));
}

/** The same in a percent: «5,3 %», with four significant digits as in the tables of the notes. */
export const porcentaje = (x) => (x === null || x === undefined ? '' : Number.isFinite(x) ? `${fisico(x, 4)}\u00a0%` : '∞');

/**
 * A number as the student writes it: 3,5 or 3.5, −2, 6e−6, pi/2, 6·10^-6. Gives { v } or { error } in words, with
 * `nombre` in it.
 */
export function leerNumero(texto, nombre) {
  const t = String(texto ?? '').trim().replace(/[−–]/g, '-');
  if (!t) return { error: `Falta ${nombre}.` };
  if (/^[+-]?\d+([.,]\d+)?[eE][+-]?\d+$/.test(t)) return { v: Number(t.replace(',', '.')) };
  const r = intentar(t, []);
  if (r.error) return { error: `${nombre} no es un número.` };
  const v = compilar(r.nodo, [])();
  return Number.isFinite(v) ? { v } : { error: `${nombre} no da un número.` };
}
