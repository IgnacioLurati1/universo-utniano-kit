// Cleans copies of tabs before another piece of your app uses them: rebuilds each block with only the known keys and
// cuts every text, so whatever else was kept never gets through. Pure functions.
import { PESTANAS, TOPES } from './copia.js';

const DIA = 24 * 60 * 60 * 1000;
const CONTROL = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g;

// A string with no control characters, its spaces collapsed and cut, or '' for anything else.
export const texto = (t, tope) => (typeof t === 'string' ? t.replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, tope).trimEnd() : '');

// One block rebuilt with only its keys, or null when it is not valid or is empty.
export const bloque = (b) => {
  if (!b || typeof b !== 'object') return null;
  if (b.t === 'titulo' || b.t === 'texto') {
    const t = texto(b.texto, b.t === 'titulo' ? TOPES.titulo : TOPES.texto);
    return t ? { t: b.t, texto: t } : null;
  }
  if (b.t !== 'tabla' || !Array.isArray(b.columnas) || !Array.isArray(b.filas)) return null;
  const columnas = b.columnas.slice(0, TOPES.columnas).map((c) => texto(c, TOPES.celda));
  const ancho = columnas.length || TOPES.columnas;
  const filas = b.filas
    .filter(Array.isArray)
    .slice(0, TOPES.filas)
    .map((f) => f.slice(0, ancho).map((c) => texto(c, TOPES.celda)));
  if (!columnas.length && !filas.length) return null;
  return { t: 'tabla', titulo: texto(b.titulo, TOPES.titulo) || null, columnas, filas };
};

// `guardadas` is { [clave]: { fecha: ms, bloques } }. Returns [{ clave, titulo, fecha, bloques }] in the order of
// PESTANAS, dropping unknown keys, dates in the future (more than a day ahead) and empty tabs.
export const pestanas = (guardadas, ahora = Date.now()) => {
  if (!guardadas || typeof guardadas !== 'object') return [];
  const limite = ahora + DIA;
  return PESTANAS.flatMap(([clave, , titulo]) => {
    const p = Object.hasOwn(guardadas, clave) ? guardadas[clave] : null;
    if (!p || !Number.isSafeInteger(p.fecha) || p.fecha <= 0 || p.fecha > limite || !Array.isArray(p.bloques)) return [];
    const bloques = p.bloques.map(bloque).filter(Boolean).slice(0, TOPES.bloques);
    return bloques.length ? [{ clave, titulo, fecha: p.fecha, bloques }] : [];
  });
};
