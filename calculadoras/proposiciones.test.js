import { describe, expect, it } from 'vitest';
import { parsear, tablaVerdad, texto } from './proposiciones.js';

// The examples are the ones of the notes of Lógica y Estructuras Discretas («Conectivos», «Tautología,
// contradicción y ley lógica» and «Razonamientos») and of Inteligencia Artificial («Formas sentenciales» and
// «Teoremas de De Morgan»).
const columna = (r, i) => r.columnas[i].vals.map((v) => (v ? 'V' : 'F')).join('');

describe('proposiciones', () => {
  it('la tabla de los conectivos del apunte de Lógica', () => {
    expect(columna(tablaVerdad('p y q'), 0)).toBe('VFFF');
    expect(columna(tablaVerdad('p o q'), 0)).toBe('VVVF');
    expect(columna(tablaVerdad('p -> q'), 0)).toBe('VFVV');
    expect(columna(tablaVerdad('p <-> q'), 0)).toBe('VFFV');
    expect(columna(tablaVerdad('p ⊻ q'), 0)).toBe('FVVF');
  });

  it('el modus ponens es tautología y la afirmación del consecuente no', () => {
    expect(tablaVerdad('((p -> q) y p) -> q').clase).toBe('tautologia');
    const mal = tablaVerdad('(p ⇒ q) ∧ q ⇒ p');
    expect(mal.clase).toBe('contingente');
    expect(mal.verdaderas).toBe(3);
    expect(mal.final).toEqual([true, true, false, true]);
  });

  it('las tres formas sentenciales del apunte de IA', () => {
    expect(tablaVerdad('p ∨ ∼p').clase).toBe('tautologia');
    expect(tablaVerdad('p ⋅ ∼p').clase).toBe('contradiccion');
    expect(tablaVerdad('p ⊃ q').clase).toBe('contingente');
  });

  it('De Morgan, con la tabla del apunte de IA', () => {
    const r = tablaVerdad('∼(p ⋅ q) ≡ (∼p ∨ ∼q)');
    expect(r.clase).toBe('tautologia');
    expect(r.columnas.map((c) => texto(c.nodo, 'ia'))).toEqual(['p ⋅ q', '∼(p ⋅ q)', '∼p', '∼q', '∼p ∨ ∼q', '∼(p ⋅ q) ≡ (∼p ∨ ∼q)']);
    expect(columna(r, 1)).toBe('FVVV');
    expect(columna(r, 4)).toBe('FVVV');
  });

  it('el silogismo disyuntivo con corchetes, como lo escribe el apunte de IA', () => {
    expect(tablaVerdad('[(p ∨ q) ⋅ ∼p] ⊃ q').clase).toBe('tautologia');
    expect(tablaVerdad('[(p ⊃ q) ⋅ q] ⊃ p').clase).toBe('contingente');
  });

  it('con n variables hay 2 a la n renglones, la primera con todo verdadero', () => {
    const r = tablaVerdad('(p -> q) y (q -> r) -> (p -> r)');
    expect(r.variables).toEqual(['p', 'q', 'r']);
    expect(r.asignaciones).toHaveLength(8);
    expect(r.asignaciones[0]).toEqual({ p: true, q: true, r: true });
    expect(r.asignaciones[7]).toEqual({ p: false, q: false, r: false });
    expect(r.clase).toBe('tautologia');
  });

  it('escribe cada fórmula con los símbolos de su materia', () => {
    const n = parsear('no (p o q) <-> (no p y no q)');
    expect(texto(n, 'logica')).toBe('∼(p ∨ q) ⇔ (∼p ∧ ∼q)');
    expect(texto(n, 'ia')).toBe('∼(p ∨ q) ≡ (∼p ⋅ ∼q)');
    expect(texto(parsear('p -> q -> r'), 'logica')).toBe('p ⇒ (q ⇒ r)');
    expect(texto(parsear('(p -> q) -> r'), 'ia')).toBe('(p ⊃ q) ⊃ r');
    expect(texto(parsear('(p -> q) y p -> q'), 'logica')).toBe('((p ⇒ q) ∧ p) ⇒ q');
    expect(texto(parsear('p y q y r'), 'logica')).toBe('p ∧ q ∧ r');
  });

  it('dice qué falta o qué sobra', () => {
    const error = (f) => {
      try {
        tablaVerdad(f);
        return null;
      } catch (e) {
        return e.message;
      }
    };
    expect(error('')).toBe('Escribí una fórmula.');
    expect(error('p ->')).toBe('Falta una variable al final.');
    expect(error('(p y q')).toBe('Falta cerrar un paréntesis.');
    expect(error('p q')).toBe('Falta un conectivo entre dos partes de la fórmula.');
    expect(error('p y q)')).toBe('Sobra un paréntesis que cierra.');
    expect(error('casa -> p')).toMatch(/no es una variable/);
    expect(error('p % q')).toMatch(/no es un conectivo/);
    expect(error('a y b y c y d y e y f y g')).toBe('Son 7 variables y el tope es 6.');
  });
});
