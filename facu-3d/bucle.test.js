import { describe, expect, it } from 'vitest';
import { crearBucle } from './bucle.js';

// A fake requestAnimationFrame: frames wait in a queue until `correr`.
function reloj() {
  let cola = [];
  let n = 0;
  return {
    raf: (f) => {
      cola.push({ id: ++n, f });
      return n;
    },
    cancelar: (id) => (cola = cola.filter((c) => c.id !== id)),
    correr() {
      const ahora = cola;
      cola = [];
      ahora.forEach((c) => c.f(16));
    },
    get pendientes() {
      return cola.length;
    },
  };
}

describe('the drawing loop', () => {
  it('keeps one frame pending when the frame itself asks for another (the controls do, while dragging)', () => {
    const r = reloj();
    let bucle;
    bucle = crearBucle(() => {
      bucle.pedir();
      return true;
    }, r);
    bucle.pedir();
    for (let i = 0; i < 20; i++) {
      r.correr();
      expect(r.pendientes).toBe(1);
    }
  });

  it('stops when the step says so, and parar cancels the pending frame', () => {
    const r = reloj();
    let vueltas = 0;
    const bucle = crearBucle(() => ++vueltas < 3, r);
    bucle.pedir();
    bucle.pedir();
    expect(r.pendientes).toBe(1);
    for (let i = 0; i < 5; i++) r.correr();
    expect(vueltas).toBe(3);
    expect(r.pendientes).toBe(0);
    bucle.pedir();
    bucle.parar();
    expect(r.pendientes).toBe(0);
    expect(bucle.pendiente).toBe(false);
  });
});
