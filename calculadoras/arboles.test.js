import { describe, expect, it } from 'vitest';
import { leerArbol, recorrer } from './arboles.js';

// The example is the one of the notes of Lógica y Estructuras Discretas (parcial-3.md, «Recorridos», Árboles.pdf,
// páginas 7 a 9), with the preorder and postorder it gives.
const orden = (t, cual) => recorrer(t.raiz, cual).map((v) => v.e).join(' ');

describe('árboles', () => {
  it('el árbol de (a − b) × (c + d ÷ e) y sus recorridos, como el apunte', () => {
    const t = leerArbol('(a - b) * (c + d / e)', 'expresion');
    expect(t.raiz.e).toBe('×');
    expect(orden(t, 'preorden')).toBe('× − a b + c ÷ d e');
    expect(orden(t, 'postorden')).toBe('a b − c d e ÷ + ×');
    expect(orden(t, 'entreorden')).toBe('a − b × c + d ÷ e');
    expect(t.altura).toBe(3);
    expect(t.hojas.map((v) => v.e)).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('respeta la precedencia y la potencia agrupa de derecha a izquierda', () => {
    expect(orden(leerArbol('a + b * c', 'expresion'), 'preorden')).toBe('+ a × b c');
    expect(orden(leerArbol('a ^ b ^ c', 'expresion'), 'postorden')).toBe('a b c ^ ^');
    expect(orden(leerArbol('y + 2', 'expresion'), 'preorden')).toBe('+ y 2');
  });

  it('lee un árbol escrito como A(B, C(, D))', () => {
    const t = leerArbol('A(B(D, E), C(, F))', 'anidado');
    expect(orden(t, 'preorden')).toBe('A B D E C F');
    expect(orden(t, 'entreorden')).toBe('D B E A C F');
    expect(orden(t, 'postorden')).toBe('D E B F C A');
    // C has only a right child: it stays to the right of C.
    const c = t.vertices.find((v) => v.e === 'C');
    const f = t.vertices.find((v) => v.e === 'F');
    expect(f.x).toBeGreaterThan(c.x);
  });

  it('dice qué está mal', () => {
    expect(leerArbol('', 'expresion').error).toBe('Escribí la expresión.');
    expect(leerArbol('(a + b', 'expresion').error).toBe('Falta cerrar un paréntesis.');
    expect(leerArbol('a +', 'expresion').error).toBe('Falta un operando al final.');
    expect(leerArbol('a b', 'expresion').error).toMatch(/Entre dos operandos va un operador/);
    expect(leerArbol('a % b', 'expresion').error).toMatch(/no es un operador/);
    expect(leerArbol('A(B, C, D)', 'anidado').error).toMatch(/árbol binario/);
    expect(leerArbol('A(B))', 'anidado').error).toMatch(/Sobra/);
  });
});
