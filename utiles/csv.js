// Reading and writing CSV (and other text files) in the browser: the text of a file's bytes (UTF-8, UTF-16 or the
// Windows-1252 of an Excel in Spanish), a table proposed out of a CSV with names and types that a person can review (for
// SQL, for instance) and a result as a CSV that Excel in Spanish opens right. Pure: a page and a worker can share it.

export const MAX_FILAS_CSV = 200_000;
export const MAX_COLUMNAS_CSV = 200;
export const TIPOS = ['INTEGER', 'REAL', 'TEXT'];

/** The text of a file's bytes. With a BOM, the one it says; if not, UTF-8, and if it isn't, Windows-1252. */
export function decodificar(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) return new TextDecoder('utf-8').decode(b.subarray(3));
  if (b[0] === 0xff && b[1] === 0xfe) return new TextDecoder('utf-16le').decode(b.subarray(2));
  if (b[0] === 0xfe && b[1] === 0xff) return new TextDecoder('utf-16be').decode(b.subarray(2));
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    return new TextDecoder('windows-1252').decode(b);
  }
}

export const SEPARADORES = [',', ';', '\t', '|'];

/** The CSV's rows, each a list of texts: quotes with "" inside, and lines ending in \n, \r\n or \r. */
export function leerCsv(texto, separador = ',', tope = MAX_FILAS_CSV + 1) {
  const t = String(texto ?? '').replace(/^\uFEFF/, '');
  const filas = [];
  let fila = [];
  let celda = '';
  let entreComillas = false;
  let i = 0;
  while (i < t.length) {
    const c = t[i];
    if (entreComillas) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          celda += '"';
          i += 1;
        } else entreComillas = false;
      } else celda += c;
    } else if (c === '"' && celda === '') entreComillas = true;
    else if (c === separador) {
      fila.push(celda);
      celda = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i += 1;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = '';
      if (filas.length >= tope) return filas;
    } else celda += c;
    i += 1;
  }
  if (celda !== '' || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  // Empty lines (one cell, empty) aren't rows.
  return filas.filter((f) => f.length > 1 || f[0].trim() !== '');
}

/** Which separator the first lines use: the one that splits them the same way, with the most columns. */
export function separadorDe(texto) {
  const muestra = String(texto ?? '').slice(0, 20_000);
  let mejor = ',';
  let puntos = -1;
  for (const s of SEPARADORES) {
    const filas = leerCsv(muestra, s, 30).slice(0, 20);
    if (filas.length > 1 && muestra.length >= 20_000) filas.pop();
    if (!filas.length) continue;
    const anchos = filas.map((f) => f.length);
    if (anchos[0] < 2) continue;
    const iguales = anchos.filter((a) => a === anchos[0]).length / anchos.length;
    const p = iguales * 1000 + anchos[0];
    if (p > puntos) {
      puntos = p;
      mejor = s;
    }
  }
  return mejor;
}

const ENTERO = /^[+-]?(0|[1-9]\d*)$/;
const CON_PUNTO = /^[+-]?\d+\.\d+$|^[+-]?\d+(\.\d+)?[eE][+-]?\d+$/;
const CON_COMA = /^[+-]?\d+,\d+$/;
// A comma for decimals only where it can't be the separator.
const esReal = (v, separador) => CON_PUNTO.test(v) || (separador !== ',' && CON_COMA.test(v));
const esNumero = (v, separador) => ENTERO.test(v) || esReal(v, separador);

/** INTEGER, REAL or TEXT, from all the values of a column: a code with zeros in front (007) stays text. */
export function tipoDe(valores, separador = ',') {
  const llenos = valores.map((v) => String(v ?? '').trim()).filter((v) => v !== '');
  if (!llenos.length) return 'TEXT';
  if (llenos.every((v) => ENTERO.test(v) && Number.isSafeInteger(Number(v)))) return 'INTEGER';
  if (llenos.every((v) => esNumero(v, separador))) return 'REAL';
  return 'TEXT';
}

// Words of SQL that would stop a query if a column or table were called like that, without quotes.
const RESERVADAS = new Set('add all alter and as asc between by case check column constraint create cross default delete desc distinct drop else end except exists foreign from full group having in index inner insert intersect into is join key left like limit natural not null of offset on or order outer primary references right select set table then to union unique update using values when where with'.split(' '));

/** A name that can be written in a query without quotes: lower case, without accents (ñ is ni) and with _ for spaces. */
export function nombreSql(texto, respaldo = 'columna') {
  let n = String(texto ?? '')
    .toLowerCase()
    .replace(/ñ/g, 'ni')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, 40)
    .replace(/_$/, '');
  if (!n) n = respaldo;
  if (/^\d+$/.test(n)) n = respaldo;
  else if (/^\d/.test(n)) n = `${respaldo}_${n}`;
  if (RESERVADAS.has(n)) n = `${n}_`;
  return n;
}

/** `nombre`, or with _2, _3… if it's already among `usados` (without minding upper case). */
export function sinRepetir(nombre, usados) {
  const ya = new Set([...usados].map((u) => String(u).toLowerCase()));
  if (!ya.has(nombre.toLowerCase())) return nombre;
  for (let i = 2; ; i += 1) if (!ya.has(`${nombre}_${i}`.toLowerCase())) return `${nombre}_${i}`;
}

/** If the first row has the names: none of its cells is a number. */
export const tieneEncabezado = (primera, separador = ',') => !primera.some((v) => esNumero(String(v).trim(), separador));

/**
 * What the CSV `texto` of the file `archivo` proposes: the table's name (not among `existentes`), the separator, if
 * the first row has the names, and each column with its name and type. `encabezado` and `separador` can be given.
 */
export function proponerTabla(texto, archivo, existentes = [], { separador = separadorDe(texto), encabezado } = {}) {
  const filas = leerCsv(texto, separador);
  if (!filas.length) return { error: 'vacio' };
  const ancho = Math.max(...filas.slice(0, 1000).map((f) => f.length));
  if (ancho > MAX_COLUMNAS_CSV) return { error: 'columnas' };
  if (filas.length > MAX_FILAS_CSV + 1) return { error: 'filas' };
  const conNombres = encabezado ?? tieneEncabezado(filas[0], separador);
  const datos = conNombres ? filas.slice(1) : filas;
  const nombres = [];
  const columnas = [];
  for (let c = 0; c < ancho; c += 1) {
    const propuesto = conNombres ? nombreSql(filas[0][c], `columna_${c + 1}`) : `columna_${c + 1}`;
    const n = sinRepetir(propuesto, nombres);
    nombres.push(n);
    columnas.push({ nombre: n, tipo: tipoDe(datos.map((f) => f[c]), separador) });
  }
  const base = String(archivo ?? '').replace(/\.[^.]*$/, '');
  return {
    tabla: sinRepetir(nombreSql(base, 'tabla'), existentes),
    separador,
    encabezado: conNombres,
    columnas,
    cuantas: datos.length,
    muestra: datos.slice(0, 5).map((f) => columnas.map((_, c) => f[c] ?? '')),
  };
}

/** A name the student typed for a table or a column: the same rules, or why not. */
export function problemaDeNombre(nombre, usados = []) {
  const n = String(nombre ?? '').trim();
  if (!n) return 'vacio';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(n)) return 'letras';
  if (RESERVADAS.has(n.toLowerCase())) return 'reservada';
  if (/^sqlite_/i.test(n)) return 'reservada';
  if ([...usados].some((u) => String(u).toLowerCase() === n.toLowerCase())) return 'repetido';
  return null;
}

/** The values of a CSV row ready to go in: empty is NULL, a number without spaces and with a point for decimals. */
export function valoresDeFila(fila, columnas, separador) {
  return columnas.map((col, c) => {
    const v = fila[c];
    if (v === undefined || v.trim() === '') return null;
    if (col.tipo === 'TEXT') return v;
    const limpio = v.trim();
    if (col.tipo === 'REAL' && separador !== ',' && CON_COMA.test(limpio)) return limpio.replace(',', '.');
    return limpio;
  });
}

// What Excel would take as a formula: a text that starts with one of these goes with a ' in front.
const FORMULA = /^[=+\-@\t\r]/;
const numeroEs = new Intl.NumberFormat('es-AR', { useGrouping: false, maximumFractionDigits: 15 });

function celdaCsv(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') return `blob de ${v.bytes ?? 0} bytes`;
  let t;
  if (typeof v === 'number') t = Number.isInteger(v) ? String(v) : numeroEs.format(v);
  else {
    t = String(v);
    if (FORMULA.test(t)) t = `'${t}`;
  }
  return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

/**
 * A result as Excel in Spanish reads it when opened with a double click: UTF-8 with its BOM (so the accents are
 * right), «;» between cells, the comma for decimals and lines that end in \r\n.
 */
export function aCsv(columnas, filas) {
  const lineas = [columnas.map((c) => celdaCsv(String(c))), ...filas.map((f) => f.map(celdaCsv))].map((l) => l.join(';'));
  return `\uFEFF${lineas.join('\r\n')}\r\n`;
}
