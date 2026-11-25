import { describe, expect, it } from 'vitest';
import { comparar, dividir, enDecimalExacto, enTexto, frac, leerFraccion, multiplicar, parteFraccionaria, piso, restar, sumar, terminaEnDecimal } from './racional.js';

describe('fracciones exactas', () => {
  it('se simplifican y llevan el signo arriba', () => {
    expect(frac(6, -4)).toEqual({ n: -3n, d: 2n });
    expect(frac(0, 7)).toEqual({ n: 0n, d: 1n });
    expect(() => frac(1, 0)).toThrow();
    expect(() => dividir(frac(1), frac(0))).toThrow();
  });

  it('las cuentas', () => {
    expect(enTexto(sumar(frac(1, 3), frac(1, 6)))).toBe('1/2');
    expect(enTexto(restar(frac(1, 3), frac(1, 2)))).toBe('-1/6');
    expect(enTexto(multiplicar(frac(-2, 3), frac(9, 4)))).toBe('-3/2');
    expect(enTexto(dividir(frac(1, 2), frac(-1, 4)))).toBe('-2');
    expect(comparar(frac(1, 3), frac(333, 1000))).toBe(1);
    expect(piso(frac(-7, 2))).toBe(-4n);
    expect(piso(frac(7, 2))).toBe(3n);
    expect(enTexto(parteFraccionaria(frac(-7, 2)))).toBe('1/2');
  });

  it('lee lo que se escribe, sin pasar por un número con coma flotante', () => {
    expect(leerFraccion('0,1')).toEqual(frac(1, 10));
    expect(leerFraccion('-3/4')).toEqual(frac(-3, 4));
    expect(leerFraccion('1e3')).toEqual(frac(1000));
    expect(leerFraccion('1,5E-2')).toEqual(frac(3, 200));
    expect(leerFraccion('−2')).toEqual(frac(-2));
    expect(leerFraccion('.5')).toEqual(frac(1, 2));
    for (const malo of ['', 'a', '1/0', '1,2,3', '--1', '.', 'e5']) expect(leerFraccion(malo), malo).toBe(null);
  });

  it('el decimal exacto, solo si termina', () => {
    expect(enDecimalExacto(frac(5, 8))).toBe('0,625');
    expect(enDecimalExacto(frac(-12))).toBe('-12');
    expect(enDecimalExacto(frac(1, 3))).toBe(null);
    expect(enDecimalExacto(frac(1, 1024), '.')).toBe('0.0009765625');
    expect(terminaEnDecimal(frac(7, 40))).toBe(true);
    expect(terminaEnDecimal(frac(1, 6))).toBe(false);
  });
});
