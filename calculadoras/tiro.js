// Tiro oblicuo, of Física I: a body thrown with v₀ at φ over the horizontal from a height y₀, without air. The two
// movements apart (uniform in x, uniformly varied in y), the highest point, the time of flight, the reach, the velocity
// on arrival and where it is at an instant t. Notation and formulas: parcial-1.md of El Santo Resumen («Cinemática -
// resumen», págs. 4 y 5, and the «Teoría Ampliada» de Movimiento de Proyectiles, págs. 1 y 2).
import { leerNumero } from '../formulas/decimales.js';

const RAD = Math.PI / 180;
const fallo = (campo, texto) => ({ error: { campo, texto } });

function numero(texto, nombre, campo, { vacio } = {}) {
  if (vacio !== undefined && !String(texto ?? '').trim()) return { v: vacio };
  const r = leerNumero(texto, nombre);
  return r.error ? fallo(campo, r.error) : r;
}

/**
 * d: { v0, phi (degrees), y0 (empty is 0), g, t (optional) }. Gives { error: { campo, texto } } or every number of
 * the throw, with the ground at y = 0 when it gets there.
 */
export function tiro(d) {
  const leidos = {};
  const pedidos = [
    ['v0', 'v₀'],
    ['phi', 'φ'],
    ['y0', 'y₀', { vacio: 0 }],
    ['g', 'g'],
    ['t', 't', { vacio: null }],
  ];
  for (const [campo, nombre, op] of pedidos) {
    const r = numero(d[campo], nombre, campo, op);
    if (r.error) return r;
    leidos[campo] = r.v;
  }
  const { v0, phi, y0, g, t } = leidos;
  if (!(v0 > 0)) return fallo('v0', 'v₀ tiene que ser mayor que 0.');
  if (v0 > 1e5) return fallo('v0', 'v₀ va hasta 100000 m/s.');
  if (phi < -90 || phi > 90) return fallo('phi', 'φ va de −90° a 90°, medido sobre la horizontal.');
  if (y0 < 0) return fallo('y0', 'y₀ es la altura de salida sobre el suelo. No puede ser negativa.');
  if (y0 > 1e6) return fallo('y0', 'y₀ va hasta 1000000 m.');
  if (!(g > 0) || g > 1000) return fallo('g', 'g tiene que ser mayor que 0.');
  if (t !== null && t < 0) return fallo('t', 't no puede ser negativo.');
  if (t !== null && t > 1e5) return fallo('t', 't va hasta 100000 s.');

  // v₀ₓ = v₀·cos φ, v₀ᵧ = v₀·sen φ («Teoría Ampliada», pág. 2). Straight up or down, cos φ is 0 on paper.
  const vx = Math.abs(phi) === 90 ? 0 : v0 * Math.cos(phi * RAD);
  const vy = v0 * Math.sin(phi * RAD);
  const sube = vy > 1e-12;
  // Thrown flat or down from the ground it never flies: without y₀ there's no ground to reach, only the instant t.
  const conSuelo = y0 > 0 || sube;
  if (!conSuelo && t === null) return fallo('y0', 'Así, desde el suelo, no vuela. Falta la altura y₀ o un instante t.');

  const ts = sube ? vy / g : 0;
  const hmax = sube ? (vy * vy) / (2 * g) : 0;
  const tv = conSuelo ? (y0 === 0 ? (2 * vy) / g : (vy + Math.sqrt(vy * vy + 2 * g * y0)) / g) : null;
  const alcance = conSuelo ? vx * tv : null;
  const v1y = conSuelo ? vy - g * tv : null;

  const en = (tt) => {
    const vyt = vy - g * tt;
    const dy = vy * tt - 0.5 * g * tt * tt;
    return { t: tt, x: vx * tt, y: y0 + dy, dy, vy: vyt, v: Math.hypot(vx, vyt), phi: Math.atan2(vyt, vx) / RAD };
  };

  return {
    v0,
    phi,
    y0,
    g,
    vx,
    vy,
    sube,
    conSuelo,
    ts,
    hmax,
    tv,
    d: alcance,
    llegada: conSuelo ? { vx, vy: v1y, v: Math.hypot(vx, v1y), phi: Math.atan2(v1y, vx) / RAD } : null,
    t,
    punto: t === null || (conSuelo && t > tv + 1e-9) ? null : en(t),
    tarde: t !== null && conSuelo && t > tv + 1e-9,
    // y = y₀ + (v₀ᵧ/v₀ₓ)·x − g/(2·v₀ₓ²)·x² («Cinemática - resumen», pág. 4).
    trayectoria: vx > 1e-12 ? { b: vy / vx, c: g / (2 * vx * vx) } : null,
    en,
  };
}
