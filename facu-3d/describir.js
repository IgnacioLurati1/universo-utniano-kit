// The faculty's entrance (UTN FRRO, Zeballos 1341) as data: every piece in metres, with no three.js, so the tests can
// check it. escena.js turns it into meshes.
//
// Axes: X runs along the front, to the right as seen from the street. Y goes up from the sidewalk. Z comes out of the
// wall towards the street. The face of the wall is Z = 0 and the sidewalk's top is Y = 0.
//
// Source: one photo from across the street, 1360 × 1020 px, taken from the right and a little below the sign, so the
// front recedes to the left. Measured in pixels and turned into metres with a scale that grows to the right:
//   s(x) = 64.4 + 0.0492·x px/m, the ground line at y = 730 + 0.033·x px.
// Two known sizes fix it: the glass door with its transom is 2.5 m (230 px at x = 560) and the blue block on the right
// measures the same at both of its ends (520 px at x = 770, 605 px at x = 1110). A horizontal pixel becomes
// X = ln(s(x) / 64.4) / 0.0492. The tilt of the camera bends the verticals: heights measured at both ends of the same
// line differ up to 12 %, so they're averaged and rounded to 5 cm. Railings and tree stand closer than the wall: their
// pixels are shrunk by 1.25 towards x = 900, where the camera was. Error of the fit: about 10 %.
// The logos are traced from the photo too (logo.js); the sign's lettering is the photo's, without accents like there.

/** Pixel to metre, from the fit above. Exported for the tests. */
export const ESCALA = { a: 64.4, b: 0.0492, suelo: 730, inclinacion: 0.033 };
export const xDeFoto = (px) => Math.log((ESCALA.a + ESCALA.b * px) / ESCALA.a) / ESCALA.b;
export const yDeFoto = (px, py) => (ESCALA.suelo + ESCALA.inclinacion * px - py) / (ESCALA.a + ESCALA.b * px);

/** What the photo shows, in metres. Everything else hangs from these. */
export const MEDIDAS = {
  frente: { desde: -9, hasta: 21 },
  planta: 5.2, // top of the blue ground floor
  faja: [5.2, 5.85], // the white band over it
  alto: 14.6, // roof parapet
  // Left: two tall windows split by a white sill, between blue pilasters. Repeated to the left, out of the photo.
  ventanas: [
    [-6.3, -4.35],
    [-4.2, -2.2],
    [-2.05, 0.08],
    [0.23, 2.2],
    [2.35, 4.43],
  ],
  ventanaY: [1.3, 4.85],
  repisa: [2.85, 3.05],
  // Centre: the glass entrance, the sign over it and two rows of windows up to the band.
  puerta: { x: [4.75, 9.41], y: [0.12, 2.65], parantes: [4.75, 5.62, 6.5, 7.5, 8.5, 9.41] },
  escalon: 0.12,
  cartel: { x: [4.6, 9.46], y: [2.75, 3.6], saliente: 0.2 },
  vidriera: { x: [4.75, 9.41], y: [3.7, 5.15], columnas: 6, filas: 2 },
  // Right: the blue block, a little forward from X = 12.35, with a barred window, a vent and a door at the end.
  bloque: { desde: 12.35, saliente: 0.12 },
  reja: { x: [12.5, 14.75], y: [3.1, 5.0], barrotes: 15 },
  rejilla: { x: [12.75, 14.1], y: [0.48, 1.37], tablillas: 9 },
  portonLateral: { x: [15.2, 16.4], y: [0, 2.4], fondo: 0.5 },
  // Upper floors: ribbon windows on white, like the top of the photo.
  pisos: [
    [6.4, 8.3],
    [9.5, 11.4],
    [12.6, 13.9],
  ],
  // Sidewalk, curb and the cobbled street.
  vereda: 3.0,
  cordon: 0.15,
  calle: 8.5, // Zeballos: one lane and parking, then the opposite sidewalk
  // Yellow railings by the curb, in front of the door, with a gap to walk through.
  barandas: [
    { x: [4.6, 7.0], medio: 5.8, z: 2.35, chapa: null },
    { x: [7.6, 10.3], medio: 9.0, z: 2.35, chapa: [7.75, 8.85] },
  ],
  baranda: { alto: 1.0, travesano: 0.5, radio: 0.024 },
  arbol: { x: 3.55, z: 2.55, alto: 9.2 },
  mastil: { base: [9.85, 3.0, 0.02], punta: [9.55, 4.75, 1.35], bandera: 1.1, desde: 0.72 },
  luces: [
    [4.6, 5.55],
    [12.05, 5.6],
  ],
  // UTN logos: painted on the wall right of the door (pixels 882–997 × 435–548), frosted stickers on the five
  // leaves of the door (pixels 365–745 × 600–645), and two white ones at the ends of the sign.
  logos: { pared: { centro: [10.97, 2.45], lado: 1.04 }, puerta: { y: 1.37, lado: 0.46 } },
  letrero: { lineas: ['UNIVERSIDAD TECNOLOGICA NACIONAL', 'Facultad Regional Rosario'] },
};

/** Where each logo goes: centre (x, y, z of the face it sits on) and side, in metres. */
export function logos(M = MEDIDAS) {
  const { pared, puerta } = M.logos;
  const p = M.puerta.parantes;
  return {
    pared: { centro: [pared.centro[0], pared.centro[1], 0], lado: pared.lado },
    puerta: p.slice(0, -1).map((x, i) => ({ centro: [(x + p[i + 1]) / 2, puerta.y, -0.18], lado: puerta.lado })),
  };
}

// ---------- Pieces ----------
const caja = (m, a, b, extra) => ({ tipo: 'caja', m, a, b, ...extra });

/** A small deterministic random, so the tree and the cobbles come out the same on every visit. */
export function azar(semilla = 1) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The wall: blue below, white band, white floors with ribbon windows. Openings are left as gaps between boxes. */
function fachada(M) {
  const p = [];
  const { desde, hasta } = M.frente;
  const prof = -0.4;
  const [y0, y1] = M.ventanaY;

  // Left part, up to the entrance.
  const izq = M.puerta.x[0];
  p.push(caja('celeste', [desde, 0, prof], [izq, y0, 0])); // under the windows
  p.push(caja('celeste', [desde, y1, prof], [izq, M.planta, 0])); // over them
  let antes = desde;
  for (const [a, b] of M.ventanas) {
    p.push(caja('celeste', [antes, y0, prof], [a, y1, 0])); // pilaster
    p.push(caja('vidrio', [a, y0, prof], [b, y1, -0.14]));
    p.push(caja('blanco', [a, M.repisa[0], -0.14], [b, M.repisa[1], -0.03])); // the white sill
    const medio = (a + b) / 2;
    p.push(caja('marco', [medio - 0.03, y0, -0.14], [medio + 0.03, y1, -0.1]));
    for (const x of [a, b]) p.push(caja('marco', [x - (x === a ? 0 : 0.05), y0, -0.14], [x + (x === a ? 0.05 : 0), y1, -0.1]));
    antes = b;
  }
  p.push(caja('celeste', [antes, y0, prof], [izq, y1, 0]));

  // Centre: door, sign and the windows over it.
  const [dx0, dx1] = M.puerta.x;
  const [dy0, dy1] = M.puerta.y;
  p.push(caja('piedra', [dx0, 0, -0.3], [dx1, M.escalon, 0.32]));
  p.push(caja('vidrio', [dx0, dy0, -0.35], [dx1, dy1, -0.18], { interior: true }));
  for (const x of M.puerta.parantes) p.push(caja('aluminio', [x - 0.035, dy0, -0.18], [x + 0.035, dy1, -0.12]));
  p.push(caja('aluminio', [dx0, dy1 - 0.17, -0.18], [dx1, dy1, -0.1])); // transom
  p.push(caja('aluminio', [dx0, dy0, -0.18], [dx1, dy0 + 0.06, -0.12]));
  p.push(caja('celeste', [dx0, dy1, prof], [dx1, M.vidriera.y[0], 0])); // lintel, behind the sign
  const { x: cx, y: cy, saliente } = M.cartel;
  p.push(caja('cartel', [cx[0], cy[0], 0], [cx[1], cy[1], saliente], { luz: true }));
  const v = M.vidriera;
  p.push(caja('vidrio', [v.x[0], v.y[0], prof], [v.x[1], v.y[1], -0.12]));
  for (let i = 0; i <= v.columnas; i++) {
    const x = v.x[0] + ((v.x[1] - v.x[0]) * i) / v.columnas;
    p.push(caja('marco', [x - 0.04, v.y[0], -0.12], [x + 0.04, v.y[1], -0.06]));
  }
  for (let j = 0; j <= v.filas; j++) {
    const y = v.y[0] + ((v.y[1] - v.y[0]) * j) / v.filas;
    p.push(caja('marco', [v.x[0], y - 0.04, -0.12], [v.x[1], y + 0.04, -0.06]));
  }
  p.push(caja('celeste', [dx0, v.y[1], prof], [dx1, M.planta, 0]));

  // Right block.
  const b = M.bloque;
  p.push(caja('celeste', [dx1, 0, prof], [b.desde, M.planta, 0]));
  const r = M.reja;
  const rj = M.rejilla;
  const pl = M.portonLateral;
  const z = b.saliente;
  p.push(caja('celeste', [b.desde, 0, prof], [pl.x[0], rj.y[0], z]));
  p.push(caja('celeste', [b.desde, rj.y[0], prof], [rj.x[0], r.y[0], z]));
  p.push(caja('celeste', [rj.x[1], rj.y[0], prof], [pl.x[0], r.y[0], z]));
  p.push(caja('celeste', [rj.x[0], rj.y[1], prof], [rj.x[1], r.y[0], z]));
  p.push(caja('oscuro', [rj.x[0], rj.y[0], prof], [rj.x[1], rj.y[1], z - 0.1]));
  for (let i = 0; i < rj.tablillas; i++) {
    const y = rj.y[0] + ((rj.y[1] - rj.y[0]) * (i + 0.5)) / rj.tablillas;
    p.push(caja('chapa', [rj.x[0], y - 0.03, z - 0.1], [rj.x[1], y + 0.03, z - 0.02], { inclinar: 0.5 }));
  }
  p.push(caja('celeste', [b.desde, r.y[0], prof], [r.x[0], M.planta, z]));
  p.push(caja('celeste', [r.x[1], r.y[0], prof], [pl.x[0], M.planta, z]));
  p.push(caja('celeste', [r.x[0], r.y[1], prof], [r.x[1], M.planta, z]));
  p.push(caja('vidrio', [r.x[0], r.y[0], prof], [r.x[1], r.y[1], -0.05]));
  for (let i = 0; i < 4; i++) {
    const x = r.x[0] + ((r.x[1] - r.x[0]) * (i + 0.5)) / 4;
    p.push(caja('marco', [x - 0.03, r.y[0], -0.05], [x + 0.03, r.y[1], 0]));
  }
  const paso = (r.x[1] - r.x[0]) / (r.barrotes + 1);
  for (let i = 1; i <= r.barrotes; i++) {
    const x = r.x[0] + paso * i;
    p.push(caja('reja', [x - 0.012, r.y[0], z + 0.02], [x + 0.012, r.y[1], z + 0.044]));
  }
  for (const y of [r.y[0] + 0.06, (r.y[0] + r.y[1]) / 2, r.y[1] - 0.06]) {
    p.push(caja('reja', [r.x[0], y - 0.02, z], [r.x[1], y + 0.02, z + 0.07]));
  }
  p.push(caja('oscuro', [pl.x[0], 0, -pl.fondo - 0.4], [pl.x[1], pl.y[1], -pl.fondo]));
  p.push(caja('celeste', [pl.x[0], 0, -pl.fondo], [pl.x[0] + 0.04, pl.y[1], z]));
  p.push(caja('celeste', [pl.x[1] - 0.04, 0, -pl.fondo], [pl.x[1], pl.y[1], z]));
  p.push(caja('celeste', [pl.x[0], pl.y[1], prof], [pl.x[1], M.planta, z]));
  p.push(caja('celeste', [pl.x[1], 0, prof], [hasta, M.planta, z]));
  // Small things on the blue wall, by the flag.
  p.push(caja('cartel', [9.75, 2.38, 0], [9.95, 2.62, 0.025]));
  p.push(caja('blanco', [9.84, 1.71, 0], [9.94, 1.81, 0.04]));
  p.push(caja('cartel', [9.98, 0.26, 0], [10.28, 0.36, 0.02]));

  // The white band and the floors above.
  const [f0, f1] = M.faja;
  p.push(caja('blanco', [desde, f0, prof], [hasta, f1, 0.14]));
  let piso = f1;
  for (const [a, bb] of M.pisos) {
    p.push(caja('blanco', [desde, piso, prof], [hasta, a, 0]));
    p.push(caja('vidrioAlto', [desde, a, prof], [hasta, bb, -0.2]));
    for (let x = desde; x <= hasta + 1e-6; x += 1.5) p.push(caja('blanco', [x - 0.07, a, -0.2], [x + 0.07, bb, -0.02]));
    for (const y of [a + 0.04, (a + bb) * 0.5]) p.push(caja('aluminio', [desde, y - 0.025, -0.2], [hasta, y + 0.025, -0.15]));
    piso = bb;
  }
  p.push(caja('blanco', [desde, piso, prof], [hasta, M.alto, 0.05]));
  return p;
}

/** Neighbours on both sides, plain: so turning the view never shows the end of the world. */
function vecinos(M) {
  const { desde, hasta } = M.frente;
  return [
    caja('vecino1', [desde - 9, 0, -0.6], [desde, 11.5, 0.05]),
    caja('vecino2', [desde - 18, 0, -0.6], [desde - 9, 8.2, 0.05]),
    caja('vecino2', [hasta, 0, -0.6], [hasta + 8, 9.6, 0.05]),
    caja('vecino1', [hasta + 8, 0, -0.6], [hasta + 18, 12.4, 0.05]),
    caja('vidrioAlto', [desde - 8.2, 3.2, 0.05], [desde - 0.8, 9.8, 0.06]),
    caja('vidrioAlto', [hasta + 0.8, 3.0, 0.05], [hasta + 7.2, 8.4, 0.06]),
    caja('vidrioAlto', [hasta + 9, 3.4, 0.05], [hasta + 17, 11, 0.06]),
    caja('vidrioAlto', [desde - 17, 3.0, 0.05], [desde - 10, 7.0, 0.06]),
  ];
}

function suelo(M) {
  const { desde, hasta } = M.frente;
  return [
    caja('vereda', [desde - 6, -0.2, 0], [hasta + 6, 0, M.vereda - 0.12]),
    caja('piedra', [desde - 6, -M.cordon, M.vereda - 0.12], [hasta + 6, 0, M.vereda]),
    caja('adoquines', [desde - 6, -M.cordon - 0.2, M.vereda], [hasta + 6, -M.cordon, M.vereda + M.calle]),
    caja('piedra', [desde - 6, -M.cordon, M.vereda + M.calle], [hasta + 6, 0, M.vereda + M.calle + 0.12]),
    caja('vereda', [desde - 6, -0.2, M.vereda + M.calle + 0.12], [hasta + 6, 0, M.vereda + M.calle + 4]),
    caja('tierra', [M.arbol.x - 0.45, -0.17, M.arbol.z - 0.45], [M.arbol.x + 0.45, -0.03, M.arbol.z + 0.45]),
  ];
}

/** Each railing as tube paths: the bent frame (down, along, down), the middle post and the low rail. */
export function barandas(M = MEDIDAS) {
  const { alto, travesano, radio } = M.baranda;
  const codo = 0.12;
  return M.barandas.map(({ x: [a, b], medio, z, chapa }) => ({
    tubos: [
      [
        [a, 0, z],
        [a, alto - codo, z],
        [a + codo * 0.3, alto - codo * 0.3, z],
        [a + codo, alto, z],
        [b - codo, alto, z],
        [b - codo * 0.3, alto - codo * 0.3, z],
        [b, alto - codo, z],
        [b, 0, z],
      ],
      [
        [medio, 0, z],
        [medio, alto, z],
      ],
      [
        [a, travesano, z],
        [b, travesano, z],
      ],
    ],
    chapa: chapa && caja('amarillo', [chapa[0], travesano + 0.04, z - 0.008], [chapa[1], alto - 0.03, z + 0.008]),
    radio,
  }));
}

/** The tree: a leaning trunk that forks low, branches that split twice and clumps of leaves at the tips. */
export function arbol(M = MEDIDAS, semilla = 7) {
  const r = azar(semilla);
  const { x, z, alto } = M.arbol;
  const ramas = [];
  const hojas = [];
  // The trunk bends a little towards the street and to the left, like the one in the photo.
  const tronco = [
    [x, -0.1, z],
    [x - 0.05, 1.6, z - 0.04],
    [x - 0.22, 3.3, z - 0.1],
  ];
  ramas.push({ puntos: tronco, radio: [0.15, 0.11] });
  const crecer = (desde, dir, largo, grosor, nivel) => {
    const fin = desde.map((v, i) => v + dir[i] * largo);
    fin[1] = Math.min(fin[1], alto);
    const medio = desde.map((v, i) => (v + fin[i]) / 2 + (r() - 0.5) * largo * 0.15);
    ramas.push({ puntos: [desde, medio, fin], radio: [grosor, grosor * 0.6] });
    if (nivel === 0) {
      // Small clumps, many: the tree in the photo is airy, light passes between the leaves.
      const n = 12 + Math.floor(r() * 8);
      for (let i = 0; i < n; i++) {
        const radio = 0.12 + r() * 0.16;
        const centro = [fin[0] + (r() - 0.5) * 1.7, fin[1] + (r() - 0.35) * 1.3, fin[2] + (r() - 0.5) * 1.5];
        // Never into the wall: the leaves that would touch it are pushed out to the street.
        centro[2] = Math.max(centro[2], radio + 0.3);
        hojas.push({ centro, radio, tono: r() });
      }
      return;
    }
    const hijos = 2 + (r() < 0.4 ? 1 : 0);
    for (let i = 0; i < hijos; i++) {
      const d = [dir[0] + (r() - 0.5) * 0.9, dir[1] + 0.15, dir[2] + (r() - 0.5) * 0.6];
      const n = Math.hypot(...d);
      crecer(fin, d.map((v) => v / n), largo * (0.62 + r() * 0.15), grosor * 0.62, nivel - 1);
    }
  };
  const horqueta = tronco.at(-1);
  // Three main limbs: up and left (the big one), straight up, and a short one over the door.
  crecer(horqueta, [-0.45, 0.85, -0.15], 2.6, 0.09, 2);
  crecer(horqueta, [0.05, 1, 0.12], 2.4, 0.08, 2);
  crecer(horqueta, [0.6, 0.75, -0.2], 1.6, 0.055, 1);
  return { ramas, hojas };
}

/** Power and phone lines across the front, sagging, several meeting at a knot like the one over the flag. */
export function cables(M = MEDIDAS) {
  const { desde, hasta } = M.frente;
  const nudo = [11.3, 6.55, 0.3];
  const lineas = [
    { a: [desde, 6.3, 1.6], b: nudo, caida: 0.35 },
    { a: [desde, 6.7, 1.1], b: nudo, caida: 0.3 },
    { a: [desde, 5.95, 0.5], b: [hasta, 6.1, 0.4], caida: 0.25 },
    { a: [nudo[0], nudo[1], nudo[2]], b: [hasta, 6.9, 0.9], caida: 0.25 },
    { a: [nudo[0], nudo[1], nudo[2]], b: [hasta, 6.4, 2.2], caida: 0.4 },
    { a: [desde, 7.4, 2.4], b: [hasta, 7.1, 2.6], caida: 0.6 },
    { a: [4.7, 5.62, 0.25], b: nudo, caida: 0.15 },
  ];
  return lineas.map(({ a, b, caida }) => {
    const pts = [];
    const n = 24;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - caida * 4 * t * (1 - t), a[2] + (b[2] - a[2]) * t]);
    }
    return pts;
  });
}

/** Where the camera stands. «foto» is the photo's point of view; the background sways around it. */
export const CAMARA = {
  fov: 50,
  foto: { posicion: [10.6, 1.6, 12.6], mira: [7.0, 3.1, 0] },
  vaiven: { amplitud: 1.3, periodo: 46 },
  // Dragging limits for the screen of its own: never behind the wall, never under the street.
  limites: { distancia: [3.5, 15.5], polar: [0.85, 1.62], azimut: [-1.15, 1.15], mira: { x: [-4, 18], y: [0.6, 7], z: [0, 4] } },
};

/** The whole scene: boxes, railings, tree, cables, lamps and the flag. */
export function describirEscena(M = MEDIDAS) {
  return {
    cajas: [...fachada(M), ...vecinos(M), ...suelo(M)],
    barandas: barandas(M),
    arbol: arbol(M),
    cables: cables(M),
    luces: M.luces.map(([x, y]) => ({ x, y })),
    mastil: M.mastil,
    logos: logos(M),
    letrero: M.letrero,
    camara: CAMARA,
    medidas: M,
  };
}
