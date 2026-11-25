// @vitest-environment jsdom
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  apruebaCon, bloque, cambioDeEstado, comparar, copiaDeLaPestana, enlaceCsv, esElectiva, esSeminario, leerEstadoAcademico,
  leerExamenes, nombreCsv, nombreEntero, normalizar, pestanas, textoCsv, turnoDe, valorOrden,
} from './index.js';

const pagina = (nombre) => {
  const html = fs.readFileSync(path.join(import.meta.dirname, 'paginas-de-prueba', `${nombre}-real.html`), 'utf8');
  return new DOMParser().parseFromString(html, 'text/html');
};

// An academic record page written for these tests, with made-up data.
const FILAS_ESTADO = [
  ['0', 'Matemática', 'Aprobada en 2023', '2008'],
  ['1', 'Algoritmos y Estructuras de Datos', 'Aprobada con 10 (5 hs.) Tomo: 111 Folio: 22', '2023'],
  ['1', 'Análisis Matemático I', 'Aprobada con 8 (5 hs.) Tomo: 111 Folio: 23', '2023'],
  ['1', 'Compl.de equiv. de Análisis Matemático I', '', '2023'],
  ['2', 'Física II', 'Regular en 2024', '2023'],
  ['2', 'Entornos Gráficos (Elec.)', 'Regular en 2024 (1C)', '2023'],
  ['2', 'Programación Competitiva (Elec.)', 'Aprobada con 9 (3 hs.) Tomo: 113 Folio: 4', '2023'],
  ['3', 'Sistemas Operativos', '', '2023'],
  ['3', 'Seminario Integrador', 'Aprobada con 8 (2 hs.) Tomo: 114 Folio: 2', '2023'],
  ['3', 'Redes de Datos', 'Inscripto', '2023'],
];
const ESTADO = `<!doctype html><html><body><div class="wrapper">
<table align="center" width="800"><tbody><tr><td class="tituloTabla">Estado académico de Pérez, Ana al 2/11/2026 22:03:03</td></tr>
<tr><td><table id="estado" width="100%"><tbody><tr><td class="tituloTabla">Año</td><td class="tituloTabla">Materia</td><td class="tituloTabla">Estado</td><td class="tituloTabla">Plan</td></tr>
${FILAS_ESTADO.map((f) => `<tr>${f.map((c) => `<td class="textoTabla">${c}</td>`).join('')}</tr>`).join('')}
</tbody></table></td></tr></tbody></table></div></body></html>`;
const doc = (html) => new DOMParser().parseFromString(html, 'text/html');

describe('base', () => {
  it('normalizes text', () => {
    expect(normalizar(' Análisis  Matemático I! ')).toBe('analisis matematico i');
  });

  it('gives back a cut elective name', () => {
    expect(nombreEntero('Sistemas de Información Geográfica')).toBe('Sistemas de Información Geográfica (Elec.)');
    expect(nombreEntero('Entornos Gráficos (El')).toBe('Entornos Gráficos (Elec.)');
    expect(nombreEntero('Física I')).toBe('Física I');
  });
});

describe('estado académico', () => {
  it('reads the state of a subject', () => {
    expect(cambioDeEstado('Aprobada con 8,5 (5 hs.) Tomo: 111 Folio: 23')).toMatchObject({ tipo: 'aprobada', nota: 8.5, horas: 5, registro: 'Tomo 111, folio 23' });
    expect(cambioDeEstado('Regular en 2024 (1C)')).toMatchObject({ tipo: 'regular', cuando: '2024 (1C)', nota: null });
    expect(cambioDeEstado('')).toMatchObject({ tipo: 'pendiente' });
    expect(cambioDeEstado('Inscripto')).toMatchObject({ tipo: 'otro', crudo: 'Inscripto' });
  });

  it('knows electives and the seminar', () => {
    expect(esElectiva('Entornos Gráficos (Elec.)')).toBe(true);
    expect(esElectiva('Sistemas Operativos')).toBe(false);
    expect(esSeminario('Seminario Integrador')).toBe(true);
  });

  it('reads the table, the summary and the hours of electives', () => {
    const e = leerEstadoAcademico(doc(ESTADO), { carrera: 'Ingeniería en Sistemas de Información' });
    expect(e.materias).toHaveLength(10);
    expect(e.resumen).toMatchObject({ total: 6, aprobadas: 3, regulares: 1, sinCursar: 1, notas: 4 });
    expect(e.resumen.promedio).toBeCloseTo(8.75);
    // The seminar counts as elective but adds no hours; the pending complement stays out of the totals.
    expect(e.electivas).toEqual({ cantidad: 3, aprobadas: 2, regulares: 1, horas: 3, requeridas: 20, faltan: 17 });
  });

  it('only counts the 20 hours for that career', () => {
    expect(leerEstadoAcademico(doc(ESTADO)).electivas).toMatchObject({ requeridas: null, faltan: null });
    expect(leerEstadoAcademico(doc(ESTADO), { carrera: 'Ingeniería Civil' }).electivas.requeridas).toBeNull();
  });

  it('is null on another page', () => {
    expect(leerEstadoAcademico(pagina('examenes'))).toBeNull();
  });
});

describe('exámenes', () => {
  it('orders grades, dates and absences', () => {
    expect(valorOrden('ocho')).toBe(8);
    expect(valorOrden('Ausen.')).toBe(-1);
    expect(valorOrden('12/03/2024')).toBe(20240312);
    expect(valorOrden('7,5')).toBe(7.5);
    expect(['b', 7, 'a', 3].sort((x, y) => comparar(valorOrden(String(x)), valorOrden(String(y))))).toEqual([3, 7, 'a', 'b']);
  });

  it('passes with 6 since 2017 and with 4 before', () => {
    expect(apruebaCon(new Date(2016, 5, 1))).toBe(4);
    expect(apruebaCon(new Date(2017, 0, 2))).toBe(6);
    expect(turnoDe(new Date(2025, 6, 20))).toBe('Julio y agosto');
    expect(turnoDe(new Date(2025, 3, 20))).toBe('Otras mesas');
  });

  it('reads the real page, grades in words included', () => {
    const r = leerExamenes(pagina('examenes'));
    expect(r.examenes).toHaveLength(24);
    expect(r.examenes[0]).toMatchObject({ dia: '2021-01-01', materia: 'Algoritmos y Estructuras de Datos', nota: 8, aprobado: true, plan: '2023', codigo: '106' });
    expect(r.examenes.map((x) => x.fecha.getTime())).toEqual([...r.examenes.map((x) => x.fecha.getTime())].sort((a, b) => a - b));
    expect(r.examenes.filter((x) => x.ausente)).toHaveLength(3);
    expect(r.examenes.find((x) => x.crudo === 'cinco')).toMatchObject({ nota: 5, aprobado: false });
    expect(r.resumen).toMatchObject({ aprobados: 19, aplazos: 2, ausentes: 3 });
    expect(r.resumen.promedioSinAplazos).toBeGreaterThan(6);
    expect(r.resumen.promedioConAplazos).toBeLessThan(r.resumen.promedioSinAplazos);
  });
});

describe('copia de una pestaña', () => {
  it('copies the exams page as a title and a table, with no links or footer', () => {
    const c = copiaDeLaPestana(pagina('examenes'), '/examenes.asp?id=11111-1');
    expect(c.clave).toBe('examenes');
    expect(c.titulo).toBe('Exámenes');
    const tabla = c.bloques.find((b) => b.t === 'tabla');
    expect(c.bloques[0]).toMatchObject({ t: 'titulo', texto: expect.stringMatching(/^Exámenes de /) });
    expect(tabla.columnas).toEqual(['Fecha', 'Materia', 'Nota', 'Especialidad', 'Plan', 'Código']);
    expect(tabla.filas).toHaveLength(24);
    expect(JSON.stringify(c)).not.toMatch(/IMPORTANTE|Volver a men/);
  });

  it('copies the grades tab and the prerequisites tab', () => {
    const notas = copiaDeLaPestana(pagina('notas'), '/notasParciales.asp');
    expect(notas.bloques.find((b) => b.t === 'tabla').columnas).toContain('Inasistencias');
    const cor = copiaDeLaPestana(pagina('correlatividad-cursado'), '/correlatividadCursado.asp');
    expect(cor.bloques.find((b) => b.t === 'tabla').columnas).toEqual(['Año', 'Materia', 'Correlatividad', 'Plan']);
  });

  it('is null for a page that is not a tab', () => {
    expect(copiaDeLaPestana(pagina('examenes'), '/login.asp')).toBeNull();
  });

  it('leaves out fields and what is hidden', () => {
    const d = doc('<div class="wrapper"><h2>Algo</h2><form><input value="secreto"><p>dentro de un formulario</p></form><p style="display:none">oculto</p><p>Hola<br>mundo</p></div>');
    const c = copiaDeLaPestana(d, '/examenes.asp');
    expect(c.bloques).toEqual([{ t: 'titulo', texto: 'Algo' }, { t: 'texto', texto: 'Hola · mundo' }]);
  });
});

describe('saneo', () => {
  it('rebuilds a block with only its keys and cuts what is long', () => {
    expect(bloque({ t: 'texto', texto: ' a\u0000  b ', extra: 1 })).toEqual({ t: 'texto', texto: 'a b' });
    expect(bloque({ t: 'tabla', columnas: ['x'], filas: [['1', '2'], 'no'], titulo: '', otro: 1 })).toEqual({ t: 'tabla', titulo: null, columnas: ['x'], filas: [['1']] });
    expect(bloque({ t: 'script' })).toBeNull();
    expect(bloque({ t: 'titulo', texto: 'x'.repeat(500) }).texto).toHaveLength(200);
  });

  it('keeps known tabs in order and drops unknown keys and dates in the future', () => {
    const ahora = Date.UTC(2026, 10, 25);
    const buenos = [{ t: 'texto', texto: 'hola' }];
    const r = pestanas({
      examenes: { fecha: ahora - 1000, bloques: buenos },
      estado: { fecha: ahora - 5, bloques: buenos },
      plan: { fecha: ahora + 10 * 86400000, bloques: buenos },
      __proto__x: { fecha: ahora, bloques: buenos },
      parciales: { fecha: ahora, bloques: [{ t: 'x' }] },
    }, ahora);
    expect(r.map((p) => p.clave)).toEqual(['estado', 'examenes']);
    expect(r[0].titulo).toBe('Estado académico');
  });
});

describe('csv', () => {
  it('writes semicolons, decimal commas, quotes and CRLF with a byte order mark', () => {
    const t = textoCsv([['Materia', 'Nota'], ['Física; I', 8.5], ['Dice "hola"', null]]);
    expect(t).toBe('﻿Materia;Nota\r\n"Física; I";8,5\r\n"Dice ""hola""";\r\n');
  });

  it('keeps a formula as text', () => {
    expect(textoCsv([['=1+1', '@x', '+3', '-2', 5, -2]])).toBe("﻿'=1+1;'@x;'+3;'-2;5;-2\r\n");
  });

  it('makes a data link and a file name', () => {
    const href = enlaceCsv([['a', 'b']]);
    expect(href.startsWith('data:text/csv;charset=utf-8,%EF%BB%BFa%3Bb')).toBe(true);
    expect(nombreCsv('notas', new Date(2026, 10, 5))).toBe('notas-2026-11-05.csv');
  });
});
