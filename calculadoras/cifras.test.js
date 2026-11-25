import { describe, expect, it } from 'vitest';
import { coma, entreParentesis, leerLista, leerNumero, porcentaje } from './cifras.js';

describe('cifras', () => {
  it('lee un número con coma o punto, una fracción o el menos de verdad', () => {
    expect(leerNumero('3,5')).toEqual({ valor: 3.5 });
    expect(leerNumero('.4')).toEqual({ valor: 0.4 });
    expect(leerNumero('−2')).toEqual({ valor: -2 });
    expect(leerNumero('1/6').valor).toBeCloseTo(1 / 6, 12);
    expect(leerNumero('  ')).toEqual({ falta: true });
    for (const mal of ['x', '1/0', '2,5,1', '1e3']) expect(leerNumero(mal)).toEqual({ mal: true });
  });

  it('lee listas como El Santo Resumen', () => {
    expect(leerLista('0,4 1,2').numeros).toEqual([0.4, 1.2]);
    expect(leerLista('1,2,3').numeros).toEqual([1, 2, 3]);
    expect(leerLista('0.4,1.2; 5').numeros).toEqual([0.4, 1.2, 5]);
    expect(leerLista('1/6 1/3').numeros[1]).toBeCloseTo(1 / 3, 12);
    expect(leerLista('3 x').error).toBe('«x» no es un número.');
    expect(leerLista('').vacia).toBe(true);
    expect(leerLista('1 2 3', 2).error).toMatch(/hasta 2/);
  });

  it('escribe como el apunte', () => {
    expect(coma(1095.445, 2)).toBe('1.095,45');
    expect(coma(0.2048)).toBe('0,2048');
    expect(coma(0.9, 2, { fijos: true })).toBe('0,90');
    expect(coma(-3)).toBe('−3');
    expect(coma(0.1 + 0.2)).toBe('0,3');
    expect(coma(Infinity)).toBe('∞');
    expect(coma(-0.00001, 4)).toBe('0');
    expect(entreParentesis(-2)).toBe('(−2)');
    expect(porcentaje(0.0252)).toBe('2,52%');
  });
});
