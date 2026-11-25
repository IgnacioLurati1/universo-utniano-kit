// Common ground for the Sysacad readers: text normalizing, rows of a table and the names of electives that Sysacad cuts.
// Pure functions over a DOM (the page's own `document`, or a jsdom one). No network, no storage, nothing is drawn.

// Lower case, no accents, only letters and digits separated by single spaces: "Análisis Matemático I" -> "analisis matematico i".
export const normalizar = (texto) =>
  (texto ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

// The rows that belong to this table and not to one nested inside it.
export const filasDe = (tabla) =>
  [...tabla.querySelectorAll('tr')].filter((f) => f.closest('table') === tabla && !f.querySelector('tr'));

// Sysacad cuts long subject names in the lists. The first words of each one (normalized) and its full name, when known.
export const ELECTIVAS_CORTADAS = [
  ['analisis y diseno de datos e informacion', 'Análisis y Diseño de Datos e Información (Elec.)'],
  ['sistemas de informacion geografica', 'Sistemas de Información Geográfica (Elec.)'],
  ['introduccion a la practica profesional', 'Introducción a la Práctica Profesional (Elec.)'],
  ['metodologias agiles en el desarrollo de', 'Metodologías Ágiles en el Desarrollo de Software (Elec.)'],
  ['soporte a la gestion de datos con progra', 'Soporte a la Gestión de Datos con Programación Visual (Elec.)'],
  ['informatica en la administracion publica', 'Informática en la Administración Pública (Elec.)'],
  ['sistemas de informacion integrados para', 'Sistemas de Información Integrados para la Industria (Elec.)'],
  // Its full name does not show in any page seen so far.
  ['tecnologias de desarrollo de software id', null],
];

// Gives back the full name of a subject cut by Sysacad when it is known. A cut inside the elective mark leaves the
// whole name before it.
export const nombreEntero = (nombre) => {
  const conocida = ELECTIVAS_CORTADAS.find(([prefijo, completo]) => completo && completo.length > nombre.length && normalizar(nombre).startsWith(prefijo));
  if (conocida) return conocida[1];
  const marca = nombre.match(/^(.*\S)\s*\((E(l(e(c\.?)?)?)?)?$/i);
  return marca ? `${marca[1]} (Elec.)` : nombre;
};

// Sysacad lays whole pages out with tables. A data table has at least two rows with two or more cells; the first row
// with two or more cells and no field inside is its header. Returns [{ tabla, filas, cabecera }] in document order.
export function tablasDeDatos(doc) {
  const salida = [];
  for (const tabla of doc.querySelectorAll('table')) {
    const filas = filasDe(tabla);
    if (filas.filter((f) => f.cells.length >= 2).length < 2) continue;
    const cabecera = filas.find((f) => f.cells.length >= 2 && !f.querySelector('input, select, textarea, button')) ?? null;
    salida.push({ tabla, filas, cabecera });
  }
  return salida;
}

// The data table whose header has all these columns (compared normalized: 'ano', 'materia'...) and no form fields.
// Returns { tabla, filas, cabecera, titulos } or null. `titulos` are the normalized names of the header cells.
export function tablaConColumnas(doc, columnas) {
  for (const { tabla, filas, cabecera } of tablasDeDatos(doc)) {
    if (!cabecera || tabla.querySelector('input, select, textarea')) continue;
    const titulos = [...cabecera.cells].map((c) => normalizar(c.textContent));
    if (columnas.every((c) => titulos.includes(c))) return { tabla, filas, cabecera, titulos };
  }
  return null;
}
