import { describe, expect, it } from 'vitest';
import { aCsv, decodificar, leerCsv, nombreSql, proponerTabla, separadorDe, tipoDe } from './csv.js';

describe('csv', () => {
  it('reads quotes, doubled quotes and any line ending', () => {
    expect(leerCsv('a,"b,""c""",d\r\n1,2,3\n\n4,5,6')).toEqual([['a', 'b,"c"', 'd'], ['1', '2', '3'], ['4', '5', '6']]);
  });
  it('finds the separator', () => {
    expect(separadorDe('a;b;c\n1;2;3\n4;5;6')).toBe(';');
    expect(separadorDe('a,b\n1,2')).toBe(',');
  });
  it('decodes UTF-8, UTF-16 and Windows-1252', () => {
    expect(decodificar(new TextEncoder().encode('canción'))).toBe('canción');
    expect(decodificar(new Uint8Array([0x63, 0x61, 0x6e, 0x63, 0x69, 0xf3, 0x6e]))).toBe('canción');
    expect(decodificar(new Uint8Array([0xff, 0xfe, 0x61, 0x00]))).toBe('a');
  });
  it('proposes a table with names and types', () => {
    const t = proponerTabla('Código;Año;Precio\n007;2020;1,5\n008;2021;2,25', 'mis datos.csv');
    expect(t.separador).toBe(';');
    expect(t.encabezado).toBe(true);
    expect(t.tabla).toBe('mis_datos');
    expect(t.columnas).toEqual([{ nombre: 'codigo', tipo: 'TEXT' }, { nombre: 'anio', tipo: 'INTEGER' }, { nombre: 'precio', tipo: 'REAL' }]);
  });
  it('keeps a code with zeros in front as text, and avoids reserved words', () => {
    expect(tipoDe(['007', '010'])).toBe('TEXT');
    expect(tipoDe(['7', '10'])).toBe('INTEGER');
    expect(nombreSql('select')).toBe('select_');
    expect(nombreSql('1 año')).toBe('columna_1_anio');
  });
  it('writes a CSV for Excel in Spanish and defuses formulas', () => {
    const csv = aCsv(['a', 'b'], [[1.5, '=SUM(A1)'], ['x;y', null]]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain("1,5;'=SUM(A1)");
    expect(csv).toContain('"x;y";');
    expect(csv.endsWith('\r\n')).toBe(true);
  });
});
