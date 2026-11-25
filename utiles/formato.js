// A little formatting for texts written by hand and shared with others. It is read into plain pieces that your view
// draws as elements: no HTML ever comes out of here, whatever somebody else wrote.
//   # Título            a heading
//   - algo  /  * algo   a list
//   **negrita**  *cursiva*  and any http(s) address becomes a link
import { enlaceSeguro } from './datos.js';

const ENLACE = /https?:\/\/[^\s<>()]+[^\s<>().,;:!?'"»]/g;

function enlaces(texto, tipo) {
  const partes = [];
  let desde = 0;
  for (const m of texto.matchAll(ENLACE)) {
    const url = enlaceSeguro(m[0]);
    if (!url) continue;
    if (m.index > desde) partes.push({ tipo, texto: texto.slice(desde, m.index) });
    partes.push({ tipo: 'enlace', texto: m[0], url });
    desde = m.index + m[0].length;
  }
  if (desde < texto.length) partes.push({ tipo, texto: texto.slice(desde) });
  return partes;
}

/** The pieces of one line: plain, bold, italic and links. Unclosed marks stay as they were written. */
export function enLinea(texto) {
  const partes = [];
  const marca = /\*\*([^*]+)\*\*|\*([^*\s][^*]*)\*/g;
  let desde = 0;
  for (const m of texto.matchAll(marca)) {
    if (m.index > desde) partes.push(...enlaces(texto.slice(desde, m.index), 'texto'));
    partes.push(...enlaces(m[1] ?? m[2], m[1] !== undefined ? 'negrita' : 'cursiva'));
    desde = m.index + m[0].length;
  }
  if (desde < texto.length) partes.push(...enlaces(texto.slice(desde), 'texto'));
  return partes;
}

/** The blocks of a text: headings, lists and paragraphs (a paragraph keeps its line breaks as separate lines). */
export function leerFormato(texto) {
  const bloques = [];
  let parrafo = null;
  let lista = null;
  const cerrar = () => {
    parrafo = null;
    lista = null;
  };
  for (const cruda of String(texto ?? '').split('\n')) {
    const linea = cruda.trimEnd();
    if (!linea.trim()) {
      cerrar();
      continue;
    }
    const titulo = /^#{1,3}\s+(.+)$/.exec(linea);
    const item = /^\s*[-*•]\s+(.+)$/.exec(linea);
    if (titulo) {
      cerrar();
      bloques.push({ tipo: 'titulo', partes: enLinea(titulo[1]) });
    } else if (item) {
      parrafo = null;
      if (!lista) {
        lista = { tipo: 'lista', items: [] };
        bloques.push(lista);
      }
      lista.items.push(enLinea(item[1]));
    } else {
      lista = null;
      if (!parrafo) {
        parrafo = { tipo: 'parrafo', lineas: [] };
        bloques.push(parrafo);
      }
      parrafo.lineas.push(enLinea(linea.trim()));
    }
  }
  return bloques;
}
