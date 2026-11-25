import { describe, expect, it } from 'vitest';
import { buscar, desordenado, leerArreglo, leerDato } from './dicotomica.js';

// The array of the notes of Algoritmos y Estructuras de Datos (of El Santo Resumen, «resumen arreglos»):
// 15 sorted numbers, looking for 47. medio = (comienzo + fin) DIV 2; smaller, fin = medio − 1; bigger,
// comienzo = medio + 1; until it's found or comienzo > fin, and then −1.
const APUNTE = '3, 7, 12, 18, 21, 25, 30, 34, 41, 47, 52, 58, 63, 70, 76';

describe('búsqueda dicotómica', () => {
  it('el 47 del apunte está en la posición 9', () => {
    const { v } = leerArreglo(APUNTE);
    const r = buscar(v, 47);
    expect(r.posicion).toBe(9);
    expect(r.pasos.map((p) => [p.comienzo, p.fin, p.medio, p.sigue])).toEqual([
      [0, 14, 7, 'mayor'],
      [8, 14, 11, 'menor'],
      [8, 10, 9, 'encontrado'],
    ]);
    expect(r.comparaciones).toBe(3);
  });

  it('un dato que no está devuelve −1 cuando comienzo pasa a fin', () => {
    const r = buscar(leerArreglo(APUNTE).v, 50);
    expect(r.posicion).toBe(-1);
    expect(r.pasos.at(-1)).toEqual({ comienzo: 10, fin: 9, medio: null, sigue: 'no-esta' });
    expect(r.comparaciones).toBe(4);
  });

  it('con las posiciones desde 1, como los arreglos de la práctica', () => {
    const r = buscar(leerArreglo(APUNTE).v, 47, 1);
    expect(r.posicion).toBe(10);
    expect(r.pasos[0]).toMatchObject({ comienzo: 1, fin: 15, medio: 8, valor: 34 });
  });

  it('también busca nombres', () => {
    const a = leerArreglo('Alemán, Español, Francés, Inglés, Italiano, Portugués');
    expect(a.numeros).toBe(false);
    expect(buscar(a.v, 'Inglés').posicion).toBe(3);
    expect(leerDato('Inglés', false).dato).toBe('Inglés');
  });

  it('lee números con coma decimal si van con punto y coma', () => {
    expect(leerArreglo('1,5; 2; 3,25').v).toEqual([1.5, 2, 3.25]);
    expect(leerArreglo('1 2 3').v).toEqual([1, 2, 3]);
    expect(leerArreglo('−2, 0, 4.5').v).toEqual([-2, 0, 4.5]);
    expect(leerDato('2,5', true).dato).toBe(2.5);
  });

  it('dice qué está mal', () => {
    expect(leerArreglo('').error).toBe('Falta el arreglo.');
    expect(leerArreglo('1,,2').error).toBe('Hay un lugar vacío entre dos separadores.');
    expect(leerArreglo(Array(65).fill('1').join(' ')).error).toMatch('65');
    expect(leerDato('', true).error).toBe('Falta el dato a buscar.');
    expect(leerDato('x', true).error).toBe('El arreglo es de números. El dato también.');
    expect(desordenado([1, 3, 2])).toBe(1);
    expect(desordenado([1, 2, 2, 3])).toBe(-1);
  });
});
