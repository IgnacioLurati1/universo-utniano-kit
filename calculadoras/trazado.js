// What the graphers need to draw from a formula, in plain numbers: the stretches of y = f(x) cut at its jumps and at the
// edges of its domain, a curve given by its parameter, the curve F(x, y) = 0 of an equation, and the numeric pieces the
// study of a function uses (a root between two points, an integral). The sampling of y = f(x) is El Santo Resumen's
// (its simulator core): a jump survives halving the interval, a steep but continuous stretch doesn't.

const finito = Number.isFinite;

/** The root of f between a and b, where it changes sign. */
export function biseccion(f, a, b, vueltas = 70) {
  let [x0, x1] = [a, b];
  let y0 = f(x0);
  for (let k = 0; k < vueltas; k += 1) {
    const m = (x0 + x1) / 2;
    const ym = f(m);
    if (!finito(ym)) return m;
    if (ym === 0) return m;
    if (Math.sign(ym) === Math.sign(y0)) {
      x0 = m;
      y0 = ym;
    } else x1 = m;
  }
  return (x0 + x1) / 2;
}

/** The last x, walking from `bien` (where f gives a number) towards `mal` (where it doesn't), that still gives one. */
export function borde(f, bien, mal) {
  let [a, b] = [bien, mal];
  for (let k = 0; k < 60; k += 1) {
    const m = (a + b) / 2;
    if (finito(f(m))) a = m;
    else b = m;
  }
  return a;
}

/** Whether f jumps between a and b: { a, ya, b, yb } with both sides of the jump, or null if it's only steep. */
export function salto(f, a0, b0, ya0, yb0) {
  let [a, b, ya, yb] = [a0, b0, ya0, yb0];
  const d0 = Math.abs(yb0 - ya0);
  for (let k = 0; k < 40; k += 1) {
    const m = (a + b) / 2;
    if (m === a || m === b) break;
    const ym = f(m);
    if (!finito(ym)) return { a, ya, b, yb };
    if (Math.abs(ym - ya) >= Math.abs(yb - ym)) {
      b = m;
      yb = ym;
    } else {
      a = m;
      ya = ym;
    }
  }
  return Math.abs(yb - ya) > d0 * 0.5 ? { a, ya, b, yb } : null;
}

/**
 * The stretches of y = f(x) on [a, b], each a list of [x, y]: cut where f isn't defined (reaching its true edge) and
 * where it jumps. `escY`: how many units of drawing a unit of y is, to tell a jump worth checking.
 */
export function tramosDe(f, a, b, n = 480, escY = 1) {
  const tramos = [];
  let act = null;
  let xp = a;
  let yp = f(a);
  if (finito(yp)) act = [[xp, yp]];
  for (let i = 1; i <= n; i += 1) {
    const x = a + ((b - a) * i) / n;
    const y = f(x);
    const antes = finito(yp);
    const ahora = finito(y);
    if (antes && ahora) {
      if (Math.abs(y - yp) * escY > 8) {
        const s = salto(f, xp, x, yp, y);
        if (s) {
          act.push([s.a, s.ya]);
          tramos.push(act);
          act = [[s.b, s.yb]];
        }
      }
      act.push([x, y]);
    } else if (antes) {
      const e = borde(f, xp, x);
      act.push([e, f(e)]);
      tramos.push(act);
      act = null;
    } else if (ahora) {
      const e = borde(f, x, xp);
      act = [
        [e, f(e)],
        [x, y],
      ];
    }
    xp = x;
    yp = y;
  }
  if (act) tramos.push(act);
  return tramos.filter((t) => t.length > 1);
}

/** The stretches of the curve (x(t), y(t)) for t in [t0, t1], cut where it isn't defined or flies away. */
export function tramosDeCurva(fx, fy, t0, t1, n = 480, lejos = Infinity) {
  const tramos = [];
  let act = null;
  let previo = null;
  for (let i = 0; i <= n; i += 1) {
    const t = t0 + ((t1 - t0) * i) / n;
    const x = fx(t);
    const y = fy(t);
    if (!finito(x) || !finito(y)) {
      if (act) tramos.push(act);
      act = null;
      previo = null;
      continue;
    }
    if (previo && Math.hypot(x - previo[0], y - previo[1]) > lejos) {
      tramos.push(act);
      act = null;
    }
    if (!act) act = [];
    act.push([x, y]);
    previo = [x, y];
  }
  if (act) tramos.push(act);
  return tramos.filter((t) => t.length > 1);
}

/**
 * The curve F(x, y) = 0 inside the window, as lines of points [x, y] (marching squares on a grid of nx by ny cells,
 * the crossings of each side found once and then joined). A change of sign across a pole or a jump isn't the curve:
 * halving the side closes in on it, and at a root F shrinks on both sides while at a pole it doesn't.
 */
export function contorno(F, [x0, x1], [y0, y1], nx = 120, ny = 120, orilla = false) {
  const dx = (x1 - x0) / nx;
  const dy = (y1 - y0) / ny;
  const v = new Float64Array((nx + 1) * (ny + 1));
  for (let j = 0; j <= ny; j += 1) {
    for (let i = 0; i <= nx; i += 1) v[j * (nx + 1) + i] = F(x0 + i * dx, y0 + j * dy);
  }
  // With `orilla`, a grid point where F doesn't exist, next to one where it does, takes the other sign: if F goes to
  // 0 on the way to the edge of its domain (the rim of a half sphere at its level 0), the line runs along that edge.
  let w = v;
  let falso = null;
  let tolerancia = 0;
  if (orilla) {
    w = Float64Array.from(v);
    falso = new Uint8Array(v.length);
    for (let j = 0; j <= ny; j += 1) {
      for (let i = 0; i <= nx; i += 1) {
        const q = j * (nx + 1) + i;
        if (finito(v[q])) {
          tolerancia = Math.max(tolerancia, Math.abs(v[q]) * 1e-3);
          continue;
        }
        // Any of the eight around it: every corner of a square the rim crosses gets its sign.
        let real;
        for (let b = -1; b <= 1 && real === undefined; b += 1) {
          for (let a = -1; a <= 1 && real === undefined; a += 1) {
            if (i + a < 0 || i + a > nx || j + b < 0 || j + b > ny) continue;
            if (finito(v[q + b * (nx + 1) + a])) real = q + b * (nx + 1) + a;
          }
        }
        if (real === undefined) continue;
        w[q] = v[real] < 0 ? 1e-300 : -1e-300;
        falso[q] = 1;
      }
    }
  }
  const cruce = (xa, ya, fa, xb, yb, fb, falsoA = false, falsoB = false) => {
    if ((fa < 0) === (fb < 0) || (falsoA && falsoB)) return null;
    let [p, q, fp, fq, falsoP, falsoQ] = [0, 1, fa, fb, falsoA, falsoB];
    const enOrilla = falsoA || falsoB;
    for (let k = 0; k < (enOrilla ? 36 : 10); k += 1) {
      const m = (p + q) / 2;
      const fm = F(xa + (xb - xa) * m, ya + (yb - ya) * m);
      if (!finito(fm)) {
        // Still outside the domain: the end that stands for it comes closer.
        if (falsoP) p = m;
        else if (falsoQ) q = m;
        else return null;
      } else if ((fm < 0) === (fp < 0)) {
        p = m;
        fp = fm;
        falsoP = false;
      } else {
        q = m;
        fq = fm;
        falsoQ = false;
      }
    }
    if (falsoP || falsoQ) {
      if (Math.abs(falsoP ? fq : fp) > tolerancia) return null;
      const t = falsoP ? q : p;
      return [xa + (xb - xa) * t, ya + (yb - ya) * t];
    }
    if (Math.abs(fp) + Math.abs(fq) > 0.5 * (Math.abs(fa) + Math.abs(fb))) return null;
    const t = fp === fq ? p : p + ((q - p) * fp) / (fp - fq);
    return [xa + (xb - xa) * t, ya + (yb - ya) * t];
  };
  // Each side of the grid has its number: the horizontal ones first, then the vertical ones.
  const horizontales = nx * (ny + 1);
  const puntos = new Map();
  const lado = (id, i, j, vertical) => {
    if (puntos.has(id)) return puntos.get(id);
    const qa = j * (nx + 1) + i;
    const qb = vertical ? qa + nx + 1 : qa + 1;
    const [a, b] = [w[qa], w[qb]];
    const xa = x0 + i * dx;
    const ya = y0 + j * dy;
    const p = finito(a) && finito(b) ? cruce(xa, ya, a, vertical ? xa : xa + dx, vertical ? ya + dy : ya, b, Boolean(falso?.[qa]), Boolean(falso?.[qb])) : null;
    puntos.set(id, p);
    return p;
  };
  const vecinos = new Map();
  const unir = (p, q) => {
    for (const [a, b] of [
      [p, q],
      [q, p],
    ]) {
      if (!vecinos.has(a)) vecinos.set(a, []);
      vecinos.get(a).push(b);
    }
  };
  for (let j = 0; j < ny; j += 1) {
    for (let i = 0; i < nx; i += 1) {
      const q = j * (nx + 1) + i;
      const [a, b, c, d] = [w[q], w[q + 1], w[q + nx + 2], w[q + nx + 1]];
      if (!finito(a) || !finito(b) || !finito(c) || !finito(d)) continue;
      const neg = (a < 0) + (b < 0) + (c < 0) + (d < 0);
      if (neg === 0 || neg === 4) continue;
      // Below, right, above and left.
      const ids = [j * nx + i, horizontales + j * (nx + 1) + i + 1, (j + 1) * nx + i, horizontales + j * (nx + 1) + i];
      const hay = [lado(ids[0], i, j, false), lado(ids[1], i + 1, j, true), lado(ids[2], i, j + 1, false), lado(ids[3], i, j, true)];
      const con = ids.filter((_, k) => hay[k]);
      if (con.length === 2) unir(con[0], con[1]);
      else if (con.length === 4) {
        // A saddle: the centre says which corners go together.
        const junta = (F(x0 + (i + 0.5) * dx, y0 + (j + 0.5) * dy) < 0) === (a < 0);
        if (junta) {
          unir(ids[0], ids[1]);
          unir(ids[2], ids[3]);
        } else {
          unir(ids[3], ids[0]);
          unir(ids[1], ids[2]);
        }
      }
    }
  }
  // Walk each line from one of its ends (or from anywhere, when it closes on itself).
  const lineas = [];
  const usado = new Set();
  const clave = (p, q) => (p < q ? `${p}-${q}` : `${q}-${p}`);
  const andar = (inicio) => {
    const camino = [inicio];
    let actual = inicio;
    for (;;) {
      const sigue = vecinos.get(actual).find((s) => !usado.has(clave(actual, s)));
      if (sigue === undefined) break;
      usado.add(clave(actual, sigue));
      camino.push(sigue);
      actual = sigue;
    }
    if (camino.length > 1) lineas.push(camino.map((id) => puntos.get(id)));
  };
  for (const [id, lista] of vecinos) if (lista.length === 1) andar(id);
  for (const id of vecinos.keys()) andar(id);
  return lineas;
}

/** The integral of f on [a, b] by Simpson's rule. NaN if f isn't defined somewhere in between. */
export function integral(f, a, b, n = 400) {
  const m = n + (n % 2);
  const h = (b - a) / m;
  let s = f(a) + f(b);
  for (let i = 1; i < m; i += 1) s += f(a + i * h) * (i % 2 ? 4 : 2);
  return finito(s) ? (s * h) / 3 : NaN;
}

/** A number without the dust of the arithmetic: 1,9999999997 is 2 and 3e−13 is 0. */
export function limpio(x, cifras = 9) {
  if (!finito(x)) return x;
  const r = Number(x.toPrecision(cifras));
  return Math.abs(r) < 10 ** -cifras ? 0 : r;
}
