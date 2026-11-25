// Reads the schedules that the department of Materias Básicas of FRRO publishes as spreadsheets: one file per career,
// with the basic subjects of each of its commissions. Pure: bytes in, data out, like `planillas.mjs`.
//
// A sheet holds one or more blocks, one under the other or side by side, each like this:
//   1ro. 01 IE - TURNO NOCHE                 <- the commission («1° CUATRIM.» here or in the row below, when it's one)
//          | HORA | LUNES                 | MARTES ...
//   17:40  | PP   | ALGEBRA y GEOM. ANAL.    <- each hour is its start, «A» and its end, as in Sistemas: the subject on
//   A      |      | FULANO                       top and the teachers under it. Some hours come in two rows, or with
//   18:25  |      | MENGANO                    the time as text («17.40 a», 18.35), so an hour is found by its times.
import { juntar, leerLibro } from './planillas.mjs';

const DIAS = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const TURNOS = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
const plano = (s) => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
const limpio = (s) => (typeof s === 'string' ? s.replace(/\s+/g, ' ').trim() : typeof s === 'number' ? String(s) : '');

// A time in the time column: a fraction of the day (0.5347 is 12:50), 18.35 written as a number, or «17.40 a» as
// text, where the «a» says it starts an hour.
function leerHora(v) {
  if (typeof v === 'number') {
    if (v >= 0 && v < 1) return { minutos: Math.round(v * 1440), abre: false };
    const h = Math.floor(v);
    const m = Math.round((v - h) * 100);
    return h < 24 && m < 60 ? { minutos: h * 60 + m, abre: false } : null;
  }
  const t = plano(v).match(/^(\d{1,2})[.:](\d{2})\s*(?:hs?\.?)?(\s+a)?$/);
  return t && Number(t[1]) < 24 && Number(t[2]) < 60 ? { minutos: Number(t[1]) * 60 + Number(t[2]), abre: Boolean(t[3]) } : null;
}

const RANGO = String.raw`(\d{1,2})(?:[.:](\d{2}))?\s*(?:hs?\.?\s*)?a\s*(\d{1,2})(?:[.:](\d{2}))?(?:\s*hs?\.?)?`;
const enMinutos = (m, i) => Number(m[i]) * 60 + Number(m[i + 1] ?? 0);
// «Sábados de 8 a 10:30», anywhere in a cell: that class is on Saturday at those hours.
const SABADOS = new RegExp(`sabados?\\s+(?:de\\s+)?${RANGO}`);
// «8:00 a 8:45» alone in a cell of the SABADO column: the Saturday hours of that row, which aren't the weekdays'.
const SOLO_RANGO = new RegExp(`^${RANGO}$`);

/** The commission of a block title, «1ro. 02 IC  TURNO TARDE» with letra O and sigla IC: { comision: '1O02', turno: 'Tarde' },
 * or null if the title isn't of that career. */
export function comisionDeTitulo(texto, { letra, sigla }) {
  const t = plano(texto);
  const m = t.match(new RegExp(`(?:^|[^0-9])([1-6])\\s*(?:ro|do|er|to|vo|o|°|º)?\\.?\\s+(\\d{1,2})\\s+${plano(sigla)}\\b`));
  if (!m) return null;
  return { comision: `${m[1]}${letra.toUpperCase()}${m[2].padStart(2, '0')}`, turno: TURNOS[t.match(/turno\s+(manana|tarde|noche)/)?.[1]] ?? '' };
}

const cuatrimestreDe = (texto) => {
  const t = plano(texto);
  const m = t.match(/\b([12])\s*(?:°|º|o|er|do)?\.?\s*cuatrim/) ?? t.match(/\b(primer|segundo)\s+cuatrim/);
  return m ? ({ 1: 1, 2: 2, primer: 1, segundo: 2 })[m[1]] : 0;
};

// The blocks of a sheet: where each «HORA | LUNES | MARTES…» header is, with its time column (the one to its left) and
// the columns it spans. Beside the days there may be a column without a header, with a Saturday class in it.
function bloquesDeHoja(filas) {
  const bloques = [];
  filas.forEach((fila, r) =>
    fila?.forEach((v, c) => {
      if (plano(v) !== 'hora' || c < 1) return;
      const dias = [];
      for (let k = c + 1; DIAS[plano(fila[k])]; k++) dias.push([DIAS[plano(fila[k])], k]);
      if (dias.length >= 3) bloques.push({ fila: r, tiempo: c - 1, dias, ultima: dias.at(-1)[1] + 3 });
    }),
  );
  for (const b of bloques) {
    const vecino = bloques.find((o) => o.fila === b.fila && o.tiempo > b.tiempo);
    if (vecino) b.ultima = Math.min(b.ultima, vecino.tiempo - 1);
  }
  const cruzan = (a, b) => a.tiempo <= b.ultima && b.tiempo <= a.ultima;
  for (const b of bloques) {
    b.antes = bloques.filter((o) => o.fila < b.fila && cruzan(o, b)).at(-1);
    b.hasta = (bloques.find((o) => o.fila > b.fila && cruzan(o, b))?.fila ?? filas.length) - 1;
  }
  return bloques;
}

// The hours of a block, each with its times and its rows. A time starts an hour when it says «a», when an «A» row
// follows it, when the HORA column names it (PH, 1º…) or when no hour is open; otherwise it ends the open one. An hour
// left open ends where the next one starts (when it comes in two rows, without its end).
function horasDeBloque(filas, b) {
  const horas = [];
  let abierta = null;
  for (let r = b.fila + 1; r <= b.hasta; r++) {
    const h = leerHora(filas[r]?.[b.tiempo]);
    if (!h) continue;
    const empieza = h.abre || plano(filas[r + 1]?.[b.tiempo]) === 'a' || limpio(filas[r]?.[b.tiempo + 1]) !== '' || !abierta;
    if (abierta) {
      horas.push({ ...abierta, hasta: h.minutos, ultima: empieza ? r - 1 : r });
      abierta = null;
      if (!empieza) continue;
    }
    abierta = { desde: h.minutos, primera: r };
  }
  return horas
    .map((h) => (h.hasta < h.desde && h.desde >= 18 * 60 ? { ...h, hasta: h.hasta + 1440 } : h)) // the night ends at 0:10
    .filter((h) => h.hasta > h.desde);
}

const CONECTORES = new Set(['y', 'e', 'o', 'u', 'de', 'del', 'la', 'las', 'los', 'el', 'en', 'para', 'a', 'al', 'con', 'por']);
const esRomano = (w) => w !== '' && /^(x{0,3})(ix|iv|v?i{0,3})$/.test(w);
const ROMANOS = { 1: 'i', 2: 'ii', 3: 'iii', 4: 'iv', 5: 'v', 6: 'vi' };
// Words the sheets add to an official name: «INGLES TECNICO I» is Inglés I.
const OMITIBLES = new Set(['tecnico']);

// A word of a cell stands for a word of an official name when it's the same, or its start when cut with a dot («A.»,
// «GEOM.») or of three letters or more («MATEM», «ING»). Connectors and roman numerals, only whole.
function coincide(tk, w) {
  if (tk.w === w || ROMANOS[tk.w] === w) return true;
  if (CONECTORES.has(w) || esRomano(w)) return false;
  return w.startsWith(tk.w) && (tk.punto || tk.w.length >= 3);
}

// How many words of the cell an official name takes from its start, or null. The connectors of the name may be left
// out («PROBABILIDAD / ESTADISTICA»). A name cut short at the end of a row («ALGEBRA Y GEOMETRIA») counts as partial.
function emparejar(tokens, palabras) {
  let j = 0;
  let contenido = 0;
  for (const w of palabras) {
    if (tokens[j] && OMITIBLES.has(tokens[j].w) && !coincide(tokens[j], w)) j++;
    if (tokens[j] && coincide(tokens[j], w)) {
      j++;
      if (!CONECTORES.has(w)) contenido++;
      continue;
    }
    if (CONECTORES.has(w)) continue;
    const corte = j > 0 && (!tokens[j] || tokens[j].fila !== tokens[j - 1].fila);
    return contenido >= 2 && corte ? { j, completo: false } : null;
  }
  return { j, completo: true };
}

// A subject name the way the faculty writes them: «ORGANIZACIÓN Y ADMIN. de EMPRESAS» is «Organización y Admin. de Empresas».
const enTitulo = (texto) =>
  texto
    .replace(/\.(?=\p{L})/gu, '. ')
    .split(' ')
    .filter(Boolean)
    .map((p, i) => {
      const w = plano(p).replace(/\.$/, '');
      if (esRomano(w)) return p.toUpperCase();
      if (i > 0 && CONECTORES.has(w)) return p.toLowerCase();
      return p.charAt(0).toUpperCase() + p.slice(1).toLowerCase();
    })
    .join(' ');

// Surnames in capitals as a name is written: «FULANO-ZUTANO» is «Fulano-Zutano», «PERENGANO, A.» is «Perengano, A.».
const persona = (texto) =>
  texto
    .replace(/[()]/g, ' ')
    .replace(/\s*-\s*/g, (m) => (m === '-' ? '-' : ' - '))
    .replace(/\s+/g, ' ')
    .replace(/^[\s.,;:/-]+|[\s,;:/-]+$/g, '')
    .replace(/[\p{L}\p{M}]+/gu, (w) => (w.length > 1 && w === w.toUpperCase() ? w.charAt(0) + w.slice(1).toLowerCase() : w));

// A row that names teachers and not part of a subject: in brackets, or several of them («MENGANO-ZUTANO», «Perengano, A.»).
const pareceDocente = (t) => /^\(|[-/,]/.test(t);
const quedaAbierto = (t) => CONECTORES.has(plano(t).split(' ').at(-1));

/** The subject and the teachers of one hour in one day, from the texts of its rows, top to bottom. First an official name
 * at the start (`oficiales`: { nombre, palabras }), also from its short forms; if none, the first row (and the ones that
 * carry on its name) is the subject, the rest the teachers. Returns { materia, docentes: [names] }. */
export function materiaYDocentes(textos, oficiales = []) {
  // «ALGEBRA Y GEOM.(Fulano - Mengano)»: the bracket is a row of its own.
  const filas = textos.flatMap((t) => {
    const i = t.indexOf('(');
    return i > 0 ? [t.slice(0, i).trim(), t.slice(i).trim()] : [t];
  }).filter(Boolean);
  const tokens = filas.flatMap((t, fila) => [...t.matchAll(/[\p{L}\p{N}]+(\.)?/gu)].map((m) => ({ w: plano(m[0]).replace(/\.$/, ''), punto: Boolean(m[1]), fila, fin: m.index + m[0].length })));
  const completos = [];
  const parciales = [];
  for (const o of oficiales) {
    const m = emparejar(tokens, o.palabras);
    if (m) (m.completo ? completos : parciales).push({ o, ...m });
  }
  completos.sort((x, y) => y.o.palabras.length - x.o.palabras.length || y.j - x.j);
  const unicos = [...new Set(parciales.map((p) => p.o.nombre))];
  const mejor = completos[0] ?? (unicos.length === 1 ? parciales[0] : null);
  if (mejor) {
    const ultimo = tokens[mejor.j - 1];
    const resto = [filas[ultimo.fila].slice(ultimo.fin), ...filas.slice(ultimo.fila + 1)];
    return { materia: mejor.o.nombre, docentes: resto.map(persona).filter(Boolean) };
  }
  let n = 1;
  while (n < filas.length && !pareceDocente(filas[n])) {
    const nombre = filas.slice(0, n).join(' ');
    const sigue = quedaAbierto(nombre) || CONECTORES.has(plano(filas[n]).split(' ')[0]) || (!esRomano(plano(nombre).split(' ').at(-1)) && esRomano(plano(filas[n]).split(' ').at(-1)));
    if (!sigue) break;
    n++;
  }
  return { materia: enTitulo(filas.slice(0, n).join(' ')), docentes: filas.slice(n).map(persona).filter(Boolean) };
}

const palabras = (t) => plano(t).split(/[^a-z0-9]+/).filter(Boolean);

/** The classes of every block of one sheet that belongs to the career: [{ comision, turno, clases }], the classes still
 * one per hour, with `docentes` as a list. */
function clasesDeHoja(filas, opciones, oficiales) {
  const encontrados = [];
  for (const b of bloquesDeHoja(filas)) {
    // The title: the nearest one above the header in its columns (a block without one is the commission above it).
    let titulo = null;
    for (let r = b.fila - 1; r >= 0 && !titulo; r--) {
      for (let c = b.tiempo; c <= b.ultima && !titulo; c++) {
        const t = comisionDeTitulo(limpio(filas[r]?.[c]), opciones);
        if (t) titulo = { ...t, fila: r };
      }
    }
    if (!titulo) continue;
    let cuatrimestre = 0;
    for (let r = Math.max(titulo.fila, (b.antes?.fila ?? -1) + 1); r < b.fila; r++) {
      for (let c = b.tiempo; c <= b.ultima; c++) cuatrimestre ||= cuatrimestreDe(limpio(filas[r]?.[c]));
    }
    const horas = horasDeBloque(filas, b);
    const columnas = new Map(b.dias.map(([dia, c]) => [c, dia]));
    const clases = [];
    for (const h of horas) {
      for (let c = b.dias[0][1]; c <= b.ultima; c++) {
        const diaColumna = columnas.get(c) ?? null;
        let { desde, hasta } = h;
        let dia = diaColumna;
        const textos = [];
        for (let r = h.primera; r <= h.ultima; r++) {
          let t = limpio(filas[r]?.[c]);
          const sabados = plano(t).match(SABADOS);
          if (sabados) {
            [dia, desde, hasta] = [6, enMinutos(sabados, 1), enMinutos(sabados, 3)];
            t = t.replace(new RegExp(`s[aá]bados?\\s+(?:de\\s+)?${RANGO}`, 'i'), '').trim();
          } else if (diaColumna === 6 && SOLO_RANGO.test(plano(t))) {
            const m = plano(t).match(SOLO_RANGO);
            [desde, hasta] = [enMinutos(m, 1), enMinutos(m, 3)];
            t = '';
          }
          if (t) textos.push(t);
        }
        if (!dia || !textos.length || hasta <= desde) continue;
        const { materia, docentes } = materiaYDocentes(textos, oficiales);
        if (materia) clases.push({ cuatrimestre, dia, desde, hasta, materia, docentes });
      }
    }
    const turno = titulo.turno || (horas.length ? (horas[0].desde < 720 ? 'Mañana' : horas[0].desde < 1020 ? 'Tarde' : 'Noche') : '');
    encontrados.push({ comision: titulo.comision, turno, clases });
  }
  return encontrados;
}

/** Every commission of a career in the files of Materias Básicas, with its classes named and joined.
 * `libros`: the xlsx files of the career. `letra`: its commission letter (Civil O, Eléctrica Q, Mecánica S, Química V).
 * `sigla`: how the sheets name it (IC, IE, IM, IQ). `conocidas`: the official names of the subjects.
 * Returns [{ comision, turno, clases: [{ cuatrimestre, dia, desde, hasta, materia, docentes }] }], like `horariosDeLibros`. */
export function horariosDeBasicas(libros, { letra, sigla, conocidas = [] }) {
  const oficiales = conocidas.map((nombre) => ({ nombre, palabras: palabras(nombre) }));
  const porComision = new Map();
  for (const bytes of libros) {
    for (const hoja of leerLibro(bytes)) {
      for (const { comision, turno, clases } of clasesDeHoja(hoja.filas, { letra, sigla }, oficiales)) {
        const antes = porComision.get(comision) ?? { comision, turno, piezas: [] };
        antes.turno ||= turno;
        antes.piezas.push(...clases);
        porComision.set(comision, antes);
      }
    }
  }
  return [...porComision.values()]
    .sort((a, b) => (a.comision < b.comision ? -1 : a.comision > b.comision ? 1 : 0))
    .map(({ comision, turno, piezas }) => {
      // `juntar` joins the hours; the teachers of a joined class are those of all its hours, each once.
      const clases = juntar(piezas.map(({ docentes: _, ...p }) => ({ ...p, docentes: '' })));
      for (const clase of clases) {
        const nombres = new Map();
        for (const p of piezas) {
          if (p.cuatrimestre !== clase.cuatrimestre || p.dia !== clase.dia || p.materia !== clase.materia || p.desde < clase.desde || p.hasta > clase.hasta) continue;
          for (const d of p.docentes) if (!nombres.has(plano(d))) nombres.set(plano(d), d);
        }
        clase.docentes = [...nombres.values()].join(', ');
      }
      return { comision, turno, clases };
    })
    .filter((h) => h.clases.length);
}
