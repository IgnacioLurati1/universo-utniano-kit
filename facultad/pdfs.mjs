// Reads the class schedules that the other departments of FRRO (Civil, Mecánica, Química...) publish as PDF files made
// from the same template of the bedelía. Pure: bytes in, data out, and the same shape as planillas.mjs.
//
// Each page is one commission: a title («3ro. 01 IC TURNO NOCHE -», «2V01 - TURNO MAÑANA - ... (PRIMER CUATRIMESTRE)»),
// a row with the days and, at the left, each hour as three lines, like the spreadsheets of Sistemas:
//   7:15                                 <- the band between the start and the end of an hour is one cell per day:
//    A    PH   ANÁLISIS                     first the subject (one to four lines), then its teachers, in parentheses
//   7:55       MATEMÁTICO I                 or in lower case under a subject in capitals, and the classroom
//   8:00       ÁLGEBRA Y GEOMETRÍA          («Aula 216», «Lab. Informática»).
//    A    1º   ANALÍTICA
//   8:45       Zutano - Auxiliares
// A cell can bring its own hours («8:00 a 8:45»): Saturday, in the night shifts, has its own morning next to the night
// rows of the week. Mecánica writes its electives as a table instead (Asignatura | Carga Horaria | Día de dictado | ...).
import { juntar } from './planillas.mjs';

const DIAS = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6 };
const TURNOS = { manana: 'Mañana', tarde: 'Tarde', noche: 'Noche' };
const plano = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** The text of each page: [{ texto, x, y, centro }], `y` from the bottom and `centro` the middle of the item. */
async function leerPaginas(bytes) {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  // A copy: pdf.js may keep the buffer it gets.
  const tarea = pdfjs.getDocument({ data: new Uint8Array(bytes), isEvalSupported: false, verbosity: 0 });
  const doc = await tarea.promise;
  try {
    const paginas = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const { items } = await (await doc.getPage(n)).getTextContent();
      paginas.push(
        items
          .filter((i) => i.str?.trim())
          .map((i) => ({ texto: i.str.replace(/\s+/g, ' ').trim(), x: i.transform[4], y: i.transform[5], centro: i.transform[4] + (i.width ?? 0) / 2 })),
      );
    }
    return paginas;
  } finally {
    await tarea.destroy();
  }
}

/** Items grouped in lines by their height, from the top, each line from the left. */
function renglones(items) {
  const filas = [];
  for (const i of [...items].sort((a, b) => b.y - a.y || a.x - b.x)) {
    const fila = filas.at(-1);
    if (fila && fila.y - i.y <= 2.5) fila.items.push(i);
    else filas.push({ y: i.y, items: [i] });
  }
  return filas.map((f) => {
    const items = f.items.sort((a, b) => a.x - b.x);
    return { y: f.y, items, texto: items.map((i) => i.texto).join(' ') };
  });
}

/** Minutes of the day of «7:15», «17.40», «18,35», «1740» or, with `sinMinutos`, «8». */
function minutos(texto, sinMinutos = false) {
  const m = /^(\d{1,2})(?:[:.,]?(\d{2}))?$/.exec(texto.trim());
  if (!m || (!m[2] && !sinMinutos)) return null;
  const h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  return h < 24 && min < 60 ? h * 60 + min : null;
}

// Its own hours in a cell: «8:00 a 8:45», «17.45 a 19.15 hs», «De 8 a 9,35».
const RANGO = /(?:^|\s)(?:de\s+)?(\d{1,2}(?:[:.,]\d{2})?)\s*a\s*(\d{1,2}(?:[:.,]\d{2})?)(?:\s*hs\.?)?(?=\s|$)/i;
function rango(texto) {
  const m = RANGO.exec(texto);
  if (!m || !/[:.,]/.test(m[1] + m[2])) return null;
  const desde = minutos(m[1], true);
  const hasta = minutos(m[2], true);
  return desde !== null && hasta !== null && hasta > desde ? { desde, hasta, texto: m[0] } : null;
}

// The classroom: «Aula 216», «Lab. Informática», «216 / Lab. Metalografía».
const AULA = /^(?:aulas?\b|lab(?:oratorio)?\b\.?|sala\b|anfiteatro\b|taller\b|\d{2,4}\s*(?:[/-]|$))/i;
// A commission in parentheses: that cell is of the commission it names («PROYECTO FINAL (5V02)»).
const OTRA = /^\s*([1-6])\s*(E?)\s*([A-Z])\s*(\d{2})\s*(E?)\s*$/i;
// Words that stay in lower case in a name, and that don't make a line be in lower case («ELECTROTECNIA y»).
const CONECTORES = new Set(['y', 'e', 'o', 'u', 'de', 'del', 'la', 'las', 'el', 'los', 'en', 'a', 'al', 'para', 'con', 'por']);
const enMayusculas = (t) => {
  const sin = t
    .split(/\s+/)
    .filter((p) => !CONECTORES.has(p))
    .join(' ');
  return /\p{Lu}/u.test(sin) && !/\p{Ll}/u.test(sin);
};
const sinBordes = (t) => t.replace(/^[\s\-–,;/]+|[\s\-–,;/]+$/g, '');
const conLetras = (t) => /\p{L}/u.test(t);

/** Teachers as the site shows them: «(Fulano-Mengano)» is «Fulano-Mengano», «Perengano - Auxiliares» is «Perengano». */
export function limpiarDocentes(texto) {
  return sinBordes(
    texto
      .replace(/\s+/g, ' ')
      .replace(/[\s\-–/,]*\baux(?:iliares?)?\b\.?/gi, '')
      .replace(/\b(?:ing|dr|dra|lic|prof|arq)\.\s*/gi, '')
      .replace(/\s*([-–/])\s*/g, '$1'),
  ).trim();
}

const codigo = (año, letra, numero, electivas) => `${año}${electivas ? 'E' : ''}${letra}${numero}`;

/** What one cell says, from its lines, top to bottom: { materia, docentes, aula, desde, hasta, para }, or null if it has
 * no subject. `materia` is as it comes (named later); `desde` and `hasta` are its own hours, if it has them; `para`, the
 * commission it names in parentheses. */
export function leerCelda(lineas, letra = '') {
  let horas = null;
  const aulas = [];
  const quedan = [];
  for (const linea of lineas) {
    let resto = linea;
    const r = rango(resto);
    if (r) {
      horas = r;
      resto = resto.replace(r.texto, ' ').trim();
    }
    if (!resto) continue;
    if (AULA.test(resto)) aulas.push(resto);
    else quedan.push(resto);
  }
  // What goes in parentheses, also over two lines: teachers, the commission, or a subject when nothing else is.
  const grupos = [];
  let para = null;
  const texto = quedan.join('\n').replace(/\(([^()]*)\)?/g, (_, dentro) => {
    const otra = OTRA.exec(dentro);
    if (otra && (!letra || otra[3].toUpperCase() === letra)) para = codigo(otra[1], letra || otra[3].toUpperCase(), otra[4], otra[2] || otra[5]);
    else if (conLetras(dentro)) grupos.push(dentro.replace(/\s+/g, ' ').trim());
    return '\n';
  });
  // The teachers' lines keep their dashes until they are joined: «Fulano - Mengano -» goes on with «Zutano».
  const resto = texto
    .split('\n')
    .map((l) => l.trim())
    .filter(conLetras);
  // Under a subject in capitals, the lines in lower case are the teachers; if all come in lower case, all is the name.
  const mayusculas = resto.some(enMayusculas);
  const nombre = mayusculas ? resto.filter(enMayusculas) : resto;
  const docentes = mayusculas ? resto.filter((l) => !enMayusculas(l)) : [];
  if (!nombre.length && grupos.length && (grupos.length > 1 || grupos[0].split(' ').some((p) => CONECTORES.has(p)))) nombre.push(grupos.shift());
  if (!nombre.length) return null;
  const quienes = [docentes.join(' '), ...grupos].map(limpiarDocentes).filter(Boolean);
  return {
    materia: sinBordes(nombre.map(sinBordes).join(' ').replace(/\s+/g, ' ')).trim(),
    docentes: [...new Set(quienes)].join(', '),
    aula: aulas.join(', '),
    desde: horas?.desde ?? null,
    hasta: horas?.hasta ?? null,
    para,
  };
}

const ROMANO = /^(?=[ivx]+$)x{0,3}(?:ix|iv|v?i{0,3})$/;
/** A name as the faculty writes it: «TECNOLOGIA DE LA CONSTRUCCION» is «Tecnologia de la Construccion», with the
 * connectors in lower case and the roman numerals in capitals. The accents are the ones that come. */
export function comoTitulo(texto) {
  return texto
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((palabra, k) => {
      const baja = palabra.toLocaleLowerCase('es');
      const nucleo = baja.replace(/[^\p{L}\p{N}]/gu, '');
      if (nucleo && ROMANO.test(nucleo)) return palabra.toLocaleUpperCase('es');
      if (k > 0 && CONECTORES.has(nucleo)) return baja;
      return baja.replace(/\p{L}/u, (c) => c.toLocaleUpperCase('es'));
    })
    .join(' ');
}

// The words of a name to compare them, each with the place where it starts and whether it is cut short («GEOM.»).
const fichas = (t) =>
  [...t.matchAll(/[\p{L}\p{N}]+\.?/gu)].map((m) => ({ p: plano(m[0]).replace(/\.$/, ''), corta: m[0].endsWith('.'), donde: m.index }));
const enOrden = (corta, larga) => {
  let i = 0;
  for (const c of larga) if (c === corta[i]) i++;
  return i === corta.length;
};
// «GRAL.» stands for «General» and «ELECT.» for «Eléctricas»; «ACUSTICA» for «Acústicas».
const coincide = (f, p) =>
  f.p === p ||
  (Math.min(f.p.length, p.length) >= 4 && [f.p + 's', f.p + 'es'].includes(p)) ||
  (Math.min(f.p.length, p.length) >= 4 && [p + 's', p + 'es'].includes(f.p)) ||
  (f.corta && f.p.length < p.length && f.p[0] === p[0] && enOrden(f.p, p));

/** The name of a subject: the official one if the text starts with it, else the same name written whole in another cell
 * of the file («ALGEBRA Y GEOM. ANALITICA» next to «ALGEBRA Y GEOMETRIA ANALITICA»), in title case. What follows an
 * official name in lower case goes to the teachers. */
function nombrar(crudo, oficiales, propias) {
  const f = fichas(crudo);
  let mejor = null;
  for (const o of oficiales) {
    if (o.palabras.length <= f.length && o.palabras.every((p, i) => coincide(f[i], p)) && (!mejor || o.palabras.length > mejor.palabras.length)) mejor = o;
  }
  if (mejor) {
    const sobra = mejor.palabras.length < f.length ? crudo.slice(f[mejor.palabras.length].donde).trim() : '';
    if (!sobra) return { materia: mejor.nombre, sobra: '' };
    if (!CONECTORES.has(plano(sobra).split(' ')[0]) && !enMayusculas(sobra)) return { materia: mejor.nombre, sobra };
  }
  // Cut short, or left open («VIAS DE» where the PDF lost «COMUNICACIÓN II»): the one name of the file that fits.
  const abierta = CONECTORES.has(f.at(-1)?.p);
  if (f.some((x) => x.corta) || abierta) {
    const cabe = (p) => (abierta ? p.fichas.length > f.length : p.fichas.length === f.length) && f.every((x, i) => coincide(x, p.fichas[i].p));
    const entera = [...new Set(propias.filter((p) => !CONECTORES.has(p.fichas.at(-1)?.p) && cabe(p)).map((p) => plano(p.texto)))];
    if (entera.length === 1) return nombrar(propias.find((p) => plano(p.texto) === entera[0]).texto, oficiales, []);
  }
  return { materia: comoTitulo(crudo), sobra: '' };
}

/** The title of a page: its commissions, shift, cuatrimestre and whether it is of electives. */
function leerTitulo(texto, letra) {
  const t = texto.toUpperCase();
  const electivas = /\bELECTIVAS?\b/.test(t);
  const codigos = [];
  for (const m of t.matchAll(new RegExp(`\\b([1-6])(E?)${letra}(\\d{2})(E?)\\b`, 'g'))) codigos.push(codigo(m[1], letra, m[3], electivas || m[2] || m[4]));
  if (!codigos.length) {
    for (const m of t.matchAll(/\b([1-6])\s*(?:RO|DO|ER|TO|MO|VO|°|º)?\.?\s+(\d{2})\s+I[A-Z]{1,2}\b/g)) codigos.push(codigo(m[1], letra, m[2], electivas));
  }
  const p = plano(texto);
  const cuatrimestre = /\b(?:primer|1\s*(?:er|ro|°|º|o)?)\s*cuatrimestre/.test(p) ? 1 : /\b(?:segundo|2\s*(?:do|°|º|o)?)\s*cuatrimestre/.test(p) ? 2 : 0;
  return { codigos: [...new Set(codigos)], turno: TURNOS[/\bturno\s+(manana|tarde|noche)\b/.exec(p)?.[1]] ?? '', cuatrimestre, electivas };
}

// «Asignatura Electiva: Herramientas para el Desarrollo Profesional, Docente: Ing. Fulano Juan / ...» under a grid.
const NOTA = /asignatura[^:]*:\s*(.+?)\s*[,;]\s*docentes?\s*:\s*(.+)$/i;

/** One page with the grid of a commission: its title and its cells, or null if it has no grid. */
function leerGrilla(items, letra) {
  const filas = renglones(items);
  const cabecera = filas.find((f) => f.items.filter((i) => DIAS[plano(i.texto)]).length >= 3);
  if (!cabecera) return null;
  const dias = cabecera.items
    .filter((i) => DIAS[plano(i.texto)])
    .map((i) => ({ dia: DIAS[plano(i.texto)], centro: i.centro }))
    .sort((a, b) => a.centro - b.centro);
  const paso = dias.length > 1 ? (dias.at(-1).centro - dias[0].centro) / (dias.length - 1) : 100;
  const hora = cabecera.items.filter((i) => /^hora(rio|s)?$/.test(plano(i.texto)) && i.centro < dias[0].centro).at(-1);
  const izquierda = hora ? (hora.centro + dias[0].centro) / 2 : dias[0].centro - paso / 2;
  const columna = (centro) => {
    if (centro < izquierda) return -1;
    let k = 0;
    for (let j = 1; j < dias.length; j++) if (Math.abs(centro - dias[j].centro) < Math.abs(centro - dias[k].centro)) k = j;
    return k;
  };
  const titulo = leerTitulo(
    filas
      .filter((f) => f.y > cabecera.y + 2)
      .map((f) => f.texto)
      .join(' '),
    letra,
  );

  // The hours, at the left: each one a start, «A» and an end, one under the other. The «A» (or «17.40 a») says which
  // is the start; a start without its end («12:50» over «13:30 / A / 14:10») lasts until the next one.
  const debajo = items.filter((i) => i.y < cabecera.y - 2);
  const horas = [];
  const marcas = [];
  for (const f of renglones(debajo.filter((i) => columna(i.centro) === -1))) {
    for (const i of f.items) {
      if (plano(i.texto) === 'a') marcas.push(f.y);
      const partes = i.texto.replace(/\s+hs\.?$/i, '').split(/\s+a(?:\s+|$)/i);
      partes.forEach((parte, n) => {
        const m = minutos(parte);
        if (m !== null) horas.push({ m, y: f.y, tipo: partes.length > 1 ? (n === 0 ? 'inicio' : 'fin') : null });
      });
    }
  }
  for (const y of marcas) {
    const arriba = horas.findLast((h) => h.y > y);
    const abajo = horas.find((h) => h.y < y);
    if (arriba) arriba.tipo ??= 'inicio';
    if (abajo) abajo.tipo ??= 'fin';
  }
  const bloques = [];
  const despues = (desde, hasta) => (hasta <= desde && hasta < 360 ? hasta + 1440 : hasta);
  for (let k = 0; k < horas.length; k++) {
    const actual = horas[k];
    const siguiente = horas[k + 1];
    if (actual.tipo === 'fin' || !siguiente) continue;
    const hasta = despues(actual.m, siguiente.m);
    if (hasta <= actual.m || hasta - actual.m > 240) continue;
    if (siguiente.tipo === 'inicio') bloques.push({ desde: actual.m, hasta, arriba: actual.y, abajo: actual.y });
    else {
      bloques.push({ desde: actual.m, hasta, arriba: actual.y, abajo: siguiente.y });
      k++;
    }
  }
  if (!bloques.length) return null;
  // «17:40 a 19:15» over «18:35 a 19:15»: the first ends where the next one starts.
  for (let k = 0; k + 1 < bloques.length; k++) if (bloques[k].hasta > bloques[k + 1].desde) bloques[k].hasta = bloques[k + 1].desde;
  bloques.forEach((b, k) => {
    b.techo = k === 0 ? cabecera.y - 2 : (bloques[k - 1].abajo + b.arriba) / 2;
    b.piso = k === bloques.length - 1 ? b.abajo - 7 : (b.abajo + bloques[k + 1].arriba) / 2;
  });

  const celdas = new Map();
  const pie = [];
  for (const i of debajo) {
    if (i.y <= bloques.at(-1).piso) {
      pie.push(i);
      continue;
    }
    const c = columna(i.centro);
    const k = bloques.findIndex((b) => i.y <= b.techo && i.y > b.piso);
    if (c < 0 || k < 0) continue;
    const clave = `${k}:${c}`;
    if (!celdas.has(clave)) celdas.set(clave, { bloque: bloques[k], dia: dias[c].dia, items: [] });
    celdas.get(clave).items.push(i);
  }
  const leidas = [];
  for (const { bloque, dia, items: suyos } of celdas.values()) {
    const celda = leerCelda(
      renglones(suyos).map((f) => f.texto),
      letra,
    );
    if (celda) leidas.push({ ...celda, dia, desde: celda.desde ?? bloque.desde, hasta: celda.hasta ?? bloque.hasta });
  }
  const notas = renglones(pie)
    .map((f) => NOTA.exec(f.texto))
    .filter(Boolean)
    .map((m) => ({ materia: m[1], docentes: limpiarDocentes(m[2]) }));
  return { ...titulo, celdas: leidas, notas };
}

/** Mecánica's electives: a table with a row per subject, without commission or year. */
function leerTabla(items) {
  const filas = renglones(items);
  const cabecera = filas.find((f) => f.items.some((i) => plano(i.texto) === 'asignatura') && f.items.some((i) => /^hora (de )?inicio$/.test(plano(i.texto))));
  if (!cabecera) return null;
  const COLUMNAS = { materia: /^asignatura/, dia: /^dia/, desde: /^hora (de )?inicio/, hasta: /^hora (de )?fin/, aula: /^aula/, docentes: /^docente/, carga: /^carga/ };
  const columnas = Object.entries(COLUMNAS)
    .map(([nombre, re]) => [nombre, cabecera.items.find((i) => re.test(plano(i.texto)))?.centro])
    .filter(([, centro]) => centro !== undefined);
  const columna = (i) => columnas.reduce((a, b) => (Math.abs(i.centro - b[1]) < Math.abs(i.centro - a[1]) ? b : a))[0];
  const debajo = filas.filter((f) => f.y < cabecera.y - 2);
  const datos = [];
  for (const f of debajo) {
    const de = (nombre) =>
      f.items
        .filter((i) => columna(i) === nombre)
        .map((i) => i.texto)
        .join(' ');
    const dia = DIAS[plano(de('dia'))];
    const desde = minutos(de('desde'));
    const hasta = minutos(de('hasta'));
    if (dia && desde !== null && hasta !== null && hasta > desde) datos.push({ y: f.y, dia, desde, hasta, aula: de('aula'), docentes: limpiarDocentes(de('docentes')), lineas: [] });
  }
  if (!datos.length) return null;
  // The name goes over one or two lines around its row: each line, to the nearest row.
  for (const f of debajo) {
    const texto = f.items
      .filter((i) => columna(i) === 'materia')
      .map((i) => i.texto)
      .join(' ');
    if (!conLetras(texto)) continue;
    datos.reduce((a, b) => (Math.abs(b.y - f.y) < Math.abs(a.y - f.y) ? b : a)).lineas.push(texto);
  }
  const titulo = leerTitulo(
    filas
      .filter((f) => f.y > cabecera.y + 2)
      .map((f) => f.texto)
      .join(' '),
    '',
  );
  const celdas = datos
    .filter((d) => d.lineas.length)
    .map(({ lineas, y: _y, ...d }) => ({ ...d, materia: lineas.join(' ').replace(/\s+/g, ' ').trim(), para: null }));
  return { codigos: [], turno: titulo.turno, cuatrimestre: titulo.cuatrimestre, electivas: true, tabla: true, celdas, notas: [] };
}

/** The classes, the same subject in hours one after the other joined (planillas.mjs), with the classrooms of all. Each
 * subject apart: on Saturday two can go at the same time («ING. LEGAL» from 8:00 next to another from 9:00 to 12:00). */
function juntarConAulas(clases) {
  const porMateria = Map.groupBy(clases, (c) => c.materia);
  return [...porMateria.values()]
    .flatMap((suyas) =>
      juntar(suyas).map((j) => ({
        ...j,
        aula: [
          ...new Set(
            suyas
              .filter((c) => c.cuatrimestre === j.cuatrimestre && c.dia === j.dia && c.desde >= j.desde && c.hasta <= j.hasta)
              .flatMap((c) => c.aula.split(', '))
              .filter(Boolean),
          ),
        ].join(', '),
      })),
    )
    .sort((x, y) => x.cuatrimestre - y.cuatrimestre || x.dia - y.dia || x.desde - y.desde);
}

/** Every commission of one PDF, with its classes named and joined, in the shape of `horariosDeLibros` (planillas.mjs):
 * [{ comision, turno, clases: [{ cuatrimestre, dia, desde, hasta, materia, docentes, aula }] }].
 * `letra`: the letter of the career in the codes (Civil O, Eléctrica Q, Mecánica S, Química V, Sistemas K).
 * `conocidas`: the official names of the subjects, to write them whole. A commission comes once even if it takes several
 * pages; a page that names two («5V02, 5V01») gives both. Mecánica's table of electives, with no commission, comes as
 * { comision: null, electivas: true }. A PDF without text (scanned) gives []. `hasta` passes 1440 after midnight. */
export async function horariosDePdf(bytes, { letra, conocidas = [] } = {}) {
  const letraCodigo = String(letra ?? '').toUpperCase();
  const paginas = (await leerPaginas(bytes)).map((items) => (items.length ? (leerGrilla(items, letraCodigo) ?? leerTabla(items)) : null)).filter(Boolean);
  const oficiales = conocidas.map((nombre) => ({ nombre, palabras: fichas(nombre).map((f) => f.p) }));
  const propias = paginas.flatMap((p) => p.celdas.map((c) => ({ texto: c.materia, fichas: fichas(c.materia) })).filter((p) => !p.fichas.some((f) => f.corta)));

  const comisiones = new Map();
  const sumar = (comision, pagina, clases) => {
    const clave = comision ?? `sin código${pagina.tabla ? ' (tabla)' : ''}`;
    if (!comisiones.has(clave)) comisiones.set(clave, { comision, turno: pagina.turno, ...(pagina.tabla ? { electivas: true } : {}), clases: [] });
    const c = comisiones.get(clave);
    if (!c.turno) c.turno = pagina.turno;
    c.clases.push(...clases);
  };
  for (const pagina of paginas) for (const celda of pagina.celdas) celda.nombrada = nombrar(celda.materia, oficiales, propias);
  // One file writes «ANALISIS MATEMÁTICO II» next to «ANÁLISIS MATEMÁTICO II»: the one with its accents, for both.
  const tildes = (t) => t.normalize('NFD').replace(/[^̀-ͯ]/g, '').length;
  const conTildes = new Map();
  for (const pagina of paginas) {
    for (const { nombrada } of pagina.celdas) {
      const antes = conTildes.get(plano(nombrada.materia));
      if (!antes || tildes(nombrada.materia) > tildes(antes)) conTildes.set(plano(nombrada.materia), nombrada.materia);
    }
  }
  for (const pagina of paginas) {
    const notas = new Map(pagina.notas.map((n) => [plano(nombrar(n.materia, oficiales, propias).materia), n.docentes]));
    const clases = pagina.celdas.map(({ nombrada: { materia, sobra }, docentes, aula, dia, desde, hasta, para }) => {
      const quienes = [docentes, limpiarDocentes(sobra)].filter(Boolean).join(', ') || notas.get(plano(materia)) || '';
      return { para, clase: { cuatrimestre: pagina.cuatrimestre, dia, desde, hasta, materia: conTildes.get(plano(materia)), docentes: quienes, aula } };
    });
    const propiosDeLaPagina = pagina.codigos.length ? pagina.codigos : [null];
    for (const comision of propiosDeLaPagina) sumar(comision, pagina, clases.filter((c) => !c.para || c.para === comision).map((c) => c.clase));
    // A cell that names another commission is of that one, and only that cell: Química's 5V01 page gives a second
    // group of Proyecto Final («PROYECTO FINAL (5V02)»), and the rest of 5º is still only 5V01.
    for (const otra of new Set(clases.map((c) => c.para).filter((p) => p && !propiosDeLaPagina.includes(p)))) {
      sumar(otra, pagina, clases.filter((c) => c.para === otra).map((c) => c.clase));
    }
  }
  return [...comisiones.values()].map((c) => ({ ...c, clases: juntarConAulas(c.clases) })).filter((c) => c.clases.length);
}
