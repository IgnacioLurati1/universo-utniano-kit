import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { celdasDeHoja, horariosDeLibros, juntar, leerLibro, materiaDeCelda } from './planillas.mjs';

const OFICIALES = ['Álgebra y Geometría Analítica', 'Ciencia de Datos', 'Administración de Sistemas de Información', 'Análisis Matemático I'].map((nombre) => ({
  nombre,
  palabras: nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
}));

describe('materiaDeCelda', () => {
  it('takes the subject from the first rows and the teachers from the last', () => {
    expect(materiaDeCelda(['Comunicación', 'de Datos', 'Mares'])).toEqual({ materia: 'Comunicación de Datos', docentes: 'Mares' });
    expect(materiaDeCelda(['Economía', '', ''])).toEqual({ materia: 'Economía', docentes: '' });
    expect(materiaDeCelda(['', '', 'Economía'])).toEqual({ materia: 'Economía', docentes: '' });
  });

  it('keeps a name that is left open over the third row', () => {
    expect(materiaDeCelda(['Probabilidad', 'y', 'Estadística'])).toEqual({ materia: 'Probabilidad y Estadística', docentes: '' });
    expect(materiaDeCelda(['Bases de', 'Datos', 'Mesa'])).toEqual({ materia: 'Bases de Datos', docentes: 'Mesa' });
  });

  it('writes an official name whole, also from a short form, and keeps the rest as teachers', () => {
    expect(materiaDeCelda(['Algebra y', 'Geometría', 'Analítica'], OFICIALES)).toEqual({ materia: 'Álgebra y Geometría Analítica', docentes: '' });
    expect(materiaDeCelda(['Administración de', 'Sist. de Información', 'Ferrero'], OFICIALES)).toEqual({ materia: 'Administración de Sistemas de Información', docentes: 'Ferrero' });
    expect(materiaDeCelda(['Ciencia de Datos', 'Baldi', ''], OFICIALES)).toEqual({ materia: 'Ciencia de Datos', docentes: 'Baldi' });
  });

  it('takes the second row as a teacher when the same first row came with several', () => {
    expect(materiaDeCelda(['Entornos Gráficos', 'Bruni', ''], [], new Set(['entornos graficos']))).toEqual({ materia: 'Entornos Gráficos', docentes: 'Bruni' });
  });

  it('leaves out an hour taken in another commission', () => {
    expect(materiaDeCelda(['Inscribirse en', 'la Comisión', '4K02'])).toBeNull();
  });
});

const HOJA = [
  [],
  [undefined, undefined, 'Comisión', '3K02', undefined, 'Turno', 'Mañana'],
  [],
  ['Primer Cuatrimestre'],
  ['Horario', 'Horas', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  [435 / 1440, 'PH', 'Diseño deSistemas'],
  ['a', undefined, 'de Información'],
  [480 / 1440, undefined, 'Bravo'],
  [480 / 1440, 1, 'Diseño deSistemas', 'Bases de'],
  ['a', undefined, 'de Información', 'Datos'],
  [525 / 1440, undefined, 'Bravo', 'Renton'],
  ['Segundo Cuatrimestre'],
  ['Horario', 'Horas', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
  [435 / 1440, 'PH', undefined, 'Economía'],
  ['a'],
  [480 / 1440],
];

describe('celdasDeHoja', () => {
  it('reads the commission, the shift and each hour of each day, by cuatrimestre', () => {
    const { comision, turno, celdas } = celdasDeHoja(HOJA);
    expect(comision).toBe('3K02');
    expect(turno).toBe('Mañana');
    expect(celdas).toEqual([
      { cuatrimestre: 1, dia: 1, desde: 435, hasta: 480, renglones: ['Diseño de Sistemas', 'de Información', 'Bravo'] },
      { cuatrimestre: 1, dia: 1, desde: 480, hasta: 525, renglones: ['Diseño de Sistemas', 'de Información', 'Bravo'] },
      { cuatrimestre: 1, dia: 2, desde: 480, hasta: 525, renglones: ['Bases de', 'Datos', 'Renton'] },
      { cuatrimestre: 2, dia: 2, desde: 435, hasta: 480, renglones: ['Economía', '', ''] },
    ]);
  });

  it('is null for a sheet without a commission', () => {
    expect(celdasDeHoja([['Notas'], ['algo']])).toBeNull();
  });
});

describe('juntar', () => {
  it('makes one class of hours one after the other, also across a short break', () => {
    const base = { cuatrimestre: 1, dia: 1, materia: 'Física I' };
    expect(juntar([{ ...base, desde: 480, hasta: 525, docentes: 'A' }, { ...base, desde: 540, hasta: 585, docentes: 'B' }, { ...base, desde: 700, hasta: 745, docentes: 'A' }])).toEqual([
      { ...base, desde: 480, hasta: 585, docentes: 'A, B' },
      { ...base, desde: 700, hasta: 745, docentes: 'A' },
    ]);
  });

  it('the 20-minute afternoon break too (15:45 to 16:05), but not a separate block 50 minutes later', () => {
    const base = { cuatrimestre: 2, dia: 3, materia: 'Comunicación de Datos', docentes: '' };
    expect(juntar([{ ...base, desde: 900, hasta: 945 }, { ...base, desde: 965, hasta: 1010 }, { ...base, desde: 1060, hasta: 1105 }])).toEqual([
      { ...base, desde: 900, hasta: 1010 },
      { ...base, desde: 1060, hasta: 1105 },
    ]);
  });
});

// A tiny xlsx with one sheet, the way Google exports them.
function libro(filas) {
  const textos = [];
  const celdas = filas
    .map((fila, r) => `<row r="${r + 1}">${fila
      .map((v, c) => {
        if (v === undefined) return '';
        const ref = `${String.fromCharCode(65 + c)}${r + 1}`;
        if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
        textos.push(v);
        return `<c r="${ref}" t="s"><v>${textos.length - 1}</v></c>`;
      })
      .join('')}</row>`)
    .join('');
  return zipSync({
    'xl/workbook.xml': strToU8('<workbook><sheets><sheet name="3K02" sheetId="1" r:id="rId1"/></sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': strToU8('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
    'xl/sharedStrings.xml': strToU8(`<sst>${textos.map((t) => `<si><t>${t.replace(/&/g, '&amp;')}</t></si>`).join('')}</sst>`),
    'xl/worksheets/sheet1.xml': strToU8(`<worksheet><sheetData>${celdas}</sheetData></worksheet>`),
  });
}

describe('leerLibro and horariosDeLibros', () => {
  it('read a whole file into named, joined classes', () => {
    const bytes = libro(HOJA);
    expect(leerLibro(bytes)[0].nombre).toBe('3K02');
    expect(horariosDeLibros([bytes])).toEqual([
      {
        comision: '3K02',
        turno: 'Mañana',
        clases: [
          { cuatrimestre: 1, dia: 1, desde: 435, hasta: 525, materia: 'Diseño de Sistemas de Información', docentes: 'Bravo' },
          { cuatrimestre: 1, dia: 2, desde: 480, hasta: 525, materia: 'Bases de Datos', docentes: 'Renton' },
          { cuatrimestre: 2, dia: 2, desde: 435, hasta: 480, materia: 'Economía', docentes: '' },
        ],
      },
    ]);
  });
});
