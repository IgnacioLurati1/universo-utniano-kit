// CSV that Excel in Spanish opens in columns and with accents: semicolons, a byte order mark and CRLF line ends.
// A cell that starts like a formula stays text. Nothing is sent anywhere: the file travels inside the link.

const dosDigitos = (n) => String(n).padStart(2, '0');

// `filas` is an array of arrays (strings, numbers, null). Numbers use the decimal comma.
export function textoCsv(filas) {
  const celda = (valor) => {
    // A number keeps its comma; any other value that starts like a formula (or a control tab) gets a quote in front.
    const crudo = typeof valor === 'number' ? String(valor).replace('.', ',') : String(valor ?? '');
    const t = typeof valor !== 'number' && /^[=+\-@\t\r]/.test(crudo) ? `'${crudo}` : crudo;
    return /[";\r\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
  };
  return `﻿${filas.map((f) => f.map(celda).join(';')).join('\r\n')}\r\n`;
}

// The value for the `href` of an <a download="..."> the student presses.
export const enlaceCsv = (filas) => `data:text/csv;charset=utf-8,${encodeURIComponent(textoCsv(filas))}`;

// "notas-2026-11-25.csv", for the `download` attribute.
export const nombreCsv = (nombre, fecha = new Date()) =>
  `${nombre}-${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}.csv`;
