// Reads the class schedules that the Sistemas department of FRRO publishes as spreadsheets (one file per year, one sheet
// per commission). Pure: bytes in, data out, so it can be tested without the network.
//
// Each sheet looks like this, once per cuatrimestre:
//   Comisión | 3K02 | Turno | Mañana
//   Primer Cuatrimestre
//   Horario | Horas | Lunes | Martes | ...
//   07:15   | PH    | Diseño de Sistemas    <- each hour is three rows: the start, «a» and the end. In each day the
//   a       |       | de Información           subject takes the first one or two, and the teachers the rest.
//   08:00   |       | Mengano
import { strFromU8, unzipSync } from 'fflate';

const ENTIDADES = { lt: '<', gt: '>', quot: '"', apos: "'", amp: '&' };
const desescapar = (s) => s.replace(/&(lt|gt|quot|apos|amp);/g, (_, e) => ENTIDADES[e]).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

const columna = (letras) => [...letras].reduce((n, l) => n * 26 + l.charCodeAt(0) - 64, 0) - 1;

/** The sheets of an xlsx, each as { nombre, filas }: `filas[r][c]` is the text or the number of the cell, or undefined. */
export function leerLibro(bytes) {
  // A sheet of timetables weighs KB: a file inside the xlsx that unpacks to more than 50 MB is left out.
  const zip = unzipSync(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), { filter: (e) => e.originalSize < 50 * 1024 * 1024 });
  const texto = (ruta) => (zip[ruta] ? strFromU8(zip[ruta]) : '');
  const compartidos = [...texto('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) =>
    desescapar([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')),
  );
  const rels = texto('xl/_rels/workbook.xml.rels');
  const destino = (rid) => {
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${rid}"`));
    const ruta = rel?.match(/Target="([^"]*)"/)?.[1];
    return ruta ? `xl/${ruta.replace(/^\/?xl\//, '')}` : null;
  };
  const hojas = [];
  for (const m of texto('xl/workbook.xml').matchAll(/<sheet\b[^>]*>/g)) {
    const nombre = desescapar(m[0].match(/name="([^"]*)"/)?.[1] ?? '');
    const ruta = destino(m[0].match(/r:id="([^"]*)"/)?.[1]);
    if (!ruta) continue;
    const filas = [];
    for (const c of texto(ruta).matchAll(/<c r="([A-Z]+)(\d+)"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, letras, fila, atributos, cuerpo] = c;
      if (!cuerpo) continue;
      const v = cuerpo.match(/<v>([\s\S]*?)<\/v>/)?.[1];
      const enLinea = cuerpo.match(/<is>([\s\S]*?)<\/is>/)?.[1];
      let valor;
      if (/t="s"/.test(atributos) && v !== undefined) valor = compartidos[Number(v)];
      else if (/t="inlineStr"/.test(atributos) && enLinea) valor = desescapar([...enLinea.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join(''));
      else if (/t="(str|e)"/.test(atributos) && v !== undefined) valor = desescapar(v);
      else if (v !== undefined) valor = Number(v);
      if (valor === undefined || valor === '') continue;
      (filas[Number(fila) - 1] ??= [])[columna(letras)] = valor;
    }
    hojas.push({ nombre, filas });
  }
  return hojas;
}

const DIAS = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const limpio = (s) => (typeof s === 'number' ? String(s) : typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : '');
// A time of day as Excel keeps it (a fraction of the day), in minutes.
const minutos = (v) => (typeof v === 'number' && v >= 0 && v < 1 ? Math.round(v * 1440) : null);
// «Diseño deSistemas» comes glued in the sheets.
const despegar = (t) => t.replace(/\b(de|del|y|en|la|a)(?=[A-ZÁÉÍÓÚÑ])/g, '$1 ');

/** The cells of one sheet, before naming: { comision, turno, celdas: [{ cuatrimestre, dia, desde, hasta, renglones }] },
 * or null if it isn't a commission sheet. `cuatrimestre` is 1, 2, or 0 when the sheet doesn't say (the whole year). */
export function celdasDeHoja(filas) {
  let comision = null;
  let turno = '';
  for (const fila of filas.slice(0, 12)) {
    if (!fila) continue;
    fila.forEach((v, c) => {
      if (plano(v) === 'comision' && fila[c + 1] !== undefined) comision = limpio(fila[c + 1]).toUpperCase().replace(/\s+/g, '');
      if (plano(v) === 'turno' && fila[c + 1] !== undefined) turno = limpio(fila[c + 1]);
    });
  }
  if (!comision) return null;
  let cuatrimestre = 0;
  let dias = null;
  const celdas = [];
  for (let r = 0; r < filas.length; r++) {
    const fila = filas[r] ?? [];
    const primera = plano(fila[0]);
    if (/^primer cuatrimestre/.test(primera)) cuatrimestre = 1;
    else if (/^segundo cuatrimestre/.test(primera)) cuatrimestre = 2;
    const encabezado = fila.map((v, c) => [DIAS[plano(v)], c]).filter(([d]) => d);
    if (encabezado.length >= 3) {
      dias = encabezado;
      continue;
    }
    const desde = minutos(fila[0]);
    const hasta = minutos(filas[r + 2]?.[0]);
    if (!dias || desde === null || hasta === null || plano(filas[r + 1]?.[0]) !== 'a' || hasta <= desde) continue;
    for (const [dia, c] of dias) {
      const renglones = [fila[c], filas[r + 1]?.[c], filas[r + 2]?.[c]].map((x) => despegar(limpio(x)));
      if (renglones.some(Boolean)) celdas.push({ cuatrimestre, dia, desde, hasta, renglones });
    }
    r += 2;
  }
  return { comision, turno, celdas };
}

// Words that leave a name unfinished: «Probabilidad / y / Estadística» is one subject over three rows.
const UNEN = new Set(['y', 'e', 'de', 'del', 'la', 'las', 'los', 'en', 'para', 'a', 'al', 'con']);
const quedaAbierto = (t) => UNEN.has(plano(t).split(' ').at(-1));
// Short forms of the sheets, to recognize an official name in them.
const LARGAS = { sist: 'sistemas', adm: 'administracion', des: 'desarrollo', soft: 'software', inf: 'informacion' };
const palabras = (t) =>
  plano(t)
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
    .map((p) => LARGAS[p] ?? p);
// A cell that says that hour is taken in another commission: no subject of its own.
const OTRA_COMISION = /^inscribirse en la comision\b/;

/** A subject and its teachers from the three rows of one hour in one day. First an official name at the start of the
 * cell; if none, the rows: the first one or two are the subject and the last the teachers, unless the name is left
 * open («Probabilidad y»). `conTitular` are the first rows that came with different second rows elsewhere (one subject,
 * several teachers), so in them the second row is a teacher. */
export function materiaDeCelda(renglones, conocidas = [], conTitular = new Set()) {
  const [a, b, c] = renglones;
  const todo = renglones.filter(Boolean).join(' ');
  if (OTRA_COMISION.test(plano(todo))) return null;
  const dichas = palabras(todo);
  let mejor = null;
  for (const k of conocidas) {
    if (k.palabras.length <= dichas.length && k.palabras.every((p, i) => dichas[i] === p) && (!mejor || k.palabras.length > mejor.palabras.length)) mejor = k;
  }
  if (mejor) {
    // What is left after the official name, with its own capitals: the teachers.
    let resto = todo;
    for (let i = 0; i < mejor.palabras.length; i++) resto = resto.replace(/^[^A-Za-zÀ-ÿ0-9]*[A-Za-zÀ-ÿ0-9]+\.?/, '');
    return { materia: mejor.nombre, docentes: resto.replace(/^[\s.,-]+/, '').trim() };
  }
  if (!a && !b) return { materia: c, docentes: '' };
  if (a && b && !c && conTitular.has(plano(a))) return { materia: a, docentes: b };
  let nombre = [a, b].filter(Boolean).join(' ');
  let docentes = c;
  if (c && (quedaAbierto(nombre) || UNEN.has(plano(b)))) {
    nombre = `${nombre} ${c}`;
    docentes = '';
  }
  return { materia: nombre, docentes };
}

// The same subject in hours one after the other is one class, also across the breaks between them: 15 minutes in the
// morning, 20 between 15:45 and 16:05 and between 20:45 and 21:05. Separate blocks of a subject are 50 or more apart.
const PAUSA = 25;
export function juntar(clases) {
  const orden = [...clases].sort((x, y) => x.cuatrimestre - y.cuatrimestre || x.dia - y.dia || x.desde - y.desde);
  const juntas = [];
  for (const c of orden) {
    const antes = juntas.at(-1);
    if (antes && antes.cuatrimestre === c.cuatrimestre && antes.dia === c.dia && antes.materia === c.materia && c.desde - antes.hasta <= PAUSA) {
      antes.hasta = Math.max(antes.hasta, c.hasta);
      if (c.docentes && !antes.docentes.split(', ').includes(c.docentes)) antes.docentes = antes.docentes ? `${antes.docentes}, ${c.docentes}` : c.docentes;
    } else juntas.push({ ...c });
  }
  return juntas;
}

/** Every commission of a set of files (the years and their electives), with its classes named and joined.
 * `conocidas`: the official names of the subjects, to recognize them in the cells and write them whole. */
export function horariosDeLibros(libros, conocidas = []) {
  const oficiales = conocidas.map((nombre) => ({ nombre, palabras: palabras(nombre) }));
  const hojas = libros.flatMap((bytes) => leerLibro(bytes).map((h) => celdasDeHoja(h.filas)).filter(Boolean));
  const segundos = new Map();
  for (const h of hojas) {
    for (const { renglones: [a, b, c] } of h.celdas) {
      if (!a || !b || c) continue;
      if (!segundos.has(plano(a))) segundos.set(plano(a), new Set());
      segundos.get(plano(a)).add(plano(b));
    }
  }
  const conTitular = new Set([...segundos].filter(([, bs]) => bs.size > 1).map(([a]) => a));
  return hojas
    .map(({ comision, turno, celdas }) => ({
      comision,
      turno,
      clases: juntar(
        celdas.flatMap(({ renglones, ...resto }) => {
          const m = materiaDeCelda(renglones, oficiales, conTitular);
          return m ? [{ ...resto, ...m }] : [];
        }),
      ),
    }))
    .filter((h) => h.clases.length);
}
