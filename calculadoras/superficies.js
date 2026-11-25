import { contorno } from './trazado.js';

// The surfaces of the 3D grapher, in plain numbers and in the coordinates of the exercise (the scene turns them into
// its own): the graph of z = f(x, y) and a surface by its two parameters, on a grid with its pen lines as El Santo
// Resumen draws them (its simulator core); the surface of an equation F(x, y, z) = 0, cut out of little tetrahedra; its
// traces, the cuts with planes parallel to the coordinate ones that the notes use to draw a quadric (parcial-1.md of
// Análisis Matemático II, «Superficies cuádricas»); and the level curves of f.

const finito = Number.isFinite;

/**
 * A grid of points joined in triangles, with a pen line every `cada` rows: { pos, idx, lineas }. Where the surface
 * ends inside the window (the rim of a half sphere), each square is cut at the last point that exists, found by
 * closing in on it, and the rim gets its own pen line: no saw teeth.
 */
function malla(punto, n, cada, salto = Infinity) {
  const lado = n + 1;
  const pos = new Array(lado * lado * 3).fill(0);
  const ok = new Uint8Array(lado * lado);
  const existe = (q) => finito(q[0]) && finito(q[1]) && finito(q[2]);
  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= n; j += 1) {
      const q = i * lado + j;
      const v = punto(i / n, j / n);
      if (existe(v)) {
        ok[q] = 1;
        [pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2]] = v;
      }
    }
  }
  const z = (q) => pos[q * 3 + 2];
  // Points of a face too far apart in height are the two sides of a jump, not a wall.
  const juntos = (...qs) => Math.max(...qs.map(z)) - Math.min(...qs.map(z)) <= salto;
  // The last point that exists on the side from grid point `bien` to grid point `mal`, as its number in `pos`.
  const orillas = new Map();
  const orilla = (bien, mal) => {
    const clave = bien * lado * lado + mal;
    if (orillas.has(clave)) return orillas.get(clave);
    let [u0, v0, u1, v1] = [Math.floor(bien / lado) / n, (bien % lado) / n, Math.floor(mal / lado) / n, (mal % lado) / n];
    let ultimo = null;
    for (let paso = 0; paso < 12; paso += 1) {
      const [um, vm] = [(u0 + u1) / 2, (v0 + v1) / 2];
      const q = punto(um, vm);
      if (existe(q)) {
        ultimo = q;
        [u0, v0] = [um, vm];
      } else [u1, v1] = [um, vm];
    }
    let numero = bien;
    if (ultimo) {
      numero = pos.length / 3;
      pos.push(...ultimo);
    }
    orillas.set(clave, numero);
    return numero;
  };
  const idx = [];
  const lineas = [];
  const raya = (q, r) => {
    if (q !== r) lineas.push(pos[q * 3], pos[q * 3 + 1], pos[q * 3 + 2], pos[r * 3], pos[r * 3 + 1], pos[r * 3 + 2]);
  };
  const cara = (q, r, t) => {
    if (q !== r && r !== t && q !== t && juntos(q, r, t)) idx.push(q, r, t);
  };
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j < n; j += 1) {
      const a = i * lado + j;
      // Around the square, turning from x to y: the faces look up.
      const vuelta = [a, a + lado, a + lado + 1, a + 1];
      const cuantos = vuelta.reduce((t, q) => t + ok[q], 0);
      if (cuantos === 4) {
        cara(vuelta[0], vuelta[1], vuelta[3]);
        cara(vuelta[3], vuelta[1], vuelta[2]);
      } else if (cuantos === 2 && ok[vuelta[0]] === ok[vuelta[2]]) {
        // Two opposite corners: a triangle at each one.
        for (const e of [0, 1, 2, 3]) {
          const q = vuelta[e];
          if (!ok[q]) continue;
          const [antes, despues] = [orilla(q, vuelta[(e + 3) % 4]), orilla(q, vuelta[(e + 1) % 4])];
          cara(q, despues, antes);
          raya(despues, antes);
        }
      } else if (cuantos > 0) {
        const poligono = [];
        const enOrilla = [];
        vuelta.forEach((q, e) => {
          const r = vuelta[(e + 1) % 4];
          if (ok[q]) {
            poligono.push(q);
            enOrilla.push(false);
          }
          if (ok[q] !== ok[r]) {
            poligono.push(ok[q] ? orilla(q, r) : orilla(r, q));
            enOrilla.push(true);
          }
        });
        for (let e = 1; e + 1 < poligono.length; e += 1) cara(poligono[0], poligono[e], poligono[e + 1]);
        poligono.forEach((q, e) => {
          const sig = (e + 1) % poligono.length;
          if (enOrilla[e] && enOrilla[sig]) raya(q, poligono[sig]);
        });
      }
    }
  }
  const unir = (q, r) => {
    if (ok[q] && ok[r]) {
      if (juntos(q, r)) raya(q, r);
    } else if (ok[q] || ok[r]) raya(ok[q] ? q : r, ok[q] ? orilla(q, r) : orilla(r, q));
  };
  for (let i = 0; i <= n; i += 1) {
    for (let j = 0; j <= n; j += 1) {
      const q = i * lado + j;
      if (i % cada === 0 && j < n) unir(q, q + 1);
      if (j % cada === 0 && i < n) unir(q, q + lado);
    }
  }
  return { pos: new Float32Array(pos), idx, lineas };
}

/** The graph of z = f(x, y) over the window. `salto`: the height that tells a jump from a steep face. */
export function mallaDeFuncion(f, X, Y, n = 48, cada = 4, salto = Infinity) {
  return malla(
    (u, v) => {
      const x = X[0] + (X[1] - X[0]) * u;
      const y = Y[0] + (Y[1] - Y[0]) * v;
      return [x, y, f(x, y)];
    },
    n,
    cada,
    salto,
  );
}

/** The surface (x(u, v), y(u, v), z(u, v)). */
export function mallaParametrica(fx, fy, fz, U, V, n = 48, cada = 4) {
  return malla(
    (s, t) => {
      const u = U[0] + (U[1] - U[0]) * s;
      const v = V[0] + (V[1] - V[0]) * t;
      return [fx(u, v), fy(u, v), fz(u, v)];
    },
    n,
    cada,
  );
}

// A cube in six tetrahedra around the diagonal from its corner 0 to its corner 6.
const ESQUINAS = [
  [0, 0, 0],
  [1, 0, 0],
  [1, 1, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 0, 1],
  [1, 1, 1],
  [0, 1, 1],
];
const TETRAEDROS = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
];

/**
 * The surface F(x, y, z) = 0 inside the box, in triangles that share their points: { pos, idx }. Each crossing is
 * found once per side, closing in on the change of sign, so a pole (where F doesn't shrink) leaves no wall.
 */
export function mallaImplicita(F, X, Y, Z, n = 34) {
  const lado = n + 1;
  const d = [(X[1] - X[0]) / n, (Y[1] - Y[0]) / n, (Z[1] - Z[0]) / n];
  const en = (i, j, k) => [X[0] + i * d[0], Y[0] + j * d[1], Z[0] + k * d[2]];
  const valores = new Float64Array(lado * lado * lado);
  for (let k = 0; k <= n; k += 1) {
    for (let j = 0; j <= n; j += 1) {
      for (let i = 0; i <= n; i += 1) valores[(k * lado + j) * lado + i] = F(...en(i, j, k));
    }
  }
  const pos = [];
  const idx = [];
  const cruces = new Map();
  // The point of the surface on the side from grid point a to grid point b, as its number in `pos`, or -1.
  const cruce = (a, b, pa, pb, fa, fb) => {
    const clave = a < b ? a * valores.length + b : b * valores.length + a;
    if (cruces.has(clave)) return cruces.get(clave);
    let [p, q, fp, fq] = [0, 1, fa, fb];
    let vale = true;
    for (let v = 0; v < 6 && vale; v += 1) {
      const m = (p + q) / 2;
      const fm = F(pa[0] + (pb[0] - pa[0]) * m, pa[1] + (pb[1] - pa[1]) * m, pa[2] + (pb[2] - pa[2]) * m);
      if (!finito(fm)) vale = false;
      else if ((fm < 0) === (fp < 0)) {
        p = m;
        fp = fm;
      } else {
        q = m;
        fq = fm;
      }
    }
    if (vale && Math.abs(fp) + Math.abs(fq) > 0.5 * (Math.abs(fa) + Math.abs(fb))) vale = false;
    let numero = -1;
    if (vale) {
      const t = fp === fq ? p : p + ((q - p) * fp) / (fp - fq);
      numero = pos.length / 3;
      pos.push(pa[0] + (pb[0] - pa[0]) * t, pa[1] + (pb[1] - pa[1]) * t, pa[2] + (pb[2] - pa[2]) * t);
    }
    cruces.set(clave, numero);
    return numero;
  };
  // A triangle, turned so that it looks out of the side where F is positive: the shading needs them all alike.
  const cara = (a, b, c, hacia) => {
    if (a < 0 || b < 0 || c < 0) return;
    const [ax, ay, az] = [pos[a * 3], pos[a * 3 + 1], pos[a * 3 + 2]];
    const u = [pos[b * 3] - ax, pos[b * 3 + 1] - ay, pos[b * 3 + 2] - az];
    const w = [pos[c * 3] - ax, pos[c * 3 + 1] - ay, pos[c * 3 + 2] - az];
    const nx = u[1] * w[2] - u[2] * w[1];
    const ny = u[2] * w[0] - u[0] * w[2];
    const nz = u[0] * w[1] - u[1] * w[0];
    if (nx * hacia[0] + ny * hacia[1] + nz * hacia[2] >= 0) idx.push(a, b, c);
    else idx.push(a, c, b);
  };
  const ids = new Array(8);
  const pts = new Array(8);
  const fs = new Array(8);
  for (let k = 0; k < n; k += 1) {
    for (let j = 0; j < n; j += 1) {
      for (let i = 0; i < n; i += 1) {
        let negativos = 0;
        let entero = true;
        for (let e = 0; e < 8; e += 1) {
          const [a, b, c] = ESQUINAS[e];
          ids[e] = ((k + c) * lado + j + b) * lado + i + a;
          fs[e] = valores[ids[e]];
          if (!finito(fs[e])) entero = false;
          else if (fs[e] < 0) negativos += 1;
        }
        if (!entero || negativos === 0 || negativos === 8) continue;
        for (let e = 0; e < 8; e += 1) pts[e] = en(i + ESQUINAS[e][0], j + ESQUINAS[e][1], k + ESQUINAS[e][2]);
        for (const t of TETRAEDROS) {
          const dentro = t.filter((e) => fs[e] < 0);
          const fuera = t.filter((e) => fs[e] >= 0);
          if (!dentro.length || !fuera.length) continue;
          const medio = (lista) => lista.reduce((s, e) => [s[0] + pts[e][0] / lista.length, s[1] + pts[e][1] / lista.length, s[2] + pts[e][2] / lista.length], [0, 0, 0]);
          const [de, a] = [medio(dentro), medio(fuera)];
          const hacia = [a[0] - de[0], a[1] - de[1], a[2] - de[2]];
          const x = (p, q) => cruce(ids[p], ids[q], pts[p], pts[q], fs[p], fs[q]);
          if (dentro.length === 1 || fuera.length === 1) {
            const [solo, otros] = dentro.length === 1 ? [dentro[0], fuera] : [fuera[0], dentro];
            cara(x(solo, otros[0]), x(solo, otros[1]), x(solo, otros[2]), hacia);
          } else {
            const [p, q] = dentro;
            const [r, s] = fuera;
            const [c1, c2, c3, c4] = [x(p, r), x(p, s), x(q, s), x(q, r)];
            cara(c1, c2, c3, hacia);
            cara(c1, c3, c4, hacia);
          }
        }
      }
    }
  }
  return { pos: new Float32Array(pos), idx };
}

/**
 * The traces of F(x, y, z) = 0: its cuts with `cuantas` planes parallel to each coordinate plane, as lines of points
 * [x, y, z].
 */
export function trazasDe(F, X, Y, Z, cuantas = 5, n = 48) {
  const lineas = [];
  for (let c = 1; c <= cuantas; c += 1) {
    const t = c / (cuantas + 1);
    const [x, y, z] = [X[0] + (X[1] - X[0]) * t, Y[0] + (Y[1] - Y[0]) * t, Z[0] + (Z[1] - Z[0]) * t];
    for (const l of contorno((a, b) => F(a, b, z), X, Y, n, n)) lineas.push(l.map(([a, b]) => [a, b, z]));
    for (const l of contorno((a, b) => F(a, y, b), X, Z, n, n)) lineas.push(l.map(([a, b]) => [a, y, b]));
    for (const l of contorno((a, b) => F(x, a, b), Y, Z, n, n)) lineas.push(l.map(([a, b]) => [x, a, b]));
  }
  return lineas;
}

/** The level curve f(x, y) = k inside the window, as lines of points [x, y]. Also where f reaches k right at the edge of its domain. */
export const curvaDeNivel = (f, X, Y, k, n = 110) => contorno((x, y) => f(x, y) - k, X, Y, n, n, true);
