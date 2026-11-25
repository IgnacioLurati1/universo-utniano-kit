// The shape of a campus text area: headings, lists and paragraphs with bold, italics and links, as plain data that
// your own view draws as elements. Nothing of the HTML itself reaches the page: no tags, attributes, styles, scripts
// or images, and links only when they are http(s).
import { enlaceSeguro } from './enlace.js';

const BIDI = /[‪-‮⁦-⁩]/g;
const TITULO = /^H([1-6])$/;
const LISTA = /^(UL|OL)$/;
// Elements that start a new block. The rest (span, font, u, mark...) only carry text.
const BLOQUE = /^(P|DIV|BLOCKQUOTE|SECTION|ARTICLE|HEADER|FOOTER|ASIDE|MAIN|NAV|FIGURE|FIGCAPTION|TABLE|THEAD|TBODY|TFOOT|TR|TD|TH|CAPTION|DL|DT|DD|PRE|ADDRESS|CENTER|DETAILS|SUMMARY|HR)$/;
const IGNORAR = /^(SCRIPT|STYLE|TEMPLATE|NOSCRIPT|IMG|PICTURE|SVG|MATH|VIDEO|AUDIO|IFRAME|OBJECT|EMBED|CANVAS|MAP|BUTTON|INPUT|SELECT|TEXTAREA|FORM|HEAD|TITLE|META|LINK)$/;
// The name of an element in capitals: SVG and MathML ones come in small letters.
const etiqueta = (el) => el.tagName.toUpperCase();

/** The pieces of one line, from an inline element and what it holds. */
function piezas(nodo, estilo, salida) {
  for (const hijo of nodo.childNodes) {
    if (hijo.nodeType === 3) {
      salida.push({ tipo: estilo, texto: hijo.nodeValue });
      continue;
    }
    if (hijo.nodeType !== 1 || IGNORAR.test(etiqueta(hijo))) continue;
    const nombre = etiqueta(hijo);
    if (nombre === 'BR') salida.push({ tipo: 'salto' });
    else if (nombre === 'A') {
      const url = enlaceSeguro(hijo.getAttribute('href'));
      // Only what would be read of it: never the scripts, styles or drawings inside.
      const texto = piezas(hijo, estilo, []).map((p) => p.texto ?? ' ').join('');
      salida.push(url && texto.trim() ? { tipo: 'enlace', url, texto } : { tipo: estilo, texto });
    } else if (estilo === 'texto' && (nombre === 'STRONG' || nombre === 'B')) piezas(hijo, 'negrita', salida);
    else if (estilo === 'texto' && (nombre === 'EM' || nombre === 'I')) piezas(hijo, 'cursiva', salida);
    else piezas(hijo, estilo, salida);
  }
  return salida;
}

/** Pieces into lines: spaces collapsed, edges trimmed, the same kind joined, empty lines dropped. */
function lineas(lista) {
  const resultado = [];
  let actual = [];
  const cerrar = () => {
    const linea = [];
    for (const p of actual) {
      const texto = p.texto.replace(BIDI, '').replace(/\s+/g, ' ');
      if (!texto) continue;
      const previa = linea.at(-1);
      if (previa && previa.tipo === p.tipo && p.tipo !== 'enlace') previa.texto += texto;
      else linea.push({ ...p, texto });
    }
    if (linea.length) {
      linea[0].texto = linea[0].texto.trimStart();
      linea.at(-1).texto = linea.at(-1).texto.trimEnd();
      const limpia = linea.filter((p) => p.texto);
      if (limpia.length) resultado.push(limpia);
    }
    actual = [];
  };
  for (const p of lista) {
    if (p.tipo === 'salto') cerrar();
    else actual.push(p);
  }
  cerrar();
  return resultado;
}

const largoDe = (partes) => partes.reduce((n, p) => n + p.texto.length, 0);

/** The blocks of a campus text area (the same shape as utiles/formato.js), up to about `tope` characters of text. */
export function leerBloques(html, tope = 6000) {
  if (!html) return [];
  const documento = new DOMParser().parseFromString(String(html), 'text/html');
  const bloques = [];
  let largo = 0;
  let suelto = [];
  const lleno = () => largo >= tope;
  const sumar = (bloque, cuanto) => {
    if (lleno()) return;
    bloques.push(bloque);
    largo += cuanto;
  };
  // Text and inline elements between blocks make a paragraph.
  const soltarSuelto = () => {
    const ls = lineas(suelto);
    suelto = [];
    if (ls.length) sumar({ tipo: 'parrafo', lineas: ls }, ls.reduce((n, l) => n + largoDe(l), 0));
  };
  const itemsDe = (lista, salida) => {
    for (const li of lista.children) {
      if (etiqueta(li) !== 'LI') continue;
      const propias = [];
      const anidadas = [];
      for (const hijo of li.childNodes) {
        if (hijo.nodeType === 1 && LISTA.test(etiqueta(hijo))) anidadas.push(hijo);
        else if (hijo.nodeType === 1 && !IGNORAR.test(etiqueta(hijo))) piezas({ childNodes: [hijo] }, 'texto', propias);
        else if (hijo.nodeType === 3) propias.push({ tipo: 'texto', texto: hijo.nodeValue });
      }
      // An item is one line: its line breaks become spaces.
      const unida = lineas(propias.map((p) => (p.tipo === 'salto' ? { tipo: 'texto', texto: ' ' } : p)))[0];
      if (unida) salida.push(unida);
      // A list inside an item goes on as items of the same list.
      for (const sub of anidadas) itemsDe(sub, salida);
    }
    return salida;
  };
  const recorrer = (nodo) => {
    for (const hijo of nodo.childNodes) {
      if (lleno()) return;
      if (hijo.nodeType === 3) {
        suelto.push({ tipo: 'texto', texto: hijo.nodeValue });
        continue;
      }
      if (hijo.nodeType !== 1 || IGNORAR.test(etiqueta(hijo))) continue;
      const nombre = etiqueta(hijo);
      const titulo = TITULO.exec(nombre);
      if (titulo) {
        soltarSuelto();
        const partes = lineas(piezas(hijo, 'texto', []).map((p) => (p.tipo === 'salto' ? { tipo: 'texto', texto: ' ' } : p)))[0];
        // The campus uses h1 to h4 for units and h5 or h6 for what's inside them.
        if (partes) sumar({ tipo: 'titulo', nivel: Number(titulo[1]) <= 4 ? 1 : 2, partes }, largoDe(partes));
      } else if (LISTA.test(nombre)) {
        soltarSuelto();
        const items = itemsDe(hijo, []);
        if (items.length) sumar({ tipo: 'lista', items }, items.reduce((n, i) => n + largoDe(i), 0));
      } else if (BLOQUE.test(nombre)) {
        soltarSuelto();
        recorrer(hijo);
        soltarSuelto();
      } else if (nombre === 'BR') {
        suelto.push({ tipo: 'salto' });
      } else {
        piezas({ childNodes: [hijo] }, 'texto', suelto);
      }
    }
  };
  recorrer(documento.body);
  soltarSuelto();
  return bloques;
}

// A line that is only links (and dashes or bullets between them).
const soloEnlaces = (partes) => partes.some((p) => p.tipo === 'enlace') && partes.every((p) => p.tipo === 'enlace' || /^[\s\-–—•·|,;:.]*$/.test(p.texto));

/** Without the lines and items that are only links: those go as link cards under the text, with the
 * drawing of their service. A link inside a sentence stays where it is. */
export function sinEnlacesSolos(bloques) {
  const resultado = [];
  for (const b of bloques) {
    if (b.tipo === 'lista') {
      const items = b.items.filter((i) => !soloEnlaces(i));
      if (items.length) resultado.push({ ...b, items });
    } else if (b.tipo === 'parrafo') {
      const lineas = b.lineas.filter((l) => !soloEnlaces(l));
      if (lineas.length) resultado.push({ ...b, lineas });
    } else resultado.push(b);
  }
  // Only headings left: with nothing under them they say nothing.
  return resultado.some((b) => b.tipo !== 'titulo') ? resultado : [];
}
