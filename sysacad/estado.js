// Reads the academic record page (Estado académico) into plain data. Nothing leaves the function.
import { ELECTIVAS_CORTADAS, nombreEntero, normalizar, tablaConColumnas } from './base.js';

// Graduating takes 20 hours of electives in total (Ordinance 1877/2022 of UTN), only for Ingeniería en Sistemas de
// Información, plan 2023.
export const HORAS_ELECTIVAS = 20;

// "Aprobada con 8 (5 hs.) Tomo: 111 Folio: 22" -> { tipo: 'aprobada', nota: 8, horas: 5, ... }.
// `tipo` is aprobada, regular, pendiente (empty) or otro (anything else, kept in `crudo`).
// Tomo and folio are the student's own data: keep them in the student's browser and nowhere else.
export function cambioDeEstado(texto) {
  const crudo = texto.trim();
  const n = normalizar(crudo);
  const tipo = !n ? 'pendiente'
    : /^(aprobad|promocion|equivalen)/.test(n) ? 'aprobada'
    : /^regular/.test(n) ? 'regular'
    : 'otro';
  const nota = crudo.match(/\bcon\s+(\d+(?:[.,]\d+)?)/i)?.[1];
  const cuando = crudo.match(/\ben\s+(\d{4})(\s*\([^)]+\))?/i);
  const horas = crudo.match(/\((\d+)\s*hs/i)?.[1];
  const tomo = crudo.match(/tomo:?\s*(\S+)/i)?.[1];
  const folio = crudo.match(/folio:?\s*(\S+)/i)?.[1];
  const registro = tomo ? (folio ? `Tomo ${tomo}, folio ${folio}` : `Tomo ${tomo}`) : '';
  return { tipo, cuando: cuando ? `${cuando[1]}${cuando[2] ?? ''}` : '', registro, horas: horas ? Number(horas) : 0, nota: nota ? Number(nota.replace(',', '.')) : null, crudo };
}

export const esElectiva = (nombre) => /\(elec/i.test(nombre) || ELECTIVAS_CORTADAS.some(([prefijo]) => normalizar(nombre).startsWith(prefijo));

// Sysacad lists it without the mark, but it is an elective of the plan that adds no elective hours.
export const esSeminario = (nombre) => normalizar(nombre).startsWith('seminario integrador');

// `doc` is a Document (or any element holding the page). `carrera` is the career as the menu of Sysacad writes it under
// the student's name (for example "Ingeniería en Sistemas de Información"); it only decides whether the 20 hours of
// electives apply. Returns null when the page has no such table.
//
// {
//   materias: [{ anio, plan, nombre, opcional, electiva, seminario, enProgreso, tipo, cuando, registro, horas, nota, crudo }],
//   resumen: { total, aprobadas, regulares, sinCursar, promedio, notas },   // counts leave electives and pending complements out
//   electivas: { cantidad, aprobadas, regulares, horas, requeridas, faltan } | null,
// }
export function leerEstadoAcademico(doc, { carrera = '' } = {}) {
  const hallada = tablaConColumnas(doc, ['ano', 'materia', 'estado']);
  if (!hallada) return null;
  const { filas, cabecera, titulos } = hallada;
  const col = (n) => titulos.indexOf(n);

  const materias = filas
    .filter((f) => f !== cabecera && f.cells.length === cabecera.cells.length)
    .map((f) => {
      const celda = (n) => f.cells[col(n)]?.textContent.trim() ?? '';
      const nombre = nombreEntero(celda('materia'));
      const estado = cambioDeEstado(celda('estado'));
      const seminario = esSeminario(nombre);
      const electiva = seminario || esElectiva(nombre);
      // A pending equivalence complement applies only to students who changed plans.
      const complemento = /^compl/i.test(nombre);
      const opcional = electiva || complemento;
      const enProgreso = !electiva && !(complemento && estado.tipo === 'pendiente');
      return { anio: celda('ano'), plan: celda('plan'), nombre, opcional, electiva, seminario, enProgreso, ...estado };
    })
    .filter((m) => m.nombre);
  if (!materias.length) return null;

  const cuentan = materias.filter((m) => m.enProgreso);
  const notas = materias.map((m) => m.nota).filter((n) => n !== null);
  const resumen = {
    total: cuentan.length,
    aprobadas: cuentan.filter((m) => m.tipo === 'aprobada').length,
    regulares: cuentan.filter((m) => m.tipo === 'regular').length,
    sinCursar: cuentan.filter((m) => m.tipo === 'pendiente').length,
    promedio: notas.length ? notas.reduce((a, b) => a + b, 0) / notas.length : null,
    notas: notas.length,
  };

  const electivas = materias.filter((m) => m.electiva);
  let detalle = null;
  if (electivas.length) {
    const aprobadas = electivas.filter((m) => m.tipo === 'aprobada');
    const horas = aprobadas.filter((m) => !m.seminario).reduce((suma, m) => suma + m.horas, 0);
    const aplica = materias.some((m) => m.plan === '2023') && normalizar(carrera) === 'ingenieria en sistemas de informacion';
    detalle = {
      cantidad: electivas.length,
      aprobadas: aprobadas.length,
      regulares: electivas.filter((m) => m.tipo === 'regular').length,
      horas,
      requeridas: aplica ? HORAS_ELECTIVAS : null,
      faltan: aplica ? Math.max(0, HORAS_ELECTIVAS - horas) : null,
    };
  }
  return { materias, resumen, electivas: detalle };
}
