import { dec } from '../formulas/decimales.js';

// How the two graphers write a number and a list: on the sheet, and in the text they hand to whoever can't look at
// the drawing (enTexto of graficadora.js and graficadora3d.js).

export const n = (v) => dec(v, 4);
/** «= 2» for a round value, «≈ 1,7321» for one that was cut. */
export const igualA = (v) => `${Number(v.toFixed(4)) === v ? '=' : '≈'} ${n(v)}`;
export const lista = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`);
