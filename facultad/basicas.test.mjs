import { strToU8, zipSync } from 'fflate';
import { describe, expect, it } from 'vitest';
import { comisionDeTitulo, horariosDeBasicas, materiaYDocentes } from './basicas.mjs';

const CONOCIDAS = [
  'Análisis Matemático I', 'Análisis Matemático II', 'Álgebra y Geometría Analítica', 'Física I', 'Física II', 'Química General',
  'Ingeniería y Sociedad', 'Inglés I', 'Inglés II', 'Probabilidad y Estadística', 'Economía', 'Legislación', 'Materiales Metálicos',
];
const OFICIALES = CONOCIDAS.map((nombre) => ({
  nombre,
  palabras: nombre.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().split(/[^a-z0-9]+/).filter(Boolean),
}));

describe('comisionDeTitulo', () => {
  it('writes the code of each career with its letter, like Sistemas writes 3K02', () => {
    expect(comisionDeTitulo('1ro. 02 IC  TURNO TARDE  - ', { letra: 'O', sigla: 'IC' })).toEqual({ comision: '1O02', turno: 'Tarde' });
    expect(comisionDeTitulo('2 ro. 01 IC  TURNO NOCHE - ', { letra: 'O', sigla: 'IC' })).toEqual({ comision: '2O01', turno: 'Noche' });
    expect(comisionDeTitulo('1ro. 01 IE  - TURNO NOCHE', { letra: 'Q', sigla: 'IE' })).toEqual({ comision: '1Q01', turno: 'Noche' });
    expect(comisionDeTitulo('3do. 01 IM  TURNO NOCHE ', { letra: 'S', sigla: 'IM' })).toEqual({ comision: '3S01', turno: 'Noche' });
    expect(comisionDeTitulo('1ro. 01 IQ  TURNO MAÑANA ', { letra: 'V', sigla: 'IQ' })).toEqual({ comision: '1V01', turno: 'Mañana' });
  });

  it('reads past «NUEVA -» and a cuatrimestre after the shift', () => {
    expect(comisionDeTitulo('NUEVA - 2do. 01 IE  TURNO NOCHE', { letra: 'Q', sigla: 'IE' })).toEqual({ comision: '2Q01', turno: 'Noche' });
    expect(comisionDeTitulo('4to. 01 IE  TURNO NOCHE - 1° CUATRIM.', { letra: 'Q', sigla: 'IE' })).toEqual({ comision: '4Q01', turno: 'Noche' });
  });

  it('is null for another career or a text that is not a title', () => {
    expect(comisionDeTitulo('1ro. 01 IE  TURNO NOCHE', { letra: 'O', sigla: 'IC' })).toBeNull();
    expect(comisionDeTitulo('1ro 01 B', { letra: 'V', sigla: 'IQ' })).toBeNull();
    expect(comisionDeTitulo('CICLO LECTIVO 2026', { letra: 'V', sigla: 'IQ' })).toBeNull();
  });
});

describe('materiaYDocentes', () => {
  it('writes the official name from the short forms of the sheets', () => {
    expect(materiaYDocentes(['ALGEBRA y GEOM. ANAL.', 'ALBA', 'SOREL'], OFICIALES)).toEqual({ materia: 'Álgebra y Geometría Analítica', docentes: ['Alba', 'Sorel'] });
    expect(materiaYDocentes(['ANÁLISIS MATEM I', 'ALDIVA'], OFICIALES)).toEqual({ materia: 'Análisis Matemático I', docentes: ['Aldiva'] });
    expect(materiaYDocentes(['A. MAT. I', 'Hidalgo', 'Rosales'], OFICIALES)).toEqual({ materia: 'Análisis Matemático I', docentes: ['Hidalgo', 'Rosales'] });
    expect(materiaYDocentes(['ING Y SOCIEDAD', 'BERNAL'], OFICIALES)).toEqual({ materia: 'Ingeniería y Sociedad', docentes: ['Bernal'] });
    expect(materiaYDocentes(['ANALISIS', 'MATEMATICO II', 'Fulanez'], OFICIALES)).toEqual({ materia: 'Análisis Matemático II', docentes: ['Fulanez'] });
    expect(materiaYDocentes(['FISICA II', 'SALVATORE'], OFICIALES)).toEqual({ materia: 'Física II', docentes: ['Salvatore'] });
  });

  it('also without the «y», with «TECNICO» in between, cut short or with the teachers in brackets on the same row', () => {
    expect(materiaYDocentes(['PROBABILIDAD', 'ESTADISTICA', '(Arce/Mirol)'], OFICIALES)).toEqual({ materia: 'Probabilidad y Estadística', docentes: ['Arce/Mirol'] });
    expect(materiaYDocentes(['INGLES TECNICO I', '(De Sandoval/Rinaldi)'], OFICIALES)).toEqual({ materia: 'Inglés I', docentes: ['De Sandoval/Rinaldi'] });
    expect(materiaYDocentes(['ALGEBRA Y GEOMETRIA', 'BONELLI'], OFICIALES)).toEqual({ materia: 'Álgebra y Geometría Analítica', docentes: ['Bonelli'] });
    expect(materiaYDocentes(['ALGEBRA Y GEOM.(Mansur - Gamboa)'], OFICIALES)).toEqual({ materia: 'Álgebra y Geometría Analítica', docentes: ['Mansur - Gamboa'] });
    expect(materiaYDocentes(['INGENIERIA Y SOCIEDAD  (Lagos - Cardozo)'], OFICIALES)).toEqual({ materia: 'Ingeniería y Sociedad', docentes: ['Lagos - Cardozo'] });
  });

  it('does not guess between two official names: a cut that fits both stays as the sheet says', () => {
    expect(materiaYDocentes(['ANALISIS MATEMATICO', 'RUEDA'], OFICIALES)).toEqual({ materia: 'Analisis Matematico', docentes: ['Rueda'] });
  });

  it('without an official name, writes it as the faculty does and keeps the rows that carry it on', () => {
    expect(materiaYDocentes(['ORGANIZACIÓN Y ADMIN.', 'de EMPRESAS', 'BARDI - BRUNEL'])).toEqual({ materia: 'Organización y Admin. de Empresas', docentes: ['Bardi - Brunel'] });
    expect(materiaYDocentes(['PROBABILIDAD y', 'ESTADÍSTICA', 'MIROL-ARCE'])).toEqual({ materia: 'Probabilidad y Estadística', docentes: ['Mirol-Arce'] });
    expect(materiaYDocentes(['INGENIERIA', 'Y SOCIEDAD', 'LAGOS/MOREL'])).toEqual({ materia: 'Ingenieria y Sociedad', docentes: ['Lagos/Morel'] });
    expect(materiaYDocentes(['ANALISIS', 'MATEMATICO I', 'ZUBIRI'])).toEqual({ materia: 'Analisis Matematico I', docentes: ['Zubiri'] });
  });

  it('writes the teachers in capitals as names are written', () => {
    const docentes = (filas) => materiaYDocentes(['QUIMICA GENERAL', ...filas], OFICIALES).docentes;
    expect(docentes(['ALBA-PALEARI', 'AYALA, A.'])).toEqual(['Alba-Paleari', 'Ayala, A.']);
    expect(docentes(['TOLOSA -ALBA', 'DE SANDOVAL'])).toEqual(['Tolosa - Alba', 'De Sandoval']);
    expect(docentes(['(Bonelli - Talero)', 'RUEDA, Matias', 'ALBA, C.-CUEVAS'])).toEqual(['Bonelli - Talero', 'Rueda, Matias', 'Alba, C.-Cuevas']);
  });
});

// A tiny xlsx with the given sheets ({ name: rows }), the way Google exports them.
function libro(hojas) {
  const textos = [];
  const celdas = (filas) =>
    filas
      .map((fila, r) => `<row r="${r + 1}">${(fila ?? [])
        .map((v, c) => {
          if (v === undefined) return '';
          const ref = `${String.fromCharCode(65 + c)}${r + 1}`;
          if (typeof v === 'number') return `<c r="${ref}"><v>${v}</v></c>`;
          textos.push(v);
          return `<c r="${ref}" t="s"><v>${textos.length - 1}</v></c>`;
        })
        .join('')}</row>`)
      .join('');
  const nombres = Object.keys(hojas);
  const archivos = {
    'xl/workbook.xml': `<workbook><sheets>${nombres.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`,
    'xl/_rels/workbook.xml.rels': `<Relationships>${nombres.map((_, i) => `<Relationship Id="rId${i + 1}" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}</Relationships>`,
  };
  nombres.forEach((n, i) => {
    archivos[`xl/worksheets/sheet${i + 1}.xml`] = `<worksheet><sheetData>${celdas(hojas[n])}</sheetData></worksheet>`;
  });
  archivos['xl/sharedStrings.xml'] = `<sst>${textos.map((t) => `<si><t>${t.replace(/&/g, '&amp;')}</t></si>`).join('')}</sst>`;
  return zipSync(Object.fromEntries(Object.entries(archivos).map(([k, v]) => [k, strToU8(v)])));
}

const t = (h, m = 0) => (h * 60 + m) / 1440;
const DIAS = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'];
const encabezado = (...extra) => [undefined, 'HORA', ...DIAS, ...extra];
// One hour: its start, «A» and its end in the time column, and in each column (2 is LUNES) the rows of its cell.
function hora(desde, hasta, etiqueta, celdas = {}) {
  const filas = [[desde, etiqueta], ['A'], [hasta]];
  for (const [c, renglones] of Object.entries(celdas)) renglones.forEach((v, i) => (filas[i][c] = v));
  return filas;
}
// Two blocks side by side: the second from column I.
const aLaPar = (izquierda, derecha) => izquierda.map((fila, r) => {
  const junta = [...(fila ?? [])];
  (derecha[r] ?? []).forEach((v, c) => (junta[8 + c] = v));
  return junta;
});

describe('horariosDeBasicas', () => {
  it('reads two commissions of one sheet, hours in two rows or with the time as text, and Saturday with its own hours', () => {
    const civil = libro({
      '1° 01, 1°02': [
        ['AÑO 2026'],
        ['1ro. 02 IC  TURNO TARDE  - '],
        encabezado('SABADO'),
        [t(12, 50), 'P H', undefined, 'ALGEBRA Y GEOM.ANALITICA (Bonelli - Talero)'],
        [t(13, 30)],
        ...hora(t(13, 30), t(14, 10), '1º', { 3: ['ALGEBRA Y GEOM.', 'ANALITICA', '(Bonelli - Talero)'], 7: ['8:00 a 8:45', 'FISICA I', 'ZAMORA'] }),
        ...hora(t(14, 15), t(15), '2º', { 7: ['8:50 a 9:35', 'FISICA I', 'ZAMORA'] }),
        ...hora(t(15), t(15, 45), '3º', { 7: ['9:45 a 10:30'] }),
        [],
        ['1ro. 01 IC  TURNO NOCHE - '],
        encabezado('SABADO'),
        ['17.40 a', 'PP', undefined, 'INGENIERIA'],
        [undefined, undefined, undefined, 'Y SOCIEDAD'],
        [18.35, undefined, undefined, 'Lagos - Cardozo'],
        ['18.35 a', 'PH', undefined, 'INGENIERIA'],
        [undefined, undefined, undefined, 'Y SOCIEDAD'],
        ['19.15', undefined, undefined, 'Lagos - Cardozo'],
        ...hora(t(23, 25), t(0, 10), '6º', { 4: ['A. MAT. I ', 'Hidalgo', 'Rosales'] }),
      ],
      'Hoja 1': [],
    });
    expect(horariosDeBasicas([civil], { letra: 'O', sigla: 'IC', conocidas: CONOCIDAS })).toEqual([
      {
        comision: '1O01',
        turno: 'Noche',
        clases: [
          { cuatrimestre: 0, dia: 2, desde: 1060, hasta: 1155, materia: 'Ingeniería y Sociedad', docentes: 'Lagos - Cardozo' },
          // 23:25 to 0:10 of the next day.
          { cuatrimestre: 0, dia: 3, desde: 1405, hasta: 1450, materia: 'Análisis Matemático I', docentes: 'Hidalgo, Rosales' },
        ],
      },
      {
        comision: '1O02',
        turno: 'Tarde',
        clases: [
          { cuatrimestre: 0, dia: 2, desde: 770, hasta: 850, materia: 'Álgebra y Geometría Analítica', docentes: 'Bonelli - Talero' },
          { cuatrimestre: 0, dia: 6, desde: 480, hasta: 575, materia: 'Física I', docentes: 'Zamora' },
        ],
      },
    ]);
  });

  it('reads one commission per sheet, past «NUEVA -», and joins the teachers of hours one after the other', () => {
    const electrica = libro({
      '101 TN': [
        [],
        ['1ro. 01 IE  - TURNO NOCHE'],
        ['CICLO LECTIVO 2026'],
        encabezado(),
        ...hora(t(18, 30), t(19, 10), 'PH', { 4: ['FISICA I', 'MENDES'] }),
        ...hora(t(19, 15), t(20), '1º', { 4: ['FISICA I', 'MENDES'] }),
        ...hora(t(20), t(20, 45), '2º', { 2: ['INGENIERIA Y SOCIEDAD', 'BERNAL', 'LAGOS'], 4: ['FISICA I', 'MENDES', 'ZAMORA/GALVAN'] }),
        ...hora(t(21, 5), t(21, 50), '3º', { 2: ['INGENIERIA Y SOCIEDAD', 'BERNAL', 'LAGOS'] }),
      ],
      '201 TN': [
        ['NUEVA - 2do. 01 IE  TURNO NOCHE'],
        encabezado(),
        ...hora(t(21, 50), t(22, 35), '4º', { 5: ['PROBABILIDAD y', 'ESTADÍSTICA', 'MIROL-ARCE'] }),
      ],
    });
    expect(horariosDeBasicas([electrica], { letra: 'Q', sigla: 'IE', conocidas: CONOCIDAS })).toEqual([
      {
        comision: '1Q01',
        turno: 'Noche',
        clases: [
          { cuatrimestre: 0, dia: 1, desde: 1200, hasta: 1310, materia: 'Ingeniería y Sociedad', docentes: 'Bernal, Lagos' },
          { cuatrimestre: 0, dia: 3, desde: 1110, hasta: 1245, materia: 'Física I', docentes: 'Mendes, Zamora/Galvan' },
        ],
      },
      { comision: '2Q01', turno: 'Noche', clases: [{ cuatrimestre: 0, dia: 4, desde: 1310, hasta: 1355, materia: 'Probabilidad y Estadística', docentes: 'Mirol-Arce' }] },
    ]);
  });

  it('reads the two cuatrimestres of a sheet, side by side or one under the other', () => {
    const primero = [['4to. 01 IE  TURNO NOCHE - 1° CUATRIM.'], encabezado(), ...hora(t(17, 40), t(18, 25), 'PP', { 4: ['LEGISLACION', 'PERALTA'] })];
    const segundo = [['4to. 01 IE  TURNO NOCHE - 2° CUATRIM.'], encabezado(), ...hora(t(17, 40), t(18, 25), 'PP', { 4: ['ECONOMIA', 'BARDI'] })];
    expect(horariosDeBasicas([libro({ '401 TN': aLaPar(primero, segundo) })], { letra: 'Q', sigla: 'IE', conocidas: CONOCIDAS })).toEqual([
      {
        comision: '4Q01',
        turno: 'Noche',
        clases: [
          { cuatrimestre: 1, dia: 3, desde: 1060, hasta: 1105, materia: 'Legislación', docentes: 'Peralta' },
          { cuatrimestre: 2, dia: 3, desde: 1060, hasta: 1105, materia: 'Economía', docentes: 'Bardi' },
        ],
      },
    ]);

    const quimica = libro({
      '201 TM': [
        ['2do. 01 IQ  TURNO MAÑANA'],
        ['1º CUATRIMESTRE - CICLO LECTIVO 2026'],
        encabezado(),
        ...hora(t(9, 45), t(10, 30), '3º', { 2: ['INGLÉS I', 'Dorrego', 'Rinaldi'] }),
        [],
        ['2do. 01 IQ  TURNO MAÑANA'],
        ['2º CUATRIMESTRE - CICLO LECTIVO 2026'],
        encabezado(),
        ...hora(t(9, 45), t(10, 30), '3º', { 3: ['LEGISLACIÓN', 'CALVO'] }),
        [],
        // A note under the grid, without hours: not a class.
        [undefined, 'FISICA I', '1ro 01 B', 'MALDEZ - PARDO'],
      ],
    });
    expect(horariosDeBasicas([quimica], { letra: 'V', sigla: 'IQ', conocidas: CONOCIDAS })).toEqual([
      {
        comision: '2V01',
        turno: 'Mañana',
        clases: [
          { cuatrimestre: 1, dia: 1, desde: 585, hasta: 630, materia: 'Inglés I', docentes: 'Dorrego, Rinaldi' },
          { cuatrimestre: 2, dia: 2, desde: 585, hasta: 630, materia: 'Legislación', docentes: 'Calvo' },
        ],
      },
    ]);
  });

  it('takes a «Sábados de 8 a 10:30» class written beside the days', () => {
    const mecanica = libro({
      '201 TN': [
        ['2do. 01 IM  TURNO NOCHE '],
        encabezado(),
        ...hora(t(19, 15), t(20), '1º', { 2: ['ANALISIS MATEMÁTICO II', 'MANSUR'], 7: ['MATERIALES', 'METALICOS', 'Sábados de 8 a 10:30'] }),
      ],
    });
    expect(horariosDeBasicas([mecanica], { letra: 'S', sigla: 'IM', conocidas: CONOCIDAS })).toEqual([
      {
        comision: '2S01',
        turno: 'Noche',
        clases: [
          { cuatrimestre: 0, dia: 1, desde: 1155, hasta: 1200, materia: 'Análisis Matemático II', docentes: 'Mansur' },
          { cuatrimestre: 0, dia: 6, desde: 480, hasta: 630, materia: 'Materiales Metálicos', docentes: '' },
        ],
      },
    ]);
  });

  it('finds nothing in a sheet that is not a schedule, or in the schedule of another career', () => {
    const lista = libro({ Docentes: [['Docente', 'Materia', 'Departamento'], ['Fulánez, Ana', 'Física I', 'Materias Básicas']] });
    const otra = libro({ '101 TN': [['1ro. 01 IE  - TURNO NOCHE'], encabezado(), ...hora(t(18, 30), t(19, 10), 'PH', { 4: ['FISICA I', 'MENDES'] })] });
    expect(horariosDeBasicas([lista, otra], { letra: 'O', sigla: 'IC', conocidas: CONOCIDAS })).toEqual([]);
  });
});
