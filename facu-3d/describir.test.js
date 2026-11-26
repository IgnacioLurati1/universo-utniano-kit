import { describe, expect, it } from 'vitest';
import { arbol, barandas, describirEscena, logos, MEDIDAS, xDeFoto, yDeFoto } from './describir.js';
import { LOGO_BLANCO, LOGO_EXTERIOR } from './logo.js';

const escena = describirEscena();
const solape = (p, q) => [0, 1, 2].map((k) => Math.max(0, Math.min(p.b[k], q.b[k]) - Math.max(p.a[k], q.a[k]))).reduce((x, y) => x * y, 1);

describe('the fit to the photo', () => {
  it('turns the glass door into 2.5 m and the blue block into the same height at both ends', () => {
    expect(yDeFoto(560, 505) - yDeFoto(560, 735)).toBeCloseTo(2.5, 1);
    const izquierda = yDeFoto(770, 225);
    const derecha = yDeFoto(1110, 165);
    expect(Math.abs(izquierda - derecha)).toBeLessThan(0.15);
    expect(izquierda).toBeCloseTo(MEDIDAS.planta, 0);
  });

  it('puts the door and the pilasters where the photo has them, within 10 cm', () => {
    expect(Math.abs(xDeFoto(345) - MEDIDAS.puerta.x[0])).toBeLessThan(0.1);
    expect(Math.abs(xDeFoto(770) - MEDIDAS.puerta.x[1])).toBeLessThan(0.1);
    expect(Math.abs(xDeFoto(150) - MEDIDAS.ventanas[3][1])).toBeLessThan(0.1);
    expect(Math.abs(xDeFoto(1110) - MEDIDAS.reja.x[0])).toBeLessThan(0.1);
  });

  it('keeps the proportions of the entrance: door about twice as wide as tall, sign as wide as the door', () => {
    const [x0, x1] = MEDIDAS.puerta.x;
    const [y0, y1] = MEDIDAS.puerta.y;
    expect((x1 - x0) / (y1 - y0)).toBeGreaterThan(1.7);
    expect((x1 - x0) / (y1 - y0)).toBeLessThan(2.1);
    expect(MEDIDAS.cartel.x[1] - MEDIDAS.cartel.x[0]).toBeGreaterThanOrEqual(x1 - x0);
  });
});

describe('the boxes', () => {
  it('all have a size and stay inside the street', () => {
    for (const c of escena.cajas) {
      for (let k = 0; k < 3; k++) expect(c.b[k]).toBeGreaterThan(c.a[k]);
      expect(c.a[1]).toBeGreaterThanOrEqual(-0.5);
      expect(c.b[1]).toBeLessThanOrEqual(MEDIDAS.alto + 1e-9);
    }
  });

  it('the painted wall never overlaps itself (no flickering faces)', () => {
    for (const m of ['celeste', 'blanco']) {
      const muro = escena.cajas.filter((c) => c.m === m && !c.inclinar);
      for (let i = 0; i < muro.length; i++) {
        for (let j = i + 1; j < muro.length; j++) expect(solape(muro[i], muro[j]), `${m} ${i} ${j}`).toBeLessThan(1e-6);
      }
    }
  });

  it('leaves the door, the windows and the barred window open', () => {
    const huecos = [
      { a: [MEDIDAS.puerta.x[0] + 0.01, MEDIDAS.puerta.y[0] + 0.01, -0.3], b: [MEDIDAS.puerta.x[1] - 0.01, MEDIDAS.puerta.y[1] - 0.01, 0] },
      ...MEDIDAS.ventanas.map(([a, b]) => ({ a: [a + 0.01, MEDIDAS.ventanaY[0] + 0.01, -0.1], b: [b - 0.01, MEDIDAS.ventanaY[1] - 0.01, 0] })),
      { a: [MEDIDAS.reja.x[0] + 0.01, MEDIDAS.reja.y[0] + 0.01, -0.04], b: [MEDIDAS.reja.x[1] - 0.01, MEDIDAS.reja.y[1] - 0.01, 0] },
    ];
    const muro = escena.cajas.filter((c) => (c.m === 'celeste' || c.m === 'blanco') && c.b[2] >= 0);
    for (const h of huecos) for (const c of muro) expect(solape(h, c)).toBeLessThan(1e-6);
  });

  it('closes the wall: every metre of the blue floor has wall, glass or a door', () => {
    const { desde, hasta } = MEDIDAS.frente;
    for (let x = desde + 0.05; x < hasta; x += 0.1) {
      for (let y = 0.05; y < MEDIDAS.planta; y += 0.1) {
        const hay = escena.cajas.some((c) => c.a[0] <= x && x <= c.b[0] && c.a[1] <= y && y <= c.b[1] && c.a[2] <= -0.05 && c.b[2] > -0.6);
        expect(hay, `hueco en ${x.toFixed(2)}, ${y.toFixed(2)}`).toBe(true);
      }
    }
  });
});

describe('railings and tree', () => {
  it('stand on the sidewalk, in front of the door, with a gap to walk through', () => {
    const [izq, der] = MEDIDAS.barandas;
    expect(der.x[0] - izq.x[1]).toBeGreaterThanOrEqual(0.5);
    for (const b of barandas()) {
      for (const camino of b.tubos) {
        for (const [, y, z] of camino) {
          expect(z).toBeGreaterThan(0);
          expect(z).toBeLessThan(MEDIDAS.vereda);
          expect(y).toBeLessThanOrEqual(MEDIDAS.baranda.alto + 1e-9);
        }
      }
    }
    const medio = (izq.x[1] + der.x[0]) / 2;
    expect(medio).toBeGreaterThan(MEDIDAS.puerta.x[0]);
    expect(medio).toBeLessThan(MEDIDAS.puerta.x[1]);
  });

  it('the tree grows from its pit, never into the wall or above its height, and comes out the same every time', () => {
    const { ramas, hojas } = arbol();
    expect(ramas[0].puntos[0][0]).toBeCloseTo(MEDIDAS.arbol.x, 5);
    for (const { puntos } of ramas) {
      for (const [, y, z] of puntos) {
        expect(z).toBeGreaterThan(0.3);
        expect(y).toBeLessThanOrEqual(MEDIDAS.arbol.alto);
      }
    }
    for (const h of hojas) expect(h.centro[2] - h.radio).toBeGreaterThan(0.2);
    expect(hojas.length).toBeGreaterThan(30);
    expect(arbol()).toEqual(arbol());
  });
});

describe('the logos', () => {
  it('the traced outline is closed, fits in its unit square and is the same mirrored both ways', () => {
    for (const forma of [LOGO_EXTERIOR, LOGO_BLANCO]) {
      expect(forma.length).toBeGreaterThan(40);
      for (const [x, y] of forma) {
        expect(Math.abs(x)).toBeLessThanOrEqual(0.5);
        expect(Math.abs(y)).toBeLessThanOrEqual(0.5);
      }
      // Every corner's mirror image lies on the outline, within 1 % of the side.
      const aSegmento = ([x, y], [ax, ay], [bx, by]) => {
        const l = (bx - ax) ** 2 + (by - ay) ** 2 || 1e-12;
        const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / l));
        return Math.hypot(ax + t * (bx - ax) - x, ay + t * (by - ay) - y);
      };
      const cerca = (q) => Math.min(...forma.map((a, i) => aSegmento(q, a, forma[(i + 1) % forma.length])));
      for (const [x, y] of forma) {
        expect(cerca([-x, y])).toBeLessThan(0.01);
        expect(cerca([x, -y])).toBeLessThan(0.01);
      }
    }
  });

  it('the white sits inside the dark rim', () => {
    const area = (f) => Math.abs(f.reduce((s, [x, y], i) => s + x * f[(i + 1) % f.length][1] - f[(i + 1) % f.length][0] * y, 0)) / 2;
    expect(area(LOGO_BLANCO)).toBeLessThan(area(LOGO_EXTERIOR));
    expect(area(LOGO_BLANCO) / area(LOGO_EXTERIOR)).toBeGreaterThan(0.8);
  });

  it('the wall logo is where the photo has it and touches nothing else on the wall', () => {
    const { pared, puerta } = logos();
    const [x, y] = pared.centro;
    expect(Math.abs(x - (xDeFoto(882) + xDeFoto(997)) / 2)).toBeLessThan(0.1);
    const caja = { a: [x - pared.lado / 2, y - pared.lado / 2], b: [x + pared.lado / 2, y + pared.lado / 2] };
    expect(caja.a[0]).toBeGreaterThan(MEDIDAS.puerta.x[1] + 0.5); // clear of the flag's plaque
    expect(caja.b[0]).toBeLessThan(MEDIDAS.bloque.desde);
    const enLaPared = describirEscena().cajas.filter((c) => c.b[2] > 0 && c.b[2] < 0.05 && c.m !== 'celeste');
    for (const c of enLaPared) {
      const tapa = c.a[0] < caja.b[0] && c.b[0] > caja.a[0] && c.a[1] < caja.b[1] && c.b[1] > caja.a[1];
      expect(tapa).toBe(false);
    }
    // One sticker per leaf of the door, inside it.
    const p = MEDIDAS.puerta.parantes;
    expect(puerta).toHaveLength(p.length - 1);
    puerta.forEach(({ centro: [cx], lado }, i) => {
      expect(cx - lado / 2).toBeGreaterThan(p[i]);
      expect(cx + lado / 2).toBeLessThan(p[i + 1]);
    });
  });
});
