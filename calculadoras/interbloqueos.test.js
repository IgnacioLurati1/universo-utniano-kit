import { describe, expect, it } from 'vitest';
import { detectar, leerDatos, vector } from './interbloqueos.js';

// Figure 6-7 of Sistemas Operativos (of El Santo Resumen, teoría 5c): E = (4 2 3 1), A = (2 1 0 0). Process 3
// runs and leaves A = (2 2 2 0), then 2 with (4 2 2 1), then 1. If process 2 also asked for a CD-ROM, 1 and 2 would be
// deadlocked; if process 3 asked for it, as the book does, the whole system would.
const texto = (M) => M.map((f) => f.map(String));
const C = [[0, 0, 1, 0], [2, 0, 0, 1], [0, 1, 2, 0]];
const R = [[2, 0, 0, 1], [1, 0, 1, 0], [2, 1, 0, 0]];

describe('detección de interbloqueos', () => {
  it('la figura 6-7, con E: A sale de E menos lo asignado', () => {
    const d = leerDatos({ C: texto(C), R: texto(R), vector: ['4', '2', '3', '1'], es: 'E' });
    expect(d.usado).toEqual([2, 1, 3, 1]);
    expect(d.A).toEqual([2, 1, 0, 0]);
  });

  it('la figura 6-7: termina el 3, después el 2 y al final el 1', () => {
    const r = detectar(C, R, [2, 1, 0, 0]);
    expect(r.orden).toEqual([2, 1, 0]);
    expect(r.bloqueados).toEqual([]);
    expect(r.rondas.map((x) => x.despues)).toEqual([[2, 2, 2, 0], [4, 2, 2, 1], [4, 2, 3, 1]]);
    // The 1 can't for lack of CD-ROM (resource 4) and the 2 for lack of a scanner (resource 3).
    expect(r.rondas[0].revisados).toEqual([{ i: 0, falta: 3 }, { i: 1, falta: 2 }]);
  });

  it('si el proceso 2 pide además un CD-ROM, quedan el 1 y el 2', () => {
    const r = detectar(C, [[2, 0, 0, 1], [1, 0, 1, 1], [2, 1, 0, 0]], [2, 1, 0, 0]);
    expect(r.orden).toEqual([2]);
    expect(r.bloqueados).toEqual([0, 1]);
    expect(r.rondas.at(-1)).toMatchObject({ elegido: -1, A: [2, 2, 2, 0] });
  });

  it('si el proceso 3 pide además un CD-ROM, como en el libro, queda todo el sistema', () => {
    const r = detectar(C, [[2, 0, 0, 1], [1, 0, 1, 0], [2, 1, 0, 1]], [2, 1, 0, 0]);
    expect(r.orden).toEqual([]);
    expect(r.bloqueados).toEqual([0, 1, 2]);
  });

  it('dice qué celda está mal', () => {
    const base = { C: texto(C), R: texto(R), vector: ['2', '1', '0', '0'], es: 'A' };
    expect(leerDatos(base).A).toEqual([2, 1, 0, 0]);
    expect(leerDatos({ ...base, C: [['0', '', '1', '0'], ...texto(C).slice(1)] }).error).toMatchObject({ donde: 'C', fila: 0, columna: 1 });
    expect(leerDatos({ ...base, R: [...texto(R).slice(0, 2), ['2', '1', '-1', '0']] }).error).toMatchObject({ donde: 'R', fila: 2, columna: 2 });
    expect(leerDatos({ ...base, vector: ['2', 'x', '0', '0'] }).error).toMatchObject({ donde: 'v', columna: 1 });
    expect(leerDatos({ ...base, vector: ['4', '2', '2', '1'], es: 'E' }).error).toMatchObject({ donde: 'v', columna: 2 });
  });

  it('escribe los vectores como el apunte', () => {
    expect(vector([2, 1, 0, 0])).toBe('(2 1 0 0)');
  });
});
