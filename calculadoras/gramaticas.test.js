import { describe, expect, it } from 'vitest';
import { arbolDerivacion, clasificar, derivar, leerGramatica, lenguaje } from './gramaticas.js';

// The examples are the ones of the notes of Sintaxis y Semántica de los Lenguajes («Derivaciones» and
// «Jerarquía de Chomsky y máquinas», apunte «4. Gramáticas», págs. 3 a 12), with the derivations they write.
const cadena = (d) => d.camino.map((x) => x.f || 'ε').join(' ⇒ ');

describe('gramáticas', () => {
  it('G = {{0, 1}, {A, B}, P, A}, su lenguaje 1(01)ⁿ y la derivación de 10101', () => {
    const g = leerGramatica('A -> B1 | 1\nB -> A0');
    expect(g).toMatchObject({ axioma: 'A', VN: ['A', 'B'], VT: ['1', '0'], libre: true });
    const c = clasificar(g);
    expect(c.tipo).toBe(3);
    expect(c.lado).toBe('por la izquierda');
    const len = lenguaje(g);
    expect(len.ciclo).not.toBe(null);
    expect(len.cortas).toEqual(['1']);
    expect(len.siguientes).toEqual(['101']);
    const d = derivar(g, '10101', 'izquierda', len.largo);
    expect(cadena(d)).toBe('A ⇒ B1 ⇒ A01 ⇒ B101 ⇒ A0101 ⇒ 10101');
  });

  it('aa por la izquierda y por la derecha, como el apunte', () => {
    const g = leerGramatica('S -> aABAa\nA -> ε | aA\nB -> ε | bB');
    const len = lenguaje(g);
    expect(cadena(derivar(g, 'aa', 'izquierda', len.largo))).toBe('S ⇒ aABAa ⇒ aBAa ⇒ aAa ⇒ aa');
    expect(cadena(derivar(g, 'aa', 'derecha', len.largo))).toBe('S ⇒ aABAa ⇒ aABa ⇒ aAa ⇒ aa');
    // A → ε in a non-terminal that is not the axiom: the notes only allow S → ε.
    expect(clasificar(g).tipo).toBe(0);
    expect(clasificar(g, true).tipo).toBe(2);
  });

  it('regular por la derecha, con bbaabb', () => {
    const g = leerGramatica('S -> bbS | aaA\nA -> aaA | bb');
    expect(clasificar(g)).toMatchObject({ tipo: 3, lado: 'por la derecha' });
    const len = lenguaje(g);
    expect(len.cortas).toEqual(['aabb']);
    expect(cadena(derivar(g, 'bbaabb', 'izquierda', len.largo))).toBe('S ⇒ bbS ⇒ bbaaA ⇒ bbaabb');
  });

  it('G1 es de tipo 0 por 0S1 → 01', () => {
    const g = leerGramatica('S -> 000S111\n0S1 -> 01');
    expect(g.libre).toBe(false);
    const c = clasificar(g);
    expect(c.tipo).toBe(0);
    expect(c.tipos[1].por).toBe('La derecha es más corta que la izquierda.');
  });

  it('el árbol de la derivación tiene el axioma arriba y la palabra en las hojas', () => {
    const g = leerGramatica('A -> B1 | 1\nB -> A0');
    const d = derivar(g, '101', 'izquierda', lenguaje(g).largo);
    const t = arbolDerivacion(d.camino);
    expect(t.vertices[0].e).toBe('A');
    expect(t.altura).toBe(3);
    const hojas = t.vertices.filter((v) => !v.hijos.length).sort((a, b) => a.x - b.x).map((v) => v.e).join('');
    expect(hojas).toBe('101');
  });

  it('una que no genera la palabra, y lo que está mal escrito', () => {
    const g = leerGramatica('A -> B1 | 1\nB -> A0');
    const d = derivar(g, '11', 'izquierda', lenguaje(g).largo);
    expect(d.camino).toBe(null);
    expect(leerGramatica('').error).toBe('Escribí las producciones, como S -> aS | b.');
    expect(leerGramatica('S aS').error).toBe('A «S aS» le falta la flecha, como en S -> aS.');
    expect(leerGramatica('a -> b').error).toBe('Falta un no terminal a la izquierda. Van en mayúscula, como S.');
  });
});
