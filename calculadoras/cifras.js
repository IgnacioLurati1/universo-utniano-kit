// Numbers as the course notes write them and as a student types them, for the calculators of Probabilidad y
// Estadística, Investigación Operativa and Simulación: a comma for decimals, a dot for thousands («1.095,45», as the
// notes of Gestión de Stocks write them), the real minus sign and ∞. A student types «3,5», «3.5», «−2» or «1/6».

const MENOS = '−';

/**
 * One number typed by the student: «0,4», «0.4», «.4», «−3» or «1/6». { valor } when it is one, { falta: true } when
 * the field is empty and { mal: true } otherwise.
 */
export function leerNumero(texto) {
  const t = String(texto ?? '').trim().replace(/−/g, '-');
  if (!t) return { falta: true };
  const q = /^([+-]?\d+(?:[.,]\d+)?)\s*\/\s*(\d+(?:[.,]\d+)?)$/.exec(t);
  if (q) {
    const d = Number(q[2].replace(',', '.'));
    return d === 0 ? { mal: true } : { valor: Number(q[1].replace(',', '.')) / d };
  }
  if (!/^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/.test(t)) return { mal: true };
  return { valor: Number(t.replace(',', '.')) };
}

/**
 * A list split by spaces, semicolons or commas, as El Santo Resumen reads it: «0,4 1,2» are two decimals; «1,2,3» and
 * «0.4,1.2» are lists. { numeros } or { error } with what went wrong, said for the student.
 */
export function leerLista(texto, tope = Infinity) {
  const fichas = [];
  for (const parte of String(texto ?? '').split(/[\s;]+/)) {
    const p = parte.replace(/^,+|,+$/g, '');
    if (!p) continue;
    const comas = (p.match(/,/g) || []).length;
    if (comas && (p.includes('.') || p.includes('/') || comas > 1)) fichas.push(...p.split(',').filter(Boolean));
    else fichas.push(p);
  }
  if (!fichas.length) return { error: 'Falta la lista.', vacia: true };
  if (fichas.length > tope) return { error: `Son ${fichas.length} números y entran hasta ${tope}.` };
  const numeros = [];
  for (const f of fichas) {
    const r = leerNumero(f);
    if (r.mal) return { error: `«${f}» no es un número.` };
    numeros.push(r.valor);
  }
  return { numeros };
}

/** Rounds to `dec` decimals without the binary noise (0.1 + 0.2 stays 0.3). */
export const redondear = (x, dec = 4) => {
  if (!Number.isFinite(x)) return x;
  const r = Number(Math.round(Number(`${x}e${dec}`)) + `e-${dec}`);
  return Object.is(r, -0) ? 0 : r;
};

/**
 * «1.095,45», «0,2048», «−3», «∞». Up to `dec` decimals, without trailing zeros unless `fijos` (then always `dec`,
 * as «0,90»). Thousands with a dot from four digits on, as the notes write «1.095».
 */
export function coma(x, dec = 4, { fijos = false } = {}) {
  if (x === Infinity) return '∞';
  if (x === -Infinity) return `${MENOS}∞`;
  if (!Number.isFinite(x)) return '';
  const r = redondear(x, dec);
  const [entera, decimales = ''] = Math.abs(r).toFixed(dec).split('.');
  const parte = fijos ? decimales : decimales.replace(/0+$/, '');
  const conPuntos = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${r < 0 ? MENOS : ''}${conPuntos}${parte ? `,${parte}` : ''}`;
}

/** The same between parentheses when it is negative, to write it after an operation: «3 − (−2)». */
export const entreParentesis = (x, dec = 4) => (redondear(x, dec) < 0 ? `(${coma(x, dec)})` : coma(x, dec));

/** «3,5%» from 0,035, as the notes write it. */
export const porcentaje = (x, dec = 2) => `${coma(x * 100, dec)}%`;
