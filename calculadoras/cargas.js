// Campo de dos cargas, of Física II: point charges in the plane (two, and a third when the problem brings it), the field
// of each one at P and their vector sum, the potential at P as a sum of numbers, the force on a charge q₀ put at P and
// Coulomb's force between q₁ and q₂. Formulas, k and examples: El Santo Resumen
// (Teoría 2025 (001), (002) and (004); 1° parcial 18/06/2025).
import { leerPunto } from './campo.js';
import { leerNumero } from '../formulas/decimales.js';

/** K = 9.10⁹ N m²/C², as the notes use it (Teoría 2025 (001), página 16). */
export const K = 9e9;

export const UNIDADES = { micro: { factor: 1e-6, texto: 'µC' }, nano: { factor: 1e-9, texto: 'nC' }, C: { factor: 1, texto: 'C' } };

const fallo = (campo, texto) => ({ error: { campo, texto } });
const vacio = (t) => !String(t ?? '').trim();
const NOMBRES = ['q₁', 'q₂', 'q₃'];

/**
 * d: { unidad: 'micro' | 'nano' | 'C', q1, p1, q2, p2, q3, p3 (the third may be empty), P, q0 (in C, optional) }.
 * Positions as «x; y», in m. Gives { error: { campo, texto } } or the whole resolution.
 */
export function cargas(d) {
  const unidad = UNIDADES[d.unidad] ?? UNIDADES.micro;
  const lista = [];
  for (let i = 0; i < 3; i += 1) {
    const q = d[`q${i + 1}`];
    const p = d[`p${i + 1}`];
    if (i === 2 && vacio(q) && vacio(p)) break;
    const r = leerNumero(q, NOMBRES[i]);
    if (r.error) return fallo(`q${i + 1}`, r.error);
    const pos = leerPunto(p, 2, `la posición de ${NOMBRES[i]}`);
    if (pos.error) return fallo(`p${i + 1}`, pos.error);
    lista.push({ i, nombre: NOMBRES[i], dato: r.v, q: r.v * unidad.factor, x: pos.v[0], y: pos.v[1] });
  }
  for (let a = 0; a < lista.length; a += 1) {
    for (let b = a + 1; b < lista.length; b += 1) {
      if (Math.hypot(lista[a].x - lista[b].x, lista[a].y - lista[b].y) < 1e-12) {
        return fallo(`p${b + 1}`, `${lista[b].nombre} está en el mismo lugar que ${lista[a].nombre}.`);
      }
    }
  }
  const P = leerPunto(d.P, 2, 'P');
  if (P.error) return fallo('P', P.error);
  const [px, py] = P.v;
  const encima = lista.find((c) => Math.hypot(px - c.x, py - c.y) < 1e-12);
  if (encima) return fallo('P', `P cae justo sobre ${encima.nombre}. Ahí el campo no está definido.`);
  let q0 = null;
  if (!vacio(d.q0)) {
    const r = leerNumero(d.q0, 'q₀');
    if (r.error) return fallo('q0', r.error);
    q0 = r.v;
  }

  // Each charge at P: E = k·|q|/r², away from a positive charge and toward a negative one; V = k·q/r with its sign.
  const campos = lista.map((c) => {
    const dx = px - c.x;
    const dy = py - c.y;
    const r = Math.hypot(dx, dy);
    const E = (K * Math.abs(c.q)) / (r * r);
    const signo = Math.sign(c.q);
    return { ...c, dx, dy, r, E, Ex: (signo * E * dx) / r, Ey: (signo * E * dy) / r, V: (K * c.q) / r };
  });
  const Ex = campos.reduce((s, c) => s + c.Ex, 0);
  const Ey = campos.reduce((s, c) => s + c.Ey, 0);
  const E = Math.hypot(Ex, Ey);
  const V = campos.reduce((s, c) => s + c.V, 0);
  const fuerza = q0 === null ? null : { q0, Fx: q0 * Ex, Fy: q0 * Ey, F: Math.abs(q0) * E };

  // Coulomb between q₁ and q₂ (Teoría 2025 (001), páginas 16 y 17).
  const [c1, c2] = lista;
  const r12 = Math.hypot(c2.x - c1.x, c2.y - c1.y);
  const coulomb = { r: r12, F: (K * Math.abs(c1.q) * Math.abs(c2.q)) / (r12 * r12), atraen: c1.q * c2.q < 0, nula: c1.q * c2.q === 0 };

  return {
    unidad,
    cargas: campos,
    P: P.v,
    Ex,
    Ey,
    E,
    angulo: (Math.atan2(Ey, Ex) * 180) / Math.PI,
    V,
    fuerza,
    coulomb,
    /** The total field at any point, for the arrows of the drawing. */
    campoEn: (x, y) =>
      lista.reduce(
        ([sx, sy], c) => {
          const dx = x - c.x;
          const dy = y - c.y;
          const r3 = Math.hypot(dx, dy) ** 3;
          return [sx + (K * c.q * dx) / r3, sy + (K * c.q * dy) / r3];
        },
        [0, 0],
      ),
  };
}
