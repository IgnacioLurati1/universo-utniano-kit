// Brings the class schedules of the faculty (UTN FRRO) and checks its academic calendar, from its public pages.
//
//   node facultad/actualizar.mjs            rewrites datos/horarios.json and datos/fuentes.json
//   node facultad/actualizar.mjs --revisar  writes nothing: prints what changed in Markdown and exits with 2 if
//                                           something did (run it on a schedule if you want to be told)
//   node facultad/actualizar.mjs --sin-calendario  rewrites them but keeps the fingerprint of the calendar it had, so a
//                                           new calendar keeps being noticed until someone passes it by hand
//
// Every career, from the page of its department:
//   Sistemas publishes spreadsheets, one per year (planillas.mjs).
//   Civil, Química and Mecánica publish PDF files made from the same template (pdfs.mjs); Mecánica keeps them in a Drive
//     folder. A scanned PDF has no text and can't be read.
//   Materias Básicas publishes a spreadsheet per career with its basic subjects (basicas.mjs). It fills the commissions
//     a department didn't give (Eléctrica's own files don't open).
// What couldn't be read goes to `faltan` of its career, so a user of this data can say it. The official names of the
// subjects come from datos/plan-sistemas.json for Sistemas and from planes.json (the curricula) for the rest.
// The academic calendar comes as a scanned PDF without text: datos/calendario.js is written by hand from it,
// and here only its fingerprint is checked, so a new one is noticed.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { horariosDeBasicas } from './basicas.mjs';
import { horariosDePdf } from './pdfs.mjs';
import { horariosDeLibros, leerLibro } from './planillas.mjs';

const DATOS = path.join(import.meta.dirname, 'datos');
const SITIO = 'https://www.frro.utn.edu.ar';
// The careers, in the order the site lists them, with the letter of their commissions and how Básicas names them.
const CARRERAS = [
  { id: 'civil', letra: 'O', sigla: 'IC', nombre: 'Civil', pagina: '/22/Ingenieria-Civil' },
  { id: 'electrica', letra: 'Q', sigla: 'IE', nombre: 'Eléctrica', pagina: '/23/Ingenieria-en-Electrica' },
  { id: 'mecanica', letra: 'S', sigla: 'IM', nombre: 'Mecánica', pagina: '/24/Ingenieria-Mecanica' },
  { id: 'quimica', letra: 'V', sigla: 'IQ', nombre: 'Química', pagina: '/25/Ingenieria-Quimica' },
  { id: 'sistemas', letra: 'K', sigla: 'ISI', nombre: 'Sistemas', pagina: '/26/Ingenieria-en-Sistemas-de-Informacion' },
];
const BASICAS = `${SITIO}/21/materias-Basicas`;
const CALENDARIO = `${SITIO}/CALENDARIO_ACADEMICO_UTN.pdf`;

const revisar = process.argv.includes('--revisar');

const ENTIDADES = { aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', ntilde: 'ñ', Ntilde: 'Ñ', nbsp: ' ', raquo: '', laquo: '', rarr: '', deg: '°', ordm: 'º', ndash: '–', amp: '&', quot: '"' };
const texto = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&([a-zA-Z]+);/g, (m, e) => ENTIDADES[e] ?? m)
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/\s+/g, ' ')
    .trim();
const enlaces = (html) =>
  [...html.matchAll(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => ({ url: m[1].replace(/&amp;/g, '&').trim(), texto: texto(m[2]).replace(/^[»\s]+/, '') }));
// A link as the browser would open it: spaces and «º» written in the address get encoded.
const absoluta = (url) => new URL(url, SITIO).href;
const huella = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);
const plano = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
// The value that comes most times; on a tie, the greatest.
const masDicho = (lista) => {
  const veces = new Map();
  for (const a of lista) veces.set(a, (veces.get(a) ?? 0) + 1);
  return [...veces].sort((a, b) => b[1] - a[1] || (b[0] > a[0] ? 1 : -1))[0][0];
};

// Only the faculty's site and Google's (Docs and Drive, whose downloads come from googleusercontent.com), and at most this much per file: a changed page
// can't send this script anywhere else or fill the memory.
const PERMITIDOS = new Set(['www.frro.utn.edu.ar', 'frro.utn.edu.ar', 'docs.google.com', 'drive.google.com', 'drive.usercontent.google.com']);
const TOPE_BYTES = 20 * 1024 * 1024;
export const permitida = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (PERMITIDOS.has(u.hostname) || u.hostname.endsWith('.googleusercontent.com'));
  } catch {
    return false;
  }
};

async function pedir(url) {
  if (!permitida(url)) throw new Error(`Dirección fuera de la facultad: ${url}`);
  const r = await fetch(url, { headers: { 'user-agent': 'universo-utniano-kit' }, redirect: 'follow' });
  if (!permitida(r.url)) throw new Error(`La facultad redirigió fuera de sus sitios: ${r.url}`);
  if (Number(r.headers.get('content-length')) > TOPE_BYTES) throw new Error(`Archivo de más de 20 MB: ${url}`);
  const partes = [];
  let total = 0;
  for await (const parte of r.body ?? []) {
    total += parte.length;
    if (total > TOPE_BYTES) throw new Error(`Archivo de más de 20 MB: ${url}`);
    partes.push(parte);
  }
  const bytes = new Uint8Array(total);
  let i = 0;
  for (const parte of partes) {
    bytes.set(parte, i);
    i += parte.length;
  }
  return { ok: r.ok, estado: r.status, tipo: r.headers.get('content-type') ?? '', bytes };
}
async function bajar(url, comoTexto = false) {
  const r = await pedir(url);
  if (!r.ok) throw new Error(`${url} respondió ${r.estado}`);
  return comoTexto ? new TextDecoder().decode(r.bytes) : r.bytes;
}
const hojaDe = (url) => url.match(/docs\.google\.com\/spreadsheets\/d\/([\w-]{20,})/)?.[1] ?? null;
const exportar = (id) => `https://docs.google.com/spreadsheets/d/${id}/export?format=xlsx`;
const esPdf = (bytes) => bytes.length > 4 && String.fromCharCode(...bytes.slice(0, 4)) === '%PDF';

// The files of a public Drive folder, from its page: each file is a `data-id` with its name in an aria-label.
const esCarpetaDeDrive = (url) => {
  try {
    const u = new URL(url);
    return u.hostname === 'drive.google.com' && u.pathname.startsWith('/drive/folders/');
  } catch {
    return false;
  }
};

async function archivosDeCarpeta(url) {
  const html = await bajar(url, true);
  const ids = [...html.matchAll(/data-id="([\w-]{25,})"/g)];
  const archivos = [];
  for (const [i, m] of ids.entries()) {
    const tramo = html.slice(m.index, ids[i + 1]?.index ?? m.index + 20000);
    const nombre = tramo.match(/aria-label="([^"]+?\.pdf) PDF/)?.[1];
    if (nombre && !archivos.some((a) => a.id === m[1])) archivos.push({ id: m[1], texto: nombre.replace(/\.pdf$/i, ''), url: `https://drive.google.com/uc?export=download&id=${m[1]}` });
  }
  return archivos;
}

// The year a file says it is for: «CICLO LECTIVO 2026», «HORARIOS 2026», «AÑO 2026», «Horarios MECÁNICA 2026 101».
// Sistemas doesn't write it in its spreadsheets.
const anioEn = (t) => Number(t.match(/\b(?:ciclo lectivo|horarios?|a[ñn]o|mec[aá]nica)\s+(20\d{2})\b/i)?.[1]) || null;
async function textoDePdf(bytes) {
  // A copy: pdf.js takes the buffer it is given.
  const tarea = pdfjs.getDocument({ data: bytes.slice(), isEvalSupported: false, verbosity: 0 });
  const t = await (await (await tarea.promise).getPage(1)).getTextContent();
  await tarea.destroy();
  return t.items.map((i) => i.str).join(' ');
}
const textoDeLibro = (bytes) => leerLibro(bytes).flatMap((h) => h.filas.slice(0, 6).flat().filter((c) => typeof c === 'string')).join(' ');

// The subjects of each career with their official names: the plan of Sistemas (datos/plan-sistemas.json), plus what its
// curriculum (planes.json) adds; the rest, from planes.json. `alias` there: names a schedule writes its own way, and the
// official one for each (the check lists the names out of a curriculum).
const planSistemas = JSON.parse(fs.readFileSync(path.join(DATOS, 'plan-sistemas.json'), 'utf8'));
const nombresSistemas = [...planSistemas.obligatorias, ...planSistemas.electivas].map((m) => m.nombre).concat(planSistemas.sinCorrelativas);
const planes = JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'planes.json'), 'utf8'));
const conocidasDe = (id) => [...(id === 'sistemas' ? nombresSistemas : []), ...(planes[id]?.materias ?? [])];
const llano = (s) => plano(s).replace(/[^a-z0-9]+/g, ' ').trim();
const alias = Object.fromEntries(Object.entries(planes).map(([id, p]) => [id, new Map(Object.entries(p.alias ?? {}).map(([k, v]) => [llano(k), v]))]));
const renombrar = (id, materia) => alias[id]?.get(llano(materia)) ?? materia;

const leerJson = (archivo, porDefecto) => {
  try {
    return JSON.parse(fs.readFileSync(path.join(DATOS, archivo), 'utf8'));
  } catch {
    return porDefecto;
  }
};
const antes = leerJson('fuentes.json', {});
const datosAntes = leerJson('horarios.json', null);

// Every file read, with its fingerprint, to notice when one changes: { carrera, texto, url, huella }.
const archivos = [];
// What a career's page links but couldn't be read: { texto, motivo: 'no-abre' | 'sin-texto' | 'sin-horarios' }.
const faltan = Object.fromEntries(CARRERAS.map((c) => [c.id, []]));
// The commissions of each career, by code.
const comisiones = Object.fromEntries(CARRERAS.map((c) => [c.id, new Map()]));
// The years its files say, to know which year its schedules are of.
const anios = Object.fromEntries(CARRERAS.map((c) => [c.id, []]));
const anotarAnio = (carrera, ...textos) => {
  const anio = textos.map(anioEn).find(Boolean);
  if (anio) anios[carrera].push(anio);
};
const sumar = (carrera, lista, desde) => {
  for (const c of lista) {
    const ya = comisiones[carrera].get(c.comision);
    // The same commission in two files (Química publishes each cuatrimestre apart): its classes together.
    const clases = c.clases.map((x) => ({ ...x, materia: renombrar(carrera, x.materia) }));
    if (ya && ya.desde === desde) ya.clases.push(...clases);
    else if (!ya) comisiones[carrera].set(c.comision, { ...c, clases, desde });
  }
};

// Sistemas: one spreadsheet per year and one per year of electives.
const sistemas = CARRERAS.find((c) => c.id === 'sistemas');
const paginaSistemas = await bajar(SITIO + sistemas.pagina, true);
const planillas = [];
for (const e of enlaces(paginaSistemas)) {
  const id = hojaDe(e.url);
  if (!id || !/(año|electivas|analista)/i.test(e.texto) || planillas.some((p) => p.id === id)) continue;
  planillas.push({ id, texto: e.texto });
}
if (!planillas.length) throw new Error('La página de Sistemas no tiene las planillas de horarios donde se esperaban.');
const libros = [];
for (const p of planillas) {
  const bytes = await bajar(exportar(p.id));
  archivos.push({ carrera: 'sistemas', texto: p.texto, url: exportar(p.id), huella: huella(bytes) });
  libros.push(bytes);
}
sumar('sistemas', horariosDeLibros(libros, conocidasDe('sistemas')), 'departamento');

// Civil, Eléctrica, Mecánica and Química: the PDFs their pages link, also inside a Drive folder.
for (const carrera of CARRERAS.filter((c) => c.id !== 'sistemas')) {
  const html = await bajar(SITIO + carrera.pagina, true);
  const lista = [];
  for (const e of enlaces(html)) {
    if (!/horario/i.test(e.url + e.texto) || /consulta|libros|#|^mailto:/i.test(e.url) || !e.texto || /horarios y aulas/i.test(e.texto)) continue;
    if (esCarpetaDeDrive(e.url)) lista.push(...(await archivosDeCarpeta(e.url)));
    else if (/\.pdf$/i.test(e.url.split('?')[0])) lista.push({ texto: e.texto, url: absoluta(e.url) });
  }
  const unicos = lista.filter((e, i) => lista.findIndex((x) => x.url === e.url) === i);
  if (!unicos.length) faltan[carrera.id].push({ texto: 'Horarios', motivo: 'sin-horarios' });
  for (const e of unicos) {
    const r = await pedir(e.url);
    if (!r.ok || !esPdf(r.bytes)) {
      faltan[carrera.id].push({ texto: e.texto, motivo: 'no-abre' });
      continue;
    }
    archivos.push({ carrera: carrera.id, texto: e.texto, url: e.url, huella: huella(r.bytes) });
    anotarAnio(carrera.id, await textoDePdf(r.bytes), e.texto);
    const leidas = await horariosDePdf(r.bytes.slice(), { letra: carrera.letra, conocidas: conocidasDe(carrera.id) });
    if (!leidas.length) faltan[carrera.id].push({ texto: e.texto, motivo: 'sin-texto' });
    sumar(carrera.id, leidas, 'departamento');
  }
  // A table of electives without a commission (Mecánica): the site gives it one, «Electivas» of the last year as
  // Sistemas writes them («5EK01»), and its shift by the hours its classes start.
  const sueltas = comisiones[carrera.id].get(null);
  if (sueltas) {
    comisiones[carrera.id].delete(null);
    const ultimo = Math.max(5, ...[...comisiones[carrera.id].keys()].map((k) => Number(k[0])));
    const turnos = sueltas.clases.map((x) => (x.desde >= 18 * 60 ? 'Noche' : x.desde >= 12 * 60 ? 'Tarde' : 'Mañana'));
    const turno = sueltas.turno || masDicho(turnos);
    comisiones[carrera.id].set(`${ultimo}E${carrera.letra}01`, { ...sueltas, comision: `${ultimo}E${carrera.letra}01`, turno });
  }
}

// Materias Básicas: a spreadsheet per career, named by it. Only for the commissions the department didn't give.
const paginaBasicas = await bajar(BASICAS, true);
for (const e of enlaces(paginaBasicas)) {
  const id = hojaDe(e.url);
  const carrera = id && CARRERAS.find((c) => c.id !== 'sistemas' && plano(e.texto).includes(plano(c.nombre)) && /ingenier/i.test(e.texto));
  if (!carrera || archivos.some((a) => a.url === exportar(id))) continue;
  const r = await pedir(exportar(id));
  if (!r.ok) {
    faltan[carrera.id].push({ texto: `Básicas, ${e.texto}`, motivo: 'no-abre' });
    continue;
  }
  archivos.push({ carrera: carrera.id, texto: `Básicas, ${e.texto}`, url: exportar(id), huella: huella(r.bytes) });
  anotarAnio(carrera.id, textoDeLibro(r.bytes));
  sumar(carrera.id, horariosDeBasicas([r.bytes], { letra: carrera.letra, sigla: carrera.sigla, conocidas: conocidasDe(carrera.id) }), 'basicas');
}

const calendario = { url: CALENDARIO, huella: huella(await bajar(CALENDARIO)) };

// The year of each career's schedules: the one its files say most. Without one (Sistemas), the one it had, or this
// year when its files changed from February on: the new schedules come out before classes start.
const anioActual = new Date().getFullYear();
const huellasAntes = new Map((antes.archivos ?? []).map((a) => [a.url, a.huella]));
const cicloDe = (carrera) => {
  if (anios[carrera.id].length) return masDicho(anios[carrera.id]);
  const previo = datosAntes?.carreras?.find((c) => c.letra === carrera.letra)?.ciclo ?? datosAntes?.ciclo ?? anioActual;
  const cambio = archivos.some((a) => a.carrera === carrera.id && huellasAntes.get(a.url) !== a.huella);
  return cambio && new Date().getMonth() >= 1 ? Math.max(previo, anioActual) : previo;
};
const ciclos = Object.fromEntries(CARRERAS.map((c) => [c.id, cicloDe(c)]));
const ciclo = Math.max(...Object.values(ciclos));

// Compact: the subjects once, and each class as [cuatrimestre, día, desde, hasta, materia]; teachers are read but never kept.
const todas = CARRERAS.flatMap((c) => [...comisiones[c.id].values()]);
const materias = [...new Set(todas.flatMap((c) => c.clases.map((x) => x.materia)))].sort((a, b) => a.localeCompare(b, 'es'));
const clave = (x) => [x.cuatrimestre, x.dia, x.desde, x.hasta, x.materia].join('|');
const datos = {
  ciclo,
  carreras: CARRERAS.map((c) => ({
    letra: c.letra,
    ciclo: ciclos[c.id],
    pagina: SITIO + c.pagina,
    // Commissions only Básicas gave: the site says they carry the basic subjects alone.
    soloBasicas: [...comisiones[c.id].values()].filter((x) => x.desde === 'basicas').map((x) => x.comision).sort(),
    faltan: faltan[c.id],
  })),
  materias,
  comisiones: todas
    .sort((a, b) => a.comision.localeCompare(b.comision, 'es', { numeric: true }))
    .map((c) => ({
      codigo: c.comision,
      turno: c.turno,
      clases: c.clases
        .filter((x, i, lista) => lista.findIndex((y) => clave(y) === clave(x)) === i)
        .sort((x, y) => x.cuatrimestre - y.cuatrimestre || x.dia - y.dia || x.desde - y.desde)
        .map((x) => [x.cuatrimestre, x.dia, x.desde, x.hasta, materias.indexOf(x.materia)]),
    })),
};
const sinCalendario = process.argv.includes('--sin-calendario') && antes.calendario;
const fuentes = { archivos, calendario: sinCalendario ? antes.calendario : calendario };

// Signs that a schedule was read wrong, which no error shows: subjects out of their career's curriculum (a teacher
// glued to the name, a new format), and a career that lost many commissions.
const letraDeCodigo = (codigo) => /^\d[EA]?([A-Z])\d{2}$/.exec(codigo ?? '')?.[1];
const materiasDe = (d, letra) => new Set((d?.comisiones ?? []).filter((c) => letraDeCodigo(c.codigo) === letra).flatMap((c) => c.clases.map((x) => d.materias[x[4]])));
const fueraDelPlan = Object.fromEntries(
  CARRERAS.map((c) => {
    const plan = new Set(conocidasDe(c.id).map(llano));
    return [c.id, [...materiasDe(datos, c.letra)].filter((m) => !plan.has(llano(m))).sort((a, b) => a.localeCompare(b, 'es'))];
  }),
);
const cuantasEn = (d, letra) => (d?.comisiones ?? []).filter((c) => letraDeCodigo(c.codigo) === letra).length;

if (!revisar) {
  fs.mkdirSync(DATOS, { recursive: true });
  // `revisado`: the day the data was brought. Only when something changed, so a run without news leaves no diff.
  const cambio = JSON.stringify({ ...datosAntes, revisado: undefined }) !== JSON.stringify({ ...datos, revisado: undefined });
  const revisado = cambio || !datosAntes?.revisado ? new Date().toISOString().slice(0, 10) : datosAntes.revisado;
  fs.writeFileSync(path.join(DATOS, 'horarios.json'), `${JSON.stringify({ ...datos, revisado })}\n`);
  fs.writeFileSync(path.join(DATOS, 'fuentes.json'), `${JSON.stringify(fuentes, null, 2)}\n`);
  const cuantas = CARRERAS.map((c) => `${c.nombre} ${comisiones[c.id].size}`).join(', ');
  console.log(`Comisiones: ${cuantas}. ${materias.length} materias, ciclo ${ciclo}${cambio ? '' : ' (sin cambios)'}.`);
  for (const c of CARRERAS) for (const f of faltan[c.id]) console.log(`Sin leer, ${c.nombre}: «${f.texto}» (${f.motivo}).`);
  if (sinCalendario && antes.calendario.huella !== calendario.huella) console.log('El calendario académico cambió y no se trae solo: hay que pasarlo a mano a `datos/calendario.js`.');
  for (const c of CARRERAS) if (fueraDelPlan[c.id].length) console.log(`Fuera del plan, ${c.nombre}: ${fueraDelPlan[c.id].map((m) => `«${m}»`).join(', ')}.`);
  process.exit(0);
}

// --revisar: what is different from what the site has.
const cambios = [];
const nombreDe = (id) => CARRERAS.find((c) => c.id === id)?.nombre ?? id;
const previos = new Map((antes.archivos ?? []).map((a) => [a.url, a]));
for (const a of archivos) {
  const p = previos.get(a.url);
  if (!p) cambios.push(`- ${nombreDe(a.carrera)} publicó un horario nuevo: «${a.texto}».`);
  else if (p.huella !== a.huella) cambios.push(`- Cambió el horario «${a.texto}» de ${nombreDe(a.carrera)}.`);
}
for (const p of antes.archivos ?? []) if (!archivos.some((a) => a.url === p.url)) cambios.push(`- ${nombreDe(p.carrera)} sacó el horario «${p.texto}».`);
const faltabaAntes = new Set((datosAntes?.carreras ?? []).flatMap((c) => c.faltan.map((f) => `${c.letra}|${f.texto}`)));
for (const c of CARRERAS) {
  for (const f of faltan[c.id]) if (!faltabaAntes.has(`${c.letra}|${f.texto}`)) cambios.push(`- No se pudo leer «${f.texto}» de ${c.nombre} (${f.motivo}).`);
  const yaEstaban = materiasDe(datosAntes, c.letra);
  const nuevas = fueraDelPlan[c.id].filter((m) => !yaEstaban.has(m));
  if (nuevas.length) cambios.push(`- Materias de ${c.nombre} que no están en su plan (\`planes.json\`): ${nuevas.map((m) => `«${m}»`).join(', ')}. Puede ser una materia nueva o un horario mal leído.`);
  const [eran, son] = [cuantasEn(datosAntes, c.letra), cuantasEn(datos, c.letra)];
  if (son < eran && son <= Math.floor(eran * 0.7)) cambios.push(`- ${c.nombre} pasó de ${eran} comisiones a ${son}. Fijate si cambió el formato de sus horarios.`);
}
if (antes.calendario?.huella !== calendario.huella) cambios.push(`- Cambió el calendario académico (${CALENDARIO}). Hay que pasarlo a mano a \`facultad/datos/calendario.js\`.`);
// The calendar of the site runs out once a year: a month before, even if the faculty didn't publish the new one yet.
const { CALENDARIO: delSitio } = await import('./datos/calendario.js');
const faltanDias = (Date.parse(delSitio.hasta) - Date.now()) / 86_400_000;
if (faltanDias < 30) cambios.push(`- El calendario académico del sitio (${delSitio.ciclo}) ${faltanDias < 0 ? 'ya terminó' : 'termina en menos de un mes'}. Fijate si la facultad publicó el nuevo.`);
if (!cambios.length) {
  console.log('Sin cambios en la información de la facultad.');
  process.exit(0);
}
console.log(['Cambió información de la facultad:', '', ...cambios, '', 'Para traer los horarios nuevos corré `node facultad/actualizar.mjs`. El calendario se pasa a mano.'].join('\n'));
process.exit(2);
