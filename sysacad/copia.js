// Turns one Sysacad tab into plain blocks: { t: 'titulo' | 'texto', texto } and { t: 'tabla', titulo, columnas, filas }.
// Only what the page shows as text: titles, paragraphs and tables. Never fields or their values, images, the page's
// header or footer. Pure function over a DOM: nothing is stored or sent.
import { filasDe, normalizar } from './base.js';

// [key, path of the page (lower case), title]
export const PESTANAS = [
  ['estado', '/estadoacademico.asp', 'Estado académico'],
  ['parciales', '/notasparciales.asp', 'Notas de parciales'],
  ['examenes', '/examenes.asp', 'Exámenes'],
  ['plan', '/materiasplan.asp', 'Materias del plan'],
  ['correlativas-cursar', '/correlatividadcursado.asp', 'Correlatividad para cursar'],
  ['correlativas-rendir', '/correlatividadexamen.asp', 'Correlatividad para rendir'],
  ['certificados', '/menucertificados.asp', 'Certificados'],
];

// Limits of a copy: a block, a text, a title, columns, rows, a cell, a student name.
export const TOPES = { bloques: 60, texto: 2000, titulo: 200, columnas: 30, filas: 500, celda: 300, alumno: 120 };

// Lines broken with <br> or blocks inside one cell or paragraph stay apart with this.
const SEPARADOR = ' · ';

// Control characters out, spaces collapsed, cut at `tope`.
export const limpiarTexto = (texto, tope) =>
  texto.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028\u2029\ufeff]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, tope).trimEnd();

const FUERA_DE_LA_COPIA = 'script, style, noscript, template, link, meta, img, picture, svg, canvas, iframe, frame, object, embed, video, audio, map, input, select, option, textarea, button, .header, .footer, [hidden], [aria-hidden="true"]';
const EN_LINEA = new Set(['A', 'ABBR', 'B', 'BIG', 'CITE', 'CODE', 'EM', 'FONT', 'I', 'LABEL', 'MARK', 'NOBR', 'Q', 'S', 'SMALL', 'SPAN', 'STRIKE', 'STRONG', 'SUB', 'SUP', 'TIME', 'TT', 'U']);
const RESALTA = /^(H[1-6]|B|STRONG|TH)$/;
const TEXTO = 3;
const ELEMENTO = 1;

export const esVolver = (texto) => normalizar(texto) === 'volver a menu principal';

const fueraDeLaCopia = (el) =>
  el.matches(FUERA_DE_LA_COPIA) ||
  /display\s*:\s*none|visibility\s*:\s*hidden/i.test(el.getAttribute('style') ?? '') ||
  (el.tagName === 'FORM' && Boolean(el.querySelector('input, select, textarea')));

// Gathers the words under a node. Each <br> or block inside starts a new line. `fuerte` stays true while every word
// is bold, a heading or Sysacad's title style.
export function juntarTexto(nodo, salida = { lineas: [''], fuerte: true }, resaltado = false) {
  for (const hijo of nodo.childNodes) {
    if (hijo.nodeType === TEXTO) {
      salida.lineas[salida.lineas.length - 1] += hijo.data;
      if (hijo.data.trim() && !resaltado) salida.fuerte = false;
      continue;
    }
    if (hijo.nodeType !== ELEMENTO || fueraDeLaCopia(hijo)) continue;
    if (hijo.tagName === 'BR') {
      salida.lineas.push('');
      continue;
    }
    const bloque = !EN_LINEA.has(hijo.tagName);
    if (bloque) salida.lineas.push('');
    juntarTexto(hijo, salida, resaltado || RESALTA.test(hijo.tagName) || hijo.classList.contains('tituloTabla'));
    if (bloque) salida.lineas.push('');
  }
  return salida;
}
const textoJunto = ({ lineas }, tope) => limpiarTexto(lineas.map((l) => limpiarTexto(l, Infinity)).filter(Boolean).join(SEPARADOR), tope);

const esCabeceraDeTabla = (celdas) =>
  celdas.length >= 2 &&
  celdas.some((c) => textoJunto(juntarTexto(c), TOPES.celda)) &&
  celdas.every((c) => {
    const t = juntarTexto(c, undefined, c.tagName === 'TH' || c.classList.contains('tituloTabla'));
    return !textoJunto(t, TOPES.celda) || t.fuerte;
  });

// A data table holds no other table and has at least one row with two cells; the rest only lay the page out.
const esTablaDeDatos = (tabla) => !tabla.querySelector('table') && filasDe(tabla).some((f) => f.cells.length >= 2);

// One data table as a block, or null when nothing is left.
export function tablaDeLaCopia(tabla) {
  let filas = filasDe(tabla).map((f) => [...f.cells].filter((c) => !fueraDeLaCopia(c)));
  // A first row with a single cell across the table is its title.
  let titulo = null;
  if (filas[0]?.length === 1) {
    titulo = textoJunto(juntarTexto(filas[0][0]), TOPES.titulo) || null;
    filas = filas.slice(1);
  }
  const cabecera = filas.length && esCabeceraDeTabla(filas[0]) ? filas.shift() : null;
  const columnas = (cabecera ?? []).slice(0, TOPES.columnas).map((c) => textoJunto(juntarTexto(c), TOPES.celda));
  const ancho = columnas.length || TOPES.columnas;
  const cuerpo = filas
    .map((celdas) => celdas.slice(0, ancho).map((c) => textoJunto(juntarTexto(c), TOPES.celda)))
    .filter((fila) => fila.some(Boolean) && !(fila.filter(Boolean).length === 1 && esVolver(fila.find(Boolean))))
    .slice(0, TOPES.filas);
  if (!columnas.length && !cuerpo.length) return null;
  return { t: 'tabla', titulo, columnas, filas: cuerpo };
}

// The text copy of a tab, as blocks: { clave, titulo, bloques }, or null when `ruta` is not one of PESTANAS or nothing
// is left. `ruta` is the path of the page ("/examenes.asp", with or without a query string, in any case).
export function copiaDeLaPestana(doc, ruta) {
  const limpia = String(ruta).split(/[?#]/)[0].toLowerCase();
  const pestana = PESTANAS.find(([, r]) => r === limpia);
  if (!pestana) return null;
  const bloques = [];
  let linea = { lineas: [''], fuerte: true };
  const agregar = (bloque) => {
    if (bloque && bloques.length < TOPES.bloques) bloques.push(bloque);
  };
  // A heading is a title even when long. Loose bold words only when they fit one.
  const cerrarLinea = (encabezado = false) => {
    const largo = textoJunto(linea, TOPES.texto);
    if (largo && !esVolver(largo)) {
      agregar(linea.encabezado || (linea.fuerte && largo.length <= TOPES.titulo)
        ? { t: 'titulo', texto: textoJunto(linea, TOPES.titulo) }
        : { t: 'texto', texto: largo });
    }
    linea = { lineas: [''], fuerte: true, encabezado };
  };
  // Walks blocks in order: each paragraph or loose run of words is one block, and each data table is one block.
  const recorrer = (nodo, resaltado) => {
    for (const hijo of nodo.childNodes) {
      if (hijo.nodeType === TEXTO) {
        linea.lineas[linea.lineas.length - 1] += hijo.data;
        if (hijo.data.trim() && !resaltado) linea.fuerte = false;
        continue;
      }
      if (hijo.nodeType !== ELEMENTO || fueraDeLaCopia(hijo)) continue;
      if (hijo.tagName === 'BR') {
        linea.lineas.push('');
        continue;
      }
      const resalta = resaltado || RESALTA.test(hijo.tagName) || hijo.classList.contains('tituloTabla');
      // Inline wrappers (Sysacad wraps whole tables in <font>) are walked the same way, without breaking the line.
      if (EN_LINEA.has(hijo.tagName)) {
        recorrer(hijo, resalta);
        continue;
      }
      cerrarLinea(/^H[1-6]$/.test(hijo.tagName));
      if (hijo.tagName === 'TABLE' && esTablaDeDatos(hijo)) agregar(tablaDeLaCopia(hijo));
      else recorrer(hijo, resalta);
      cerrarLinea();
    }
  };
  const raiz = doc.querySelector?.('.wrapper') ?? doc.body ?? doc;
  recorrer(raiz, false);
  cerrarLinea();
  return bloques.length ? { clave: pestana[0], titulo: pestana[2], bloques } : null;
}
