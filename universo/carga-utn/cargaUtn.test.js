// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { CONTORNO, crearCargaUtn } from './cargaUtn.js';

describe('crearCargaUtn', () => {
  it('builds the emblem with its three layers and a status for screen readers', () => {
    const caja = crearCargaUtn({ texto: 'Cargando tus materias' });
    expect(caja.getAttribute('role')).toBe('status');
    expect(caja.textContent).toBe('Cargando tus materias');
    const capas = [...caja.querySelectorAll('path')].map((p) => p.getAttribute('class'));
    expect(capas).toEqual(['carga-utn__base', 'carga-utn__estela', 'carga-utn__haz']);
    expect(caja.querySelector('svg').getAttribute('aria-hidden')).toBe('true');
  });

  it('covers the window only when asked', () => {
    expect(crearCargaUtn().className).toBe('carga-utn');
    expect(crearCargaUtn({ pantalla: true }).className).toBe('carga-utn carga-utn--pantalla');
  });

  it('keeps the text as text, never as markup', () => {
    const caja = crearCargaUtn({ texto: '<img src=x>' });
    expect(caja.querySelector('img')).toBeNull();
    expect(caja.textContent).toBe('<img src=x>');
  });
});

describe('CONTORNO', () => {
  it('is one closed outline inside 0..100 high', () => {
    expect(CONTORNO.startsWith('M')).toBe(true);
    expect(CONTORNO.endsWith('Z')).toBe(true);
    expect(CONTORNO.match(/M/g)).toHaveLength(1);
    const ys = [...CONTORNO.matchAll(/[ML]([\d.]+) ([\d.]+)/g)].map((m) => Number(m[2]));
    expect(Math.min(...ys)).toBe(0);
    expect(Math.max(...ys)).toBe(100);
  });
});
