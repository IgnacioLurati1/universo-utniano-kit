// Búsqueda dicotómica of Algoritmos y Estructuras de Datos, as the notes write it (El Santo Resumen,
// «resumen arreglos», page 1): the array sorted, comienzo, fin and medio = (comienzo + fin) DIV 2. If V[medio] is the
// datum it's found; if the datum is smaller, fin = medio − 1; if bigger, comienzo = medio + 1. Until it's found or
// comienzo > fin, and then the function returns −1. Positions from 0 or from 1, as the practice's arrays.
// Logic of El Santo Resumen's simulator (its simulator code).

export const MAX_ELEMENTOS = 64;
const NUM = /^[+\-−]?\d+([.,]\d+)?$/;
const numero = (t) => Number(t.replace('−', '-').replace(',', '.'));

/**
 * The array as typed: numbers or names, split by semicolons, or else commas, or else spaces. With semicolons a
 * number can have a decimal comma («2,5; 3»). { v, numeros } or { error }.
 */
export function leerArreglo(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return { error: 'Falta el arreglo.' };
  const separador = t.includes(';') ? ';' : t.includes(',') ? ',' : /\s+/;
  const partes = t.split(separador).map((p) => p.trim());
  if (partes.some((p) => !p)) return { error: 'Hay un lugar vacío entre dos separadores.' };
  if (partes.length > MAX_ELEMENTOS) return { error: `Son ${partes.length} elementos y entran hasta ${MAX_ELEMENTOS}.` };
  const numeros = partes.every((p) => NUM.test(p));
  return { numeros, v: numeros ? partes.map(numero) : partes };
}

/** The datum, a number if the array is of numbers. { dato } or { error }. */
export function leerDato(texto, numeros) {
  const t = String(texto ?? '').trim();
  if (!t) return { error: 'Falta el dato a buscar.' };
  if (!numeros) return { dato: t };
  if (!NUM.test(t)) return { error: 'El arreglo es de números. El dato también.' };
  return { dato: numero(t) };
}

/** The first pair out of order, or -1. Names compare as a program does, character by character. */
export const desordenado = (v) => v.findIndex((x, i) => i + 1 < v.length && x > v[i + 1]);

/**
 * Each step: comienzo, fin, medio, V[medio] and what follows (encontrado, menor, mayor). The last one, if it isn't
 * found, has comienzo > fin and no medio. `posicion` is −1 when it isn't there.
 */
export function buscar(v, dato, base = 0) {
  const pasos = [];
  let comienzo = base;
  let fin = v.length - 1 + base;
  while (comienzo <= fin) {
    const medio = Math.floor((comienzo + fin) / 2);
    const valor = v[medio - base];
    if (valor === dato) {
      pasos.push({ comienzo, fin, medio, valor, sigue: 'encontrado' });
      return { pasos, posicion: medio, comparaciones: pasos.length };
    }
    const sigue = dato < valor ? 'menor' : 'mayor';
    pasos.push({ comienzo, fin, medio, valor, sigue });
    if (sigue === 'menor') fin = medio - 1;
    else comienzo = medio + 1;
  }
  const comparaciones = pasos.length;
  pasos.push({ comienzo, fin, medio: null, sigue: 'no-esta' });
  return { pasos, posicion: -1, comparaciones };
}
