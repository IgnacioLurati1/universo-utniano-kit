// The academic calendar of UTN FRRO for one cycle, written by hand from the official PDF: it is a scanned document
// without text. When the faculty publishes another one, the check (`node facultad/actualizar.mjs --revisar`)
// reports it, and this file is written again from the new PDF. Past `hasta`, whoever uses it should stop showing it.
//
// Source: Resolución CD 993/2025 (Anexos I, II y III), modified by the Resolución CD 200/2026 (moved holidays).
export const CALENDARIO = {
  ciclo: '2026/2027',
  fuente: 'https://www.frro.utn.edu.ar/CALENDARIO_ACADEMICO_UTN.pdf',
  revisado: '2026-11-08',
  // From the start of this cycle to the day before the next one starts.
  desde: '2026-03-16',
  hasta: '2027-03-14',
  cuatrimestres: [
    { numero: 1, desde: '2026-03-16', hasta: '2026-07-03' },
    { numero: 2, desde: '2026-07-20', hasta: '2026-11-13' },
  ],
  recesos: [
    { titulo: 'Receso de invierno', desde: '2026-07-06', hasta: '2026-07-17' },
    { titulo: 'Receso de verano', desde: '2026-12-21', hasta: '2027-02-03' },
  ],
  // Each call to final exams: its exam days and its days of questions before.
  llamados: [
    { numero: 1, examenes: ['2026-04-09', '2026-04-10', '2026-04-15', '2026-04-21', '2026-04-27'], consulta: ['2026-04-06', '2026-04-08'] },
    { numero: 2, examenes: ['2026-05-07', '2026-05-08', '2026-05-13', '2026-05-18', '2026-05-19'], consulta: ['2026-05-04', '2026-05-06'] },
    { numero: 3, examenes: ['2026-08-07', '2026-08-13', '2026-08-25', '2026-08-26', '2026-08-31'], consulta: ['2026-08-03', '2026-08-06'] },
    { numero: 4, examenes: ['2026-09-04', '2026-09-10', '2026-09-16', '2026-09-22', '2026-09-28'], consulta: ['2026-09-01', '2026-09-03'] },
    { numero: 5, examenes: ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'], consulta: ['2026-11-09', '2026-11-13'] },
    { numero: 6, examenes: ['2026-11-30', '2026-12-01', '2026-12-02', '2026-12-03', '2026-12-04'], consulta: ['2026-11-23', '2026-11-27'] },
    { numero: 7, examenes: ['2026-12-14', '2026-12-15', '2026-12-16', '2026-12-17', '2026-12-18'], consulta: ['2026-12-07', '2026-12-11'] },
    { numero: 8, examenes: ['2027-02-10', '2027-02-11', '2027-02-12'], consulta: ['2027-02-04', '2027-02-05'] },
    { numero: 9, examenes: ['2027-02-22', '2027-02-23', '2027-02-24', '2027-02-25', '2027-02-26'], consulta: ['2027-02-15', '2027-02-19'] },
    { numero: 10, examenes: ['2027-03-08', '2027-03-09', '2027-03-10', '2027-03-11', '2027-03-12'], consulta: ['2027-03-01', '2027-03-05'] },
  ],
  tramites: [
    { titulo: 'Inscripción a cursar las anuales y las del primer cuatrimestre', desde: '2026-03-02', hasta: '2026-03-16' },
    { titulo: 'Inscripción a cursar las del segundo cuatrimestre', desde: '2026-07-06', hasta: '2026-07-20' },
    { titulo: 'Último día para cargar regularidades y promociones del primer cuatrimestre', desde: '2026-07-31' },
    { titulo: 'Último día para cargar promociones de las anuales y del segundo cuatrimestre', desde: '2026-12-18' },
    { titulo: 'Último día para cargar regularidades de las anuales y del segundo cuatrimestre', desde: '2027-02-26' },
  ],
  // Days without classes. `feriado`: a national holiday; `sinActividad`: the faculty closes.
  sinClases: [
    ['2026-03-23', 'sinActividad', 'Día no laborable con fines turísticos'],
    ['2026-03-24', 'feriado', 'Día de la Memoria por la Verdad y la Justicia'],
    ['2026-04-02', 'feriado', 'Día del Veterano y de los Caídos en Malvinas'],
    ['2026-04-03', 'feriado', 'Viernes Santo'],
    ['2026-05-01', 'feriado', 'Día del Trabajador'],
    ['2026-05-02', 'sinActividad', 'Día del Docente Tecnológico'],
    ['2026-05-25', 'feriado', 'Día de la Revolución de Mayo'],
    ['2026-06-15', 'feriado', 'Paso a la Inmortalidad del General Güemes'],
    ['2026-06-20', 'feriado', 'Paso a la Inmortalidad del General Belgrano'],
    ['2026-06-27', 'sinActividad', 'Día del Trabajador del Estado'],
    ['2026-07-09', 'feriado', 'Día de la Independencia'],
    ['2026-07-10', 'sinActividad', 'Día no laborable con fines turísticos'],
    ['2026-08-17', 'feriado', 'Paso a la Inmortalidad del General San Martín'],
    ['2026-08-19', 'sinActividad', 'Día de la UTN'],
    ['2026-09-21', 'sinActividad', 'Día del Estudiante'],
    ['2026-10-07', 'sinActividad', 'Día de la Virgen del Rosario'],
    ['2026-10-12', 'feriado', 'Día del Respeto a la Diversidad Cultural'],
    ['2026-11-23', 'feriado', 'Día de la Soberanía Nacional'],
    ['2026-11-26', 'sinActividad', 'Día del No Docente'],
    ['2026-12-07', 'sinActividad', 'Día no laborable con fines turísticos'],
    ['2026-12-08', 'feriado', 'Inmaculada Concepción de María'],
    ['2026-12-25', 'feriado', 'Navidad'],
    ['2027-01-01', 'feriado', 'Año Nuevo'],
    ['2027-02-08', 'feriado', 'Carnaval'],
    ['2027-02-09', 'feriado', 'Carnaval'],
  ],
};
