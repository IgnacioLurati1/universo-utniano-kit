// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { dominioDe, enlaceSeguro, faltan, idDeYoutube, normalizar, textoPlano } from './datos.js';

const DIA = 86_400;
const AHORA = Math.floor(new Date(2026, 10, 2, 12).getTime() / 1000);

describe('textoPlano', () => {
  it('removes markup and decodes entities', () => {
    expect(textoPlano('<p>Física &amp; <b>Química</b></p>')).toBe('Física & Química');
  });
  it('does not keep script content as markup', () => {
    expect(textoPlano('<img src=x onerror=alert(1)>hola')).toBe('hola');
  });
  it('survives empty values', () => {
    expect(textoPlano(null)).toBe('');
  });
});

describe('enlaceSeguro', () => {
  it('drops dangerous schemes and bad addresses', () => {
    expect(enlaceSeguro('javascript:alert(1)')).toBeNull();
    expect(enlaceSeguro('https://usuario:' + 'clave@ejemplo.com/a')).toBe('https://ejemplo.com/a');
    expect(enlaceSeguro('data:text/html,x')).toBeNull();
    expect(enlaceSeguro('no es url')).toBeNull();
  });
  it('removes any key from the link', () => {
    expect(enlaceSeguro('https://a.example/x?token=abc&y=1')).toBe('https://a.example/x?y=1');
  });
});

describe('faltan', () => {
  it('counts calendar days, not hours', () => {
    expect(faltan(AHORA + 3600, AHORA)).toBe('Vence hoy');
    expect(faltan(AHORA + DIA, AHORA)).toBe('Vence mañana');
    expect(faltan(AHORA + 3 * DIA, AHORA)).toBe('Vence en 3 días');
    expect(faltan(AHORA - 3600, AHORA)).toBe('Venció hoy');
    expect(faltan(AHORA - DIA, AHORA)).toBe('Venció ayer');
});
    expect(faltan(AHORA - 4 * DIA, AHORA)).toBe('Venció hace 4 días');
  });


describe('idDeYoutube', () => {
  it('reads the usual address forms', () => {
    expect(idDeYoutube('https://youtu.be/dQw4w9WgXcQ?t=3')).toBe('dQw4w9WgXcQ');
    expect(idDeYoutube('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(idDeYoutube('https://m.youtube.com/embed/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
  });
  it('rejects other sites and odd ids', () => {
    expect(idDeYoutube('https://evil.example/watch?v=dQw4w9WgXcQ')).toBeNull();
    expect(idDeYoutube('https://youtu.be/../../x')).toBeNull();
    expect(idDeYoutube('no es url')).toBeNull();
  });
});

describe('dominioDe', () => {
  it('shows where a link really goes', () => {
    expect(dominioDe('https://www.ejemplo.com/nota')).toBe('ejemplo.com');
    expect(dominioDe('roto')).toBe('');
  });
});


describe('normalizar', () => {
  it('lower case, no accents, trimmed', () => {
    expect(normalizar('  Álgebra Ñandú ')).toBe('algebra nandu');
    expect(normalizar(null)).toBe('');
  });
});
