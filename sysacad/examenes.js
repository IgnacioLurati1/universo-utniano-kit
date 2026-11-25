// Reads the Exámenes page (every final the student took, fails and absences included) into plain data.
import { nombreEntero, normalizar, tablaConColumnas } from './base.js';

// Sysacad writes the grades in words.
export const NOTAS_EN_LETRAS = ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez'];

// "12/03/2024" sorts by date, "8" by number, anything else alphabetically (see `comparar`).
export function valorOrden(texto) {
  const t = texto.trim();
  const enLetras = NOTAS_EN_LETRAS.indexOf(t.toLowerCase());
  if (enLetras !== -1) return enLetras;
  // An absence sits below every grade.
  if (/^ausen/i.test(t)) return -1;
  const fecha = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (fecha) return Number(fecha[3]) * 10000 + Number(fecha[2]) * 100 + Number(fecha[1]);
  const numero = Number(t.replace(',', '.'));
  return t && Number.isFinite(numero) ? numero : t;
}

// For Array.prototype.sort over `valorOrden` results: numbers first, then text in Spanish order.
export function comparar(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'number' || typeof b === 'number') return typeof a === 'number' ? -1 : 1;
  return String(a).localeCompare(String(b), 'es');
}

// A final passes with 6 since Ordinance 1549 of UTN, applied from 2017; before, with 4.
export const apruebaCon = (fecha) => (fecha.getFullYear() >= 2017 ? 6 : 4);

// The three exam periods of the year, by month.
export const TURNOS = [['Febrero y marzo', [2, 3]], ['Julio y agosto', [7, 8]], ['Noviembre y diciembre', [11, 12]]];
export const turnoDe = (fecha) => TURNOS.find(([, meses]) => meses.includes(fecha.getMonth() + 1))?.[0] ?? 'Otras mesas';

const dos = (n) => String(n).padStart(2, '0');
const media = (lista) => (lista.length ? lista.reduce((s, e) => s + e.nota, 0) / lista.length : null);

// `doc` is a Document (or any element holding the page). Returns null when the page has no exams table.
//
// {
//   examenes: [{ fecha: Date, dia: 'YYYY-MM-DD', turno, materia, plan, codigo, clave, crudo, nota, ausente, aprobado }]  // oldest first
//   resumen: { aprobados, aplazos, ausentes, promedioSinAplazos, promedioConAplazos },
// }
// `nota` is a number from 0 to 10 or null (an absence, or a text that is not a grade); `crudo` is what the page says.
export function leerExamenes(doc) {
  const hallada = tablaConColumnas(doc, ['fecha', 'materia', 'nota']);
  if (!hallada) return null;
  const { filas, cabecera, titulos } = hallada;
  const examenes = filas
    .filter((f) => f !== cabecera && f.cells.length === cabecera.cells.length)
    .map((f) => {
      const celda = (n) => (titulos.includes(n) ? f.cells[titulos.indexOf(n)].textContent.trim() : '');
      const partes = celda('fecha').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (!partes || !celda('materia')) return null;
      const fecha = new Date(Number(partes[3]), Number(partes[2]) - 1, Number(partes[1]));
      const crudo = celda('nota');
      const enLetras = NOTAS_EN_LETRAS.indexOf(normalizar(crudo));
      const numero = enLetras !== -1 ? enLetras : /^\d{1,2}([.,]\d+)?$/.test(crudo) ? Number(crudo.replace(',', '.')) : null;
      const nota = numero !== null && numero <= 10 ? numero : null;
      return {
        fecha,
        dia: `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`,
        turno: turnoDe(fecha),
        materia: nombreEntero(celda('materia')),
        plan: celda('plan'),
        codigo: celda('codigo'),
        clave: celda('codigo') ? `${celda('plan')} ${celda('codigo')}` : normalizar(celda('materia')),
        crudo,
        nota,
        ausente: /^ausen/i.test(crudo),
        aprobado: nota !== null && nota >= apruebaCon(fecha),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.fecha - b.fecha);
  if (!examenes.length) return null;

  const conNota = examenes.filter((e) => e.nota !== null);
  const aprobados = conNota.filter((e) => e.aprobado);
  return {
    examenes,
    resumen: {
      aprobados: aprobados.length,
      aplazos: conNota.length - aprobados.length,
      ausentes: examenes.filter((e) => e.ausente).length,
      promedioSinAplazos: media(aprobados),
      promedioConAplazos: media(conNota),
    },
  };
}
