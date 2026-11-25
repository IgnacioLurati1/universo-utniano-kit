// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { comoTitulo, horariosDePdf, leerCelda, limpiarDocentes } from './pdfs.mjs';

// A PDF with each text where it is told: pages of [x, y, texto, tamaño], in Helvetica with the Windows letters. A page
// without texts gets only a gray square, like a scanned page has no text.
const cadena = (t) => `(${[...t].map((c) => (c.charCodeAt(0) > 255 ? '?' : '()\\'.includes(c) ? `\\${c}` : c)).join('')})`;
function pdf(paginas) {
  const objetos = ['<< /Type /Catalog /Pages 2 0 R >>', '', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'];
  const hojas = [];
  for (const textos of paginas) {
    const flujo = textos.length ? textos.map(([x, y, texto, tamano = 8]) => `BT /F1 ${tamano} Tf ${x.toFixed(1)} ${y} Td ${cadena(texto)} Tj ET`).join('\n') : '0.5 g 100 100 300 200 re f';
    objetos.push(`<< /Length ${flujo.length} >>\nstream\n${flujo}\nendstream`);
    objetos.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R >> >> /Contents ${objetos.length} 0 R >>`);
    hojas.push(objetos.length);
  }
  objetos[1] = `<< /Type /Pages /Kids [${hojas.map((h) => `${h} 0 R`).join(' ')}] /Count ${hojas.length} >>`;
  let salida = '%PDF-1.4\n';
  const posiciones = objetos.map((cuerpo, i) => {
    const posicion = salida.length;
    salida += `${i + 1} 0 obj\n${cuerpo}\nendobj\n`;
    return posicion;
  });
  const xref = salida.length;
  salida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n${posiciones.map((p) => `${String(p).padStart(10, '0')} 00000 n \n`).join('')}`;
  salida += `trailer\n<< /Size ${objetos.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Uint8Array.from(salida, (c) => c.charCodeAt(0));
}

// A page of the bedelía's template: the title, the days and each hour as its start, «A» and its end at the left, with
// the lines of each day in its band. `hasta: null` is an hour with only its start written.
const X = { HORA: 140, LUNES: 230, MARTES: 345, MIERCOLES: 460, JUEVES: 575, VIERNES: 690, SABADO: 795 };
const centrado = (cx, y, texto, tamano = 8) => [cx - texto.length * tamano * 0.3, y, texto, tamano];
function grilla({ titulo, dias = ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES', 'SABADO'], horas = [], pie = [] }) {
  const textos = titulo.map((t, i) => centrado(420, 560 - i * 22, t, 14));
  textos.push(centrado(X.HORA, 430, 'HORA', 10), ...dias.map((d) => centrado(X[d], 430, d, 10)));
  horas.forEach(({ desde, hasta, a = true, etiqueta = '', celdas = {} }, k) => {
    const arriba = 405 - k * 44;
    textos.push([55, arriba, desde, 9]);
    if (hasta && a) textos.push([68, arriba - 14, 'A', 9]);
    if (hasta) textos.push([55, arriba - 28, hasta, 9]);
    if (etiqueta) textos.push(centrado(X.HORA, arriba - 14, etiqueta, 12));
    for (const [dia, lineas] of Object.entries(celdas)) lineas.forEach((l, i) => textos.push(centrado(X[dia], arriba - i * 9, l)));
  });
  pie.forEach((t, i) => textos.push([60, 405 - horas.length * 44 - 10 - i * 12, t, 8]));
  return textos;
}

const h = (texto) => {
  const [hh, mm] = texto.split(':').map(Number);
  return hh * 60 + mm;
};
const clase = (dia, desde, hasta, materia, docentes = '', aula = '', cuatrimestre = 0) => ({ cuatrimestre, dia, desde: h(desde), hasta: h(hasta), materia, docentes, aula });

describe('comoTitulo, limpiarDocentes and leerCelda', () => {
  it('writes a name as the faculty does, with its connectors in lower case and its roman numerals in capitals', () => {
    expect(comoTitulo('ANALISIS MATEMATICO II')).toBe('Analisis Matematico II');
    expect(comoTitulo('PROBABILIDAD Y ESTADÍSTICA')).toBe('Probabilidad y Estadística');
    expect(comoTitulo('Control de calidad de los alimentos')).toBe('Control de Calidad de los Alimentos');
    expect(comoTitulo('ELECTROTECNIA y MÁQUINAS ELÉCTRICAS')).toBe('Electrotecnia y Máquinas Eléctricas');
  });

  it('leaves the teachers without parentheses, helpers or lopsided dashes', () => {
    expect(limpiarDocentes('Falcone-Auxiliares')).toBe('Falcone');
    expect(limpiarDocentes('Soria - Rosales - Aux.')).toBe('Soria-Rosales');
    expect(limpiarDocentes('Mansur- Varela')).toBe('Mansur-Varela');
    expect(limpiarDocentes('Ing. Peralta Alberto / Ing. Paredes Vera')).toBe('Peralta Alberto/Paredes Vera');
  });

  it('separates the subject, the teachers, the classroom and the hours of a cell', () => {
    expect(leerCelda(['HIDRAULICA', 'GRAL. Y APLICADA', '(Araoz-Cardozo)'])).toMatchObject({ materia: 'HIDRAULICA GRAL. Y APLICADA', docentes: 'Araoz-Cardozo', aula: '' });
    expect(leerCelda(['SISTEMAS DE', 'REPRESENTACIÓN', 'Bianchi - Auxiliares'])).toMatchObject({ materia: 'SISTEMAS DE REPRESENTACIÓN', docentes: 'Bianchi' });
    expect(leerCelda(['MATERIALES METÁLICOS', '216 / Lab. Metalografía'])).toMatchObject({ materia: 'MATERIALES METÁLICOS', docentes: '', aula: '216 / Lab. Metalografía' });
    expect(leerCelda(['PROYECTO', 'FINAL', '17.45 a 19.15 hs'])).toMatchObject({ materia: 'PROYECTO FINAL', desde: h('17:45'), hasta: h('19:15') });
    expect(leerCelda(['Gestión Ambiental y', 'Desarrollo Sustentable', 'De 8 a 9,35'])).toMatchObject({ materia: 'Gestión Ambiental y Desarrollo Sustentable', desde: h('8:00'), hasta: h('9:35') });
    expect(leerCelda(['(Geologia Aplicada a la', 'Ing. Civil y al Med. Amb)', '(Landi-Pesce)'])).toMatchObject({ materia: 'Geologia Aplicada a la Ing. Civil y al Med. Amb', docentes: 'Landi-Pesce' });
    expect(leerCelda(['PROYECTO FINAL (5V02)', 'Gerbaldi-Auxiliares'], 'V')).toMatchObject({ materia: 'PROYECTO FINAL', docentes: 'Gerbaldi', para: '5V02' });
    expect(leerCelda(['8:00 a 8:45'])).toBeNull();
    expect(leerCelda(['-'])).toBeNull();
  });
});

describe('horariosDePdf', () => {
  it('reads a commission of Química: its code, shift, cuatrimestre and the three rows of each hour, joined', async () => {
    const bytes = pdf([
      grilla({
        titulo: ['2V01 - TURNO MAÑANA - CICLO LECTIVO 2026 (PRIMER CUATRIMESTRE)'],
        dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
        horas: [
          { desde: '7:15', hasta: '7:55', etiqueta: 'PH', celdas: { LUNES: ['ANÁLISIS', 'MATEMÁTICO I'], VIERNES: ['QUÍMICA', 'Sultano - Ferraro -', 'Paleari'] } },
          {
            desde: '8:00',
            hasta: '8:45',
            etiqueta: '1º',
            celdas: { LUNES: ['ANÁLISIS', 'MATEMÁTICO I'], MARTES: ['ÁLGEBRA Y GEOMETRÍA', 'ANALÍTICA'], VIERNES: ['QUÍMICA', 'Sultano - Ferraro -', 'Paleari'] },
          },
          { desde: '8:45', hasta: '9:30', etiqueta: '2º', celdas: { MARTES: ['ALGEBRA Y GEOM.', 'ANALITICA'], MIERCOLES: ['SISTEMAS DE', 'REPRESENTACIÓN', 'Bianchi - Auxiliares'] } },
          { desde: '9:45', hasta: '10:30', etiqueta: '3º', celdas: { MIERCOLES: ['SISTEMAS DE', 'REPRESENTACIÓN', 'Falcone-Auxiliares'], JUEVES: ['-'] } },
        ],
      }),
    ]);
    expect(await horariosDePdf(bytes, { letra: 'V' })).toEqual([
      {
        comision: '2V01',
        turno: 'Mañana',
        clases: [
          clase(1, '7:15', '8:45', 'Análisis Matemático I', '', '', 1),
          clase(2, '8:00', '9:30', 'Álgebra y Geometría Analítica', '', '', 1),
          clase(3, '8:45', '10:30', 'Sistemas de Representación', 'Bianchi, Falcone', '', 1),
          clase(5, '7:15', '8:45', 'Química', 'Sultano-Ferraro-Paleari', '', 1),
        ],
      },
    ]);
  });

  it('reads Civil: its titles by page, teachers in parentheses, Saturday with its own hours and official names', async () => {
    const bytes = pdf([
      grilla({
        titulo: ['Ingeniería CIVIL - FRRO - UTN', 'HORARIOS 2026', '3ro. 01 IC TURNO NOCHE -'],
        horas: [
          { desde: '17.40 a', hasta: '18,35', a: false, celdas: { MARTES: ['INGLES II'] } },
          { desde: '18:35', hasta: '19:15', etiqueta: 'PH', celdas: { MARTES: ['INGLES II'] } },
          {
            desde: '19:15',
            hasta: '20:00',
            etiqueta: '1º',
            celdas: {
              LUNES: ['HIDRAULICA', 'GRAL. Y APLICADA', '(Araoz-Cardozo)'],
              MIERCOLES: ['TECNOLOGIA DE LA', 'CONSTRUCCION', '(Montero-Zutanez Suter)'],
              SABADO: ['8:00 a 8:45', 'GEOTOPOGRAFIA', '(Pavon/Landi)'],
            },
          },
          {
            desde: '20:00',
            hasta: '20:45',
            etiqueta: '2º',
            celdas: {
              LUNES: ['HIDRAULICA', 'GRAL. Y APLICADA', '(Araoz-Cardozo)'],
              JUEVES: ['INSTALACIONES', 'ELECT. Y ACUSTICA', '( Jurado-Fontana)'],
              SABADO: ['8:50 a 9:35', 'GEOTOPOGRAFIA', '(Pavon/Landi)'],
            },
          },
          { desde: '21:05', hasta: '21:50', etiqueta: '3º', celdas: { SABADO: ['9:45 a 10:30'] } },
          { desde: '23:25', hasta: '00:10', etiqueta: '6º', celdas: { VIERNES: ['ECONOMIA'] } },
        ],
      }),
      grilla({
        titulo: ['Ingeniería CIVIL - FRRO - UTN', 'HORARIOS 2026', '2 ro. 01 IC TURNO TARDE - 1er Cuatrimestre'],
        horas: [
          { desde: '12:50', hasta: null, celdas: { JUEVES: ['ECONOMIA'] } },
          { desde: '13:30', hasta: '14:10', etiqueta: 'PH', celdas: { JUEVES: ['ECONOMIA'], MARTES: ['(Geologia Aplicada a la', 'Ing. Civil y al Med. Amb)', '(Landi-Pesce)'] } },
          { desde: '14:15', hasta: '15:00', etiqueta: '1º', celdas: { MIERCOLES: ['Herramientas para', 'el Desarrollo', 'Profesional'] } },
        ],
        pie: ['Asignatura Electiva: Herramientas para el Desarrollo Profesional, Docente: Ing. Peralta Alberto / Ing. Paredes Vera'],
      }),
      [centrado(420, 560, 'Ingeniería CIVIL - FRRO - UTN', 14), centrado(420, 538, 'HORARIOS 2026', 14)],
      grilla({
        titulo: ['6to. 01 IC TURNO NOCHE - 1er Cuatrimestre - ELECTIVAS'],
        horas: [{ desde: '19:15', hasta: '20:00', etiqueta: '1º', celdas: { LUNES: ['VIALIDAD', 'ESPECIAL', '(Vega-Basso)'] } }],
      }),
    ]);
    const conocidas = ['Hidráulica General y Aplicada', 'Instalaciones Eléctricas y Acústicas', 'Geotopografía', 'Economía'];
    expect(await horariosDePdf(bytes, { letra: 'O', conocidas })).toEqual([
      {
        comision: '3O01',
        turno: 'Noche',
        clases: [
          clase(1, '19:15', '20:45', 'Hidráulica General y Aplicada', 'Araoz-Cardozo'),
          clase(2, '17:40', '19:15', 'Ingles II'),
          clase(3, '19:15', '20:00', 'Tecnologia de la Construccion', 'Montero-Zutanez Suter'),
          clase(4, '20:00', '20:45', 'Instalaciones Eléctricas y Acústicas', 'Jurado-Fontana'),
          { ...clase(5, '23:25', '00:10', 'Economía'), hasta: 1450 },
          clase(6, '8:00', '9:35', 'Geotopografía', 'Pavon/Landi'),
        ],
      },
      {
        comision: '2O01',
        turno: 'Tarde',
        clases: [
          clase(2, '13:30', '14:10', 'Geologia Aplicada a la Ing. Civil y al Med. Amb', 'Landi-Pesce', '', 1),
          clase(3, '14:15', '15:00', 'Herramientas para el Desarrollo Profesional', 'Peralta Alberto/Paredes Vera', '', 1),
          clase(4, '12:50', '14:10', 'Economía', '', '', 1),
        ],
      },
      { comision: '6EO01', turno: 'Noche', clases: [clase(1, '19:15', '20:00', 'Vialidad Especial', 'Vega-Basso', '', 1)] },
    ]);
  });

  it('reads Mecánica: the classroom under each subject goes apart, never in the name', async () => {
    const bytes = pdf([
      grilla({
        titulo: ['2do. 01 IM TURNO NOCHE'],
        horas: [
          { desde: '17:40', hasta: '18:25', etiqueta: 'PP', celdas: { MARTES: ['INGLES I', 'Aula 216'], JUEVES: ['FUNDAMENTOS DE', 'INFORMATICA', 'Lab. Informática'] } },
          { desde: '18:25', hasta: '19:10', etiqueta: 'PH', celdas: { MARTES: ['INGLES I', 'Aula 219'], JUEVES: ['FUNDAMENTOS DE', 'INFORMATICA', 'Lab. Informática'] } },
          { desde: '19:15', hasta: '20:00', etiqueta: '1º', celdas: { VIERNES: ['MATERIALES METÁLICOS', '216 / Lab. Metalografía'], SABADO: ['8:00 a 8:45', 'MATERIALES METALICOS'] } },
        ],
      }),
    ]);
    expect(await horariosDePdf(bytes, { letra: 'S' })).toEqual([
      {
        comision: '2S01',
        turno: 'Noche',
        clases: [
          clase(2, '17:40', '19:10', 'Ingles I', '', 'Aula 216, Aula 219'),
          clase(4, '17:40', '19:10', 'Fundamentos de Informatica', '', 'Lab. Informática'),
          clase(5, '19:15', '20:00', 'Materiales Metálicos', '', '216 / Lab. Metalografía'),
          clase(6, '8:00', '8:45', 'Materiales Metálicos'),
        ],
      },
    ]);
  });

  it('gives each commission of a shared title the same classes, and a cell that names another commission only to that one', async () => {
    const compartido = pdf([
      grilla({
        titulo: ['5V02, 5V01 - TURNO NOCHE - CICLO LECTIVO 2026 (SEGUNDO CUATRIMESTRE)'],
        horas: [{ desde: '18:25', hasta: '19:10', etiqueta: 'PH', celdas: { LUNES: ['MECÁNICA INDUSTRIAL', 'Maldez-Auxiliares'] } }],
      }),
    ]);
    const clases = [clase(1, '18:25', '19:10', 'Mecánica Industrial', 'Maldez', '', 2)];
    expect(await horariosDePdf(compartido, { letra: 'V' })).toEqual([
      { comision: '5V02', turno: 'Noche', clases },
      { comision: '5V01', turno: 'Noche', clases },
    ]);

    const marcada = pdf([
      grilla({
        titulo: ['5V01 - TURNO NOCHE - CICLO LECTIVO 2026 (PRIMER CUATRIMESTRE)'],
        horas: [
          {
            desde: '21:05',
            hasta: '21:50',
            etiqueta: '3º',
            celdas: { LUNES: ['PROYECTO FINAL', 'Santini-Auxiliares'], MARTES: ['INGENIERÍA AMBIENTAL', 'Maldini-Auxiliares'], MIERCOLES: ['PROYECTO FINAL (5V02)', 'Gerbaldi-Auxiliares'] },
          },
        ],
      }),
    ]);
    expect(await horariosDePdf(marcada, { letra: 'V' })).toEqual([
      {
        comision: '5V01',
        turno: 'Noche',
        clases: [clase(1, '21:05', '21:50', 'Proyecto Final', 'Santini', '', 1), clase(2, '21:05', '21:50', 'Ingeniería Ambiental', 'Maldini', '', 1)],
      },
      {
        comision: '5V02',
        turno: 'Noche',
        clases: [clase(3, '21:05', '21:50', 'Proyecto Final', 'Gerbaldi', '', 1)],
      },
    ]);
  });

  it('reads the electives of Química, with names in lower case over several lines', async () => {
    const bytes = pdf([
      grilla({
        titulo: ['2V02E - TURNO TARDE - 1° CUATRIMESTRE', 'ELECTIVAS IQ - CICLO LECTIVO 2026'],
        dias: ['LUNES', 'MARTES', 'MIERCOLES', 'JUEVES', 'VIERNES'],
        horas: [
          { desde: '14:15', hasta: '15:00', etiqueta: '2º', celdas: { VIERNES: ['Introducción a la', 'Tecnología de los', 'Alimentos'], MIERCOLES: ['Control de calidad de los', 'alimentos'] } },
          { desde: '15:00', hasta: '15:45', etiqueta: '3º', celdas: { VIERNES: ['Introducción a la', 'Tecnología de los', 'Alimentos'] } },
        ],
      }),
    ]);
    expect(await horariosDePdf(bytes, { letra: 'V' })).toEqual([
      {
        comision: '2EV02',
        turno: 'Tarde',
        clases: [clase(3, '14:15', '15:00', 'Control de Calidad de los Alimentos', '', '', 1), clase(5, '14:15', '15:45', 'Introducción a la Tecnología de los Alimentos', '', '', 1)],
      },
    ]);
  });

  it('reads the table of electives of Mecánica as one commission without code', async () => {
    const fila = (y, dia, desde, hasta, aula) => [centrado(289, y, '4 HS'), centrado(392, y, dia), centrado(504, y, desde), centrado(613, y, hasta), centrado(726, y, aula)];
    const bytes = pdf([
      [
        centrado(384, 400, 'Electivas IM', 14),
        ...['Asignatura', 'Carga Horaria', 'Día de dictado', 'Hora Inicio', 'Hora Fin', 'Aula'].map((t, i) => centrado([150, 289, 392, 504, 613, 726][i], 371, t, 9)),
        centrado(150, 352, 'TRANSFERENCIA DE ENERGÍA'),
        ...fila(346, 'Martes', '20:00', '23:25', '212'),
        centrado(150, 340, 'TÉRMICA'),
        centrado(150, 291, 'SISTEMAS DE CONTROL EN'),
        ...fila(286, 'Martes', '16:50', '19:10', 'Lab. Informática'),
        centrado(150, 279, 'INSTALACIONES TÉRMICAS'),
        centrado(150, 225, 'MAQUINARIA AGRÍCOLA'),
        ...fila(225, 'Viernes', '20:00', '23:25', '219'),
      ],
    ]);
    expect(await horariosDePdf(bytes, { letra: 'S' })).toEqual([
      {
        comision: null,
        turno: '',
        electivas: true,
        clases: [
          clase(2, '16:50', '19:10', 'Sistemas de Control en Instalaciones Térmicas', '', 'Lab. Informática'),
          clase(2, '20:00', '23:25', 'Transferencia de Energía Térmica', '', '212'),
          clase(5, '20:00', '23:25', 'Maquinaria Agrícola', '', '219'),
        ],
      },
    ]);
  });

  it('gives nothing for a PDF without text, like a scanned one', async () => {
    expect(await horariosDePdf(pdf([[]]), { letra: 'S' })).toEqual([]);
  });
});
