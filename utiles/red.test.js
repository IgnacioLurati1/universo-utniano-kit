import { describe, expect, it } from 'vitest';
import { cerrarRed, SIN_RED } from './red.js';

describe('cerrarRed', () => {
  it('takes the network away from the object and from its prototypes', () => {
    const base = { fetch: () => 1, WebSocket: class {} };
    const global = Object.create(base);
    global.XMLHttpRequest = class {};
    const habia = cerrarRed(global);
    expect(habia.sort()).toEqual(['WebSocket', 'XMLHttpRequest', 'fetch']);
    for (const n of ['fetch', 'WebSocket', 'XMLHttpRequest']) expect(global[n]).toBeUndefined();
    expect(base.fetch).toBeUndefined();
    expect(SIN_RED).toContain('indexedDB');
    for (const nombre of ['FontFace', 'fonts', 'Notification']) expect(SIN_RED).toContain(nombre);
  });
});
