import { describe, expect, it } from 'vitest';
import { correr, leerVentana, tramos } from './congestion.js';

// The figure of Redes de Datos (of El Santo Resumen, Capa de Transporte, TCP, page 16): threshold 32,
// slow start up to it and then one by one. The segment is lost with the window at 40 and the threshold drops to 20.
// Tahoe goes back to 1; Reno goes on from 20.
const FIGURA = { umbral: 32, inicial: 1, rondas: 24, perdidas: [13] };

describe('ventana de congestión', () => {
  it('slow start duplica hasta el umbral y después suma de a uno', () => {
    const s = correr(FIGURA, false);
    expect(s.slice(0, 7).map((x) => x.ventana)).toEqual([1, 2, 4, 8, 16, 32, 33]);
    expect(s.slice(0, 5).every((x) => x.fase === 'slow')).toBe(true);
    expect(s[5].fase).toBe('aditivo');
  });

  it('la pérdida de la figura: con la ventana en 40 el umbral baja a 20', () => {
    const tahoe = correr(FIGURA, false);
    const reno = correr(FIGURA, true);
    expect(tahoe[13]).toEqual({ ronda: 13, ventana: 40, umbral: 32, fase: 'perdida' });
    expect(tahoe[14]).toMatchObject({ ventana: 1, umbral: 20, fase: 'slow' });
    expect(tahoe.slice(14, 21).map((x) => x.ventana)).toEqual([1, 2, 4, 8, 16, 20, 21]);
    expect(reno[14]).toMatchObject({ ventana: 20, umbral: 20, fase: 'aditivo' });
    expect(reno[24].ventana).toBe(30);
    expect(tahoe[24].ventana).toBe(25);
  });

  it('agrupa las rondas por fase', () => {
    const t = tramos(correr(FIGURA, false));
    expect(t.slice(0, 3)).toEqual([
      { fase: 'slow', desde: 0, hasta: 4, valores: [1, 2, 4, 8, 16] },
      { fase: 'aditivo', desde: 5, hasta: 12, valores: [32, 33, 34, 35, 36, 37, 38, 39] },
      { fase: 'perdida', desde: 13, hasta: 13, valores: [40] },
    ]);
  });

  it('lee los campos y dice cuál está mal', () => {
    expect(leerVentana({ umbral: '32', inicial: '1', rondas: '24', perdidas: '13, 8 13' })).toEqual({ umbral: 32, inicial: 1, rondas: 24, perdidas: [8, 13] });
    expect(leerVentana({ umbral: '32', inicial: '1', rondas: '24', perdidas: '' }).perdidas).toEqual([]);
    expect(leerVentana({ umbral: '0', inicial: '1', rondas: '24', perdidas: '' }).en).toBe('umbral');
    expect(leerVentana({ umbral: '32', inicial: 'x', rondas: '24', perdidas: '' }).en).toBe('inicial');
    expect(leerVentana({ umbral: '32', inicial: '1', rondas: '61', perdidas: '' }).en).toBe('rondas');
    expect(leerVentana({ umbral: '32', inicial: '1', rondas: '24', perdidas: '30' })).toMatchObject({ en: 'perdidas', error: 'La ronda 30 queda después de la última, la 24.' });
    expect(leerVentana({ umbral: '32', inicial: '1', rondas: '24', perdidas: 'a' }).en).toBe('perdidas');
  });
});
