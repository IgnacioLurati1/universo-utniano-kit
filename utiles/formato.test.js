import { describe, expect, it } from 'vitest';
import { enLinea, leerFormato } from './formato.js';

describe('leerFormato', () => {
  it('reads headings, lists and paragraphs', () => {
    const b = leerFormato('# Título\n\n- uno\n- dos\n\nHola **mundo**\nsegunda línea');
    expect(b.map((x) => x.tipo)).toEqual(['titulo', 'lista', 'parrafo']);
    expect(b[1].items).toHaveLength(2);
    expect(b[2].lineas).toHaveLength(2);
    expect(b[2].lineas[0][1]).toEqual({ tipo: 'negrita', texto: 'mundo' });
  });
  it('turns http(s) addresses into links and never makes HTML', () => {
    const partes = enLinea('mirá https://ejemplo.com/a?token=x y <script>x()</script>');
    expect(partes[1]).toEqual({ tipo: 'enlace', texto: 'https://ejemplo.com/a?token=x', url: 'https://ejemplo.com/a' });
    expect(partes.at(-1).texto).toContain('<script>');
    expect(partes.every((p) => typeof p.texto === 'string')).toBe(true);
  });
  it('leaves unclosed marks as written', () => {
    expect(enLinea('a **b')).toEqual([{ tipo: 'texto', texto: 'a **b' }]);
  });
});
