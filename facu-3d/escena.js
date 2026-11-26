// The faculty's entrance in three.js. Loaded only with import() from facu3d.js. Every size comes from describir.js
// (metres, axes there). Two uses: «fondo», behind a page, swaying slowly and cheap (30 frames a second, fewer
// pixels); «sola», its own screen, turned with the mouse, a finger or the keyboard. Light theme: day; dark: night, with
// the sign, the hall and the lamps lit.
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Float32BufferAttribute,
  Fog,
  Group,
  HemisphereLight,
  IcosahedronGeometry,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  PointLight,
  Quaternion,
  RepeatWrapping,
  Scene,
  Shape,
  ShapeGeometry,
  PlaneGeometry,
  SphereGeometry,
  Spherical,
  SpotLight,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { crearBucle } from './bucle.js';
import { azar } from './describir.js';
import { LOGO_BLANCO, LOGO_EXTERIOR } from './logo.js';
export { describirEscena } from './describir.js';

// The photo's colours, a little brighter: on a screen the pale blue goes grey.
const COLORES = {
  celeste: '#4b93da',
  blanco: '#e9e9e4',
  vidrio: '#16202a',
  vidrioPuerta: '#1a242e',
  vidrioAlto: '#1e2731',
  marco: '#2b2f33',
  aluminio: '#b8bcc0',
  cartel: '#1556c2',
  piedra: '#9a9894',
  oscuro: '#1c2026',
  chapa: '#7c8590',
  reja: '#8d969e',
  vereda: '#a29e96',
  adoquines: '#6e6a64',
  tierra: '#4a3a2c',
  amarillo: '#f4c20d',
  corteza: '#5a4a3c',
  vecino1: '#d8cfc0',
  vecino2: '#b9b4ad',
};

const CIELO = { dia: '#cfe2f2', noche: '#0b1320' };

// ---------- Small textures drawn once ----------
function lienzoTextura(lado, dibujar) {
  const c = document.createElement('canvas');
  c.width = c.height = lado;
  dibujar(c.getContext('2d'), lado);
  const t = new CanvasTexture(c);
  t.wrapS = t.wrapT = RepeatWrapping;
  t.anisotropy = 4;
  t.colorSpace = SRGBColorSpace;
  return t;
}

// Cobbles: rows of rounded granite blocks, 2 m of street per tile.
function texturaAdoquines() {
  const r = azar(11);
  return lienzoTextura(512, (g, L) => {
    g.fillStyle = '#3a3733';
    g.fillRect(0, 0, L, L);
    const filas = 18;
    const alto = L / filas;
    for (let f = 0; f < filas; f++) {
      const largo = alto * 1.6;
      let x = (f % 2) * largo * 0.5 - largo;
      while (x < L) {
        const w = largo * (0.85 + r() * 0.3);
        const v = 120 + Math.floor(r() * 55);
        g.fillStyle = `rgb(${v},${v - 4},${v - 10})`;
        g.beginPath();
        g.roundRect(x + 2, f * alto + 2, w - 4, alto - 4, 5);
        g.fill();
        x += w;
      }
    }
  });
}

// Sidewalk: 40 cm grey tiles with dark joints and a few stains, 2 m per tile.
function texturaVereda() {
  const r = azar(5);
  return lienzoTextura(512, (g, L) => {
    const n = 5;
    const lado = L / n;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const v = 196 + Math.floor(r() * 22);
        g.fillStyle = `rgb(${v},${v - 2},${v - 8})`;
        g.fillRect(i * lado, j * lado, lado, lado);
      }
    }
    for (let k = 0; k < 40; k++) {
      g.fillStyle = `rgba(60,55,50,${0.03 + r() * 0.06})`;
      g.beginPath();
      g.arc(r() * L, r() * L, 6 + r() * 30, 0, Math.PI * 2);
      g.fill();
    }
    g.strokeStyle = '#7b7770';
    g.lineWidth = 3;
    for (let i = 0; i <= n; i++) {
      g.beginPath();
      g.moveTo(i * lado, 0);
      g.lineTo(i * lado, L);
      g.moveTo(0, i * lado);
      g.lineTo(L, i * lado);
      g.stroke();
    }
  });
}

// Painted wall: almost white, with faint streaks of dirt running down (multiplied by the paint's colour), 4 m per tile.
function texturaMuro() {
  const r = azar(3);
  const t = lienzoTextura(256, (g, L) => {
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, L, L);
    for (let k = 0; k < 70; k++) {
      const x = r() * L;
      const y = r() * L;
      const grad = g.createLinearGradient(x, y, x, y + 30 + r() * 90);
      grad.addColorStop(0, `rgba(80,80,80,${0.02 + r() * 0.04})`);
      grad.addColorStop(1, 'rgba(80,80,80,0)');
      g.fillStyle = grad;
      g.fillRect(x, y, 4 + r() * 14, 120);
    }
  });
  return t;
}

// The sign's face: its two lines and a white logo at each end, laid out as in the photo (percentages of the sign).
function texturaLetrero(lineas, ancho, alto) {
  const W = 2048;
  const H = Math.round((W * alto) / ancho);
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d');
  g.fillStyle = '#ffffff';
  const logo = new Path2D();
  LOGO_EXTERIOR.forEach(([x, y], i) => (i ? logo.lineTo(x, -y) : logo.moveTo(x, -y)));
  logo.closePath();
  for (const cx of [0.073, 0.905]) {
    g.save();
    g.translate(W * cx, H * 0.47);
    g.scale(H * 0.62, H * 0.62);
    g.fill(logo);
    g.restore();
  }
  g.textAlign = 'center';
  const escribir = (texto, centro, ancho, base) => {
    g.font = 'bold 100px Arial, Helvetica, sans-serif';
    const tam = Math.round((100 * ancho * W) / g.measureText(texto).width);
    g.font = `bold ${tam}px Arial, Helvetica, sans-serif`;
    g.fillText(texto, W * centro, H * base);
  };
  escribir(lineas[0], 0.479, 0.684, 0.5);
  escribir(lineas[1], 0.47, 0.435, 0.78);
  const t = new CanvasTexture(c);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function geometriaLogo(puntos, { centro, lado }, z) {
  const g = new ShapeGeometry(new Shape(puntos.map(([x, y]) => new Vector2(x, y))));
  g.scale(lado, lado, 1);
  g.translate(centro[0], centro[1], centro[2] + z);
  return g;
}

// ---------- Geometry ----------
// UVs in metres from the world position, picked by the face's direction: the textures line up across boxes.
function uvMundo(geo, escala) {
  const p = geo.attributes.position;
  const n = geo.attributes.normal;
  const uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const [x, y, z] = [p.getX(i), p.getY(i), p.getZ(i)];
    const [ax, ay] = [Math.abs(n.getX(i)), Math.abs(n.getY(i))];
    const [u, v] = ay > 0.5 ? [x, z] : ax > 0.5 ? [z, y] : [x, y];
    uv[i * 2] = u / escala;
    uv[i * 2 + 1] = v / escala;
  }
  geo.setAttribute('uv', new Float32BufferAttribute(uv, 2));
}

function geometriaCaja({ a, b, inclinar }) {
  const g = new BoxGeometry(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  if (inclinar) g.rotateX(inclinar);
  g.translate((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2);
  return g;
}

const ARRIBA = new Vector3(0, 1, 0);
// A cylinder from p to q, radii at each end: branches and railing tubes.
function cilindro(p, q, r0, r1, lados) {
  const a = new Vector3(...p);
  const b = new Vector3(...q);
  const d = b.clone().sub(a);
  const g = new CylinderGeometry(r1, r0, d.length(), lados, 1, false);
  g.applyQuaternion(new Quaternion().setFromUnitVectors(ARRIBA, d.normalize()));
  const m = a.add(b).multiplyScalar(0.5);
  g.translate(m.x, m.y, m.z);
  return g;
}

function bola(p, r) {
  const g = new SphereGeometry(r, 10, 6);
  g.translate(...p);
  return g;
}

// ---------- The scene ----------
export function crearEscena(contenedor, opciones) {
  const { escena: datos, modo = 'fondo' } = opciones;
  const sola = modo === 'sola';
  let { noche = false, quieto = false } = opciones;
  let vivo = true;
  // Nothing is drawn before preparar(): see the resize observer.
  let listo = false;

  const renderer = new WebGLRenderer({ antialias: true, alpha: false, powerPreference: sola ? 'high-performance' : 'default' });
  renderer.debug.checkShaderErrors = Boolean(opciones.depurar);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, sola ? 2 : 1.25));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NeutralToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const lienzo = renderer.domElement;
  lienzo.className = 'facu3d__lienzo';
  contenedor.appendChild(lienzo);

  const escena = new Scene();
  // No environment map: building one (PMREM) froze the page for most of a second on the first visit. The glass shines
  // with the sun and the sky light instead.
  escena.fog = new Fog(CIELO.dia, 28, 70);

  const geometrias = [];
  const materiales = [];
  const texturas = [texturaAdoquines(), texturaVereda(), texturaMuro()];
  const [tAdoquines, tVereda, tMuro] = texturas;

  const mat = {};
  const nuevo = (clave, props) => {
    const m = new MeshStandardMaterial({ color: COLORES[clave], roughness: 0.85, metalness: 0, ...props });
    materiales.push(m);
    mat[clave] = m;
    return m;
  };
  nuevo('celeste', { map: tMuro, roughness: 0.92 });
  nuevo('blanco', { map: tMuro, roughness: 0.9 });
  nuevo('vidrio', { roughness: 0.18, metalness: 0 });
  nuevo('vidrioPuerta', { roughness: 0.18, metalness: 0, emissive: '#ffd7a0', emissiveIntensity: 0 });
  nuevo('vidrioAlto', { roughness: 0.22, metalness: 0 });
  nuevo('marco', { roughness: 0.5, metalness: 0.1 });
  nuevo('aluminio', { color: '#c4c8cc', roughness: 0.4, metalness: 0.15 });
  nuevo('cartel', { roughness: 0.75, emissive: '#2f8cff', emissiveIntensity: 0 });
  nuevo('piedra', { roughness: 0.95 });
  nuevo('oscuro', { roughness: 0.9 });
  nuevo('chapa', { roughness: 0.6, metalness: 0.1 });
  nuevo('reja', { roughness: 0.55, metalness: 0.1 });
  nuevo('vereda', { map: tVereda, bumpMap: tVereda, bumpScale: 0.6, roughness: 0.95 });
  nuevo('adoquines', { map: tAdoquines, bumpMap: tAdoquines, bumpScale: 2.5, roughness: 0.9 });
  nuevo('tierra', { roughness: 1 });
  nuevo('amarillo', { roughness: 0.4, metalness: 0.1 });
  nuevo('corteza', { roughness: 1 });
  nuevo('vecino1', { map: tMuro, roughness: 0.95 });
  nuevo('vecino2', { map: tMuro, roughness: 0.95 });
  nuevo('foco', { color: '#d8d8d0', emissive: '#fff1d0', emissiveIntensity: 0 });
  const hojaMat = new MeshStandardMaterial({ roughness: 0.85, flatShading: true });
  const banderaMat = new MeshStandardMaterial({ color: '#cfd5dc', roughness: 0.85, side: DoubleSide });
  materiales.push(hojaMat, banderaMat);
  const ESCALA_UV = { vereda: 2, adoquines: 2, celeste: 4, blanco: 4, vecino1: 4, vecino2: 4 };

  // Boxes merged by material: a handful of draws for the whole front.
  const porMaterial = new Map();
  for (const c of datos.cajas) {
    const clave = c.m === 'vidrio' && c.interior ? 'vidrioPuerta' : c.m;
    if (!porMaterial.has(clave)) porMaterial.set(clave, []);
    porMaterial.get(clave).push(geometriaCaja(c));
  }
  const sumar = (geo, material, { sombra = true, recibe = true } = {}) => {
    geometrias.push(geo);
    const malla = new Mesh(geo, material);
    malla.castShadow = sombra;
    malla.receiveShadow = recibe;
    escena.add(malla);
    return malla;
  };
  for (const [clave, partes] of porMaterial) {
    const geo = mergeGeometries(partes);
    partes.forEach((g) => g.dispose());
    if (ESCALA_UV[clave]) uvMundo(geo, ESCALA_UV[clave]);
    const suelo = clave === 'vereda' || clave === 'adoquines' || clave === 'tierra';
    sumar(geo, mat[clave], { sombra: !suelo });
  }

  // Railings: tubes and balls at the joints, and the yellow plate of the right one.
  const tubos = [];
  for (const b of datos.barandas) {
    for (const camino of b.tubos) {
      for (let i = 0; i < camino.length - 1; i++) tubos.push(cilindro(camino[i], camino[i + 1], b.radio, b.radio, 10));
      for (const p of camino.slice(1, -1)) tubos.push(bola(p, b.radio));
    }
    if (b.chapa) tubos.push(geometriaCaja(b.chapa));
  }
  sumar(mergeGeometries(tubos), mat.amarillo);
  tubos.forEach((g) => g.dispose());

  // Tree: tapered branches in one mesh, leaves as one instanced mesh that sways a little.
  const partesArbol = [];
  for (const { puntos, radio } of datos.arbol.ramas) {
    const n = puntos.length - 1;
    for (let i = 0; i < n; i++) {
      const r0 = radio[0] + ((radio[1] - radio[0]) * i) / n;
      const r1 = radio[0] + ((radio[1] - radio[0]) * (i + 1)) / n;
      partesArbol.push(cilindro(puntos[i], puntos[i + 1], r0, r1, 7));
    }
  }
  sumar(mergeGeometries(partesArbol), mat.corteza);
  partesArbol.forEach((g) => g.dispose());
  const copa = new Group();
  const base = datos.arbol.ramas[0].puntos[0];
  copa.position.set(...base);
  escena.add(copa);
  const hojaGeo = new IcosahedronGeometry(1, 0);
  geometrias.push(hojaGeo);
  const hojas = new InstancedMesh(hojaGeo, hojaMat, datos.arbol.hojas.length);
  hojas.castShadow = true;
  hojas.receiveShadow = true;
  const ayuda = new Object3D();
  const verde = new Color();
  datos.arbol.hojas.forEach((h, i) => {
    ayuda.position.set(h.centro[0] - base[0], h.centro[1] - base[1], h.centro[2] - base[2]);
    ayuda.scale.set(h.radio, h.radio * 0.8, h.radio);
    ayuda.rotation.set(h.tono * 3, h.tono * 7, 0);
    ayuda.updateMatrix();
    hojas.setMatrixAt(i, ayuda.matrix);
    hojas.setColorAt(i, verde.setHSL(0.21 + h.tono * 0.08, 0.45, 0.2 + h.tono * 0.16));
  });
  copa.add(hojas);

  // UTN logos: painted on the wall with their dark rim, frosted stickers on the door, and the sign's face.
  const logoBorde = new MeshStandardMaterial({ color: '#141c26', roughness: 0.85 });
  const logoBlanco = new MeshStandardMaterial({ color: '#f2f2ee', roughness: 0.8, map: tMuro });
  const calco = new MeshStandardMaterial({ color: '#e6ebf0', roughness: 0.45, transparent: true, opacity: 0.82 });
  materiales.push(logoBorde, logoBlanco, calco);
  sumar(geometriaLogo(LOGO_EXTERIOR, datos.logos.pared, 0.004), logoBorde, { sombra: false });
  sumar(geometriaLogo(LOGO_BLANCO, datos.logos.pared, 0.008), logoBlanco, { sombra: false });
  const calcos = datos.logos.puerta.map((l) => geometriaLogo(LOGO_EXTERIOR, l, 0.003));
  sumar(mergeGeometries(calcos), calco, { sombra: false });
  calcos.forEach((g) => g.dispose());
  const { x: lx, y: ly, saliente } = datos.medidas.cartel;
  const texLetrero = texturaLetrero(datos.letrero.lineas, lx[1] - lx[0], ly[1] - ly[0]);
  texturas.push(texLetrero);
  const letreroMat = new MeshStandardMaterial({ map: texLetrero, transparent: true, roughness: 0.6, emissive: '#ffffff', emissiveMap: texLetrero, emissiveIntensity: 0 });
  materiales.push(letreroMat);
  const caraLetrero = new PlaneGeometry(lx[1] - lx[0], ly[1] - ly[0]);
  caraLetrero.translate((lx[0] + lx[1]) / 2, (ly[0] + ly[1]) / 2, saliente + 0.003);
  sumar(caraLetrero, letreroMat, { sombra: false });

  // Cables.
  const cableMat = new LineBasicMaterial({ color: '#15171a' });
  materiales.push(cableMat);
  for (const pts of datos.cables) {
    const g = new BufferGeometry().setFromPoints(pts.map((p) => new Vector3(...p)));
    geometrias.push(g);
    escena.add(new Line(g, cableMat));
  }

  // Wall lamps: a dark housing on a bracket, the lit glass underneath.
  const focos = [];
  const partesLamparas = [];
  const vidriosLamparas = [];
  for (const { x, y } of datos.luces) {
    partesLamparas.push(geometriaCaja({ a: [x - 0.04, y - 0.04, 0.14], b: [x + 0.04, y + 0.04, 0.32] }));
    partesLamparas.push(geometriaCaja({ a: [x - 0.19, y - 0.1, 0.24], b: [x + 0.19, y + 0.08, 0.5] }));
    vidriosLamparas.push(geometriaCaja({ a: [x - 0.16, y - 0.115, 0.27], b: [x + 0.16, y - 0.1, 0.47] }));
    const foco = new SpotLight('#ffe4b5', 0, 14, 0.9, 0.6, 1.6);
    foco.position.set(x, y - 0.12, 0.4);
    foco.target.position.set(x, 0, 2.2);
    escena.add(foco, foco.target);
    focos.push(foco);
  }
  sumar(mergeGeometries(partesLamparas), mat.marco);
  sumar(mergeGeometries(vidriosLamparas), mat.foco, { sombra: false });
  [...partesLamparas, ...vidriosLamparas].forEach((g) => g.dispose());

  // Flagpole and its flag, hanging from the upper part of the pole.
  const { base: mb, punta: mp, bandera: largoBandera, desde: desdeBandera } = datos.mastil;
  sumar(cilindro(mb, mp, 0.025, 0.02, 8), mat.aluminio);
  sumar(bola(mp, 0.04), mat.aluminio);
  const U = 10;
  const V = 12;
  const banderaGeo = new BufferGeometry();
  const posiciones = new Float32Array((U + 1) * (V + 1) * 3);
  banderaGeo.setAttribute('position', new Float32BufferAttribute(posiciones, 3));
  const indices = [];
  for (let i = 0; i < U; i++) {
    for (let j = 0; j < V; j++) {
      const a = i * (V + 1) + j;
      indices.push(a, a + V + 1, a + 1, a + 1, a + V + 1, a + V + 2);
    }
  }
  banderaGeo.setIndex(indices);
  geometrias.push(banderaGeo);
  sumar(banderaGeo, banderaMat);
  const desdeAsta = new Vector3(...mb).lerp(new Vector3(...mp), desdeBandera);
  const hastaPunta = new Vector3(...mp);
  const normalBandera = new Vector3().subVectors(hastaPunta, desdeAsta).cross(new Vector3(0, -1, 0)).normalize();
  const flamear = (t) => {
    const p = banderaGeo.attributes.position;
    const punto = new Vector3();
    for (let i = 0; i <= U; i++) {
      const u = i / U;
      for (let j = 0; j <= V; j++) {
        const v = j / V;
        punto.lerpVectors(desdeAsta, hastaPunta, u);
        punto.y -= v * largoBandera;
        const onda = 0.06 * Math.sin(u * 9 + v * 2) + 0.05 * v * Math.sin(t * 1.6 + v * 3.2 + u * 2.1) + 0.03 * v * Math.sin(t * 2.7 + u * 5);
        punto.addScaledVector(normalBandera, onda);
        p.setXYZ(i * (V + 1) + j, punto.x, punto.y, punto.z);
      }
    }
    p.needsUpdate = true;
    banderaGeo.computeVertexNormals();
    banderaGeo.computeBoundingSphere();
  };
  flamear(0);

  // ---------- Light ----------
  const cielo = new HemisphereLight('#dcebf8', '#8a8478', 1.4);
  const sol = new DirectionalLight('#fff4e0', 2.2);
  sol.position.set(26, 16, 15);
  sol.target.position.set(6, 0, 1);
  sol.castShadow = true;
  sol.shadow.mapSize.set(sola ? 2048 : 1024, sola ? 2048 : 1024);
  Object.assign(sol.shadow.camera, { left: -20, right: 20, top: 16, bottom: -14, near: 5, far: 70 });
  sol.shadow.camera.updateProjectionMatrix();
  sol.shadow.bias = -0.0004;
  sol.shadow.normalBias = 0.03;
  sol.shadow.radius = 3;
  const halo = new PointLight('#4b9bff', 0, 7, 1.8); // the sign, on the sidewalk at night
  halo.position.set(7, 2.6, 1.2);
  const hall = new PointLight('#ffcf8a', 0, 8, 1.6); // the hall, through the glass
  hall.position.set(7, 1.2, 1.6);
  escena.add(cielo, sol, sol.target, halo, hall);

  const ponerLuz = () => {
    const fondo = noche ? CIELO.noche : CIELO.dia;
    escena.background = new Color(fondo);
    escena.fog.color.set(fondo);
    cielo.color.set(noche ? '#3a5580' : '#dcebf8');
    cielo.groundColor.set(noche ? '#151515' : '#8a8478');
    cielo.intensity = noche ? 0.3 : 1.4;
    sol.color.set(noche ? '#9fb6ff' : '#fff4e0');
    sol.intensity = noche ? 0.25 : 2.2;
    mat.cartel.emissiveIntensity = noche ? 1.1 : 0;
    letreroMat.emissiveIntensity = noche ? 0.9 : 0;
    mat.vidrioPuerta.emissiveIntensity = noche ? 0.1 : 0;
    mat.foco.emissiveIntensity = noche ? 3 : 0;
    focos.forEach((f) => (f.intensity = noche ? 22 : 0));
    halo.intensity = noche ? 5 : 0;
    hall.intensity = noche ? 3 : 0;
  };
  ponerLuz();

  // ---------- Camera ----------
  const { camara: cam } = datos;
  const camara = new PerspectiveCamera(cam.fov, 1, 0.3, 120);
  const foto = { pos: new Vector3(...cam.foto.posicion), mira: new Vector3(...cam.foto.mira) };
  // On a tall screen (a phone) the door goes in the middle and the view drops a little: the upper floors would fill it.
  if (contenedor.clientHeight > contenedor.clientWidth) {
    foto.pos.x = foto.mira.x + 1.2;
    foto.mira.y -= 0.7;
    foto.pos.y -= 0.1;
  }
  camara.position.copy(foto.pos);
  camara.lookAt(foto.mira);

  let controles = null;
  if (sola) {
    controles = new OrbitControls(camara, lienzo);
    controles.target.copy(foto.mira);
    controles.enableDamping = true;
    controles.dampingFactor = 0.08;
    const { distancia, polar, azimut } = cam.limites;
    [controles.minDistance, controles.maxDistance] = distancia;
    [controles.minPolarAngle, controles.maxPolarAngle] = polar;
    [controles.minAzimuthAngle, controles.maxAzimuthAngle] = azimut;
    controles.screenSpacePanning = true;
    controles.update();
    controles.saveState();
    // Panning never leaves the street: the point looked at stays inside a box in front of the door.
    const { mira } = cam.limites;
    controles.addEventListener('change', () => {
      const t = controles.target;
      const antes = t.clone();
      t.set(limitar(t.x, ...mira.x), limitar(t.y, ...mira.y), limitar(t.z, ...mira.z));
      camara.position.add(t.clone().sub(antes));
      pedir();
    });
  }

  // Keyboard: arrows turn (Shift, faster), + and − come closer.
  const esferica = new Spherical();
  const girar = (dAzimut, dPolar, factor = 1) => {
    if (!controles) return;
    const desde = new Vector3().subVectors(camara.position, controles.target);
    esferica.setFromVector3(desde);
    esferica.theta -= dAzimut;
    esferica.phi += dPolar;
    esferica.radius *= factor;
    esferica.makeSafe();
    desde.setFromSpherical(esferica);
    camara.position.copy(controles.target).add(desde);
    controles.update();
    pedir();
  };
  const alTeclear = (e) => {
    const paso = e.shiftKey ? 0.2 : 0.07;
    const acciones = {
      ArrowLeft: () => girar(-paso, 0),
      ArrowRight: () => girar(paso, 0),
      ArrowUp: () => girar(0, -paso),
      ArrowDown: () => girar(0, paso),
      '+': () => girar(0, 0, 0.9),
      '=': () => girar(0, 0, 0.9),
      '-': () => girar(0, 0, 1.1),
    };
    const accion = acciones[e.key];
    if (!accion || e.altKey || e.ctrlKey || e.metaKey) return;
    e.preventDefault();
    accion();
  };
  if (sola) lienzo.addEventListener('keydown', alTeclear);

  // ---------- Loop ----------
  const inicio = performance.now();
  let activo = false;
  let ultimo = 0;
  let ancho = 1;
  let alto = 1;
  const { amplitud, periodo } = cam.vaiven;

  const aplicar = (ahora) => {
    const t = quieto ? 0 : (ahora - inicio) / 1000;
    if (!quieto) {
      flamear(t);
      copa.rotation.z = 0.012 * Math.sin(t * 0.9);
      copa.rotation.x = 0.008 * Math.sin(t * 0.7 + 1);
    }
    if (!sola) {
      const s = quieto ? 0 : Math.sin((2 * Math.PI * t) / periodo);
      camara.position.set(foto.pos.x + amplitud * s, foto.pos.y + 0.08 * s, foto.pos.z);
      camara.lookAt(foto.mira.x + amplitud * 0.35 * s, foto.mira.y, foto.mira.z);
    } else controles.update();
  };

  const bucle = crearBucle((ahora) => {
    if (!activo || !vivo) return false;
    // The background goes at 30 frames a second: it moves slowly and the form sits on top.
    if (sola || ahora - ultimo >= 32) {
      ultimo = ahora;
      aplicar(ahora);
      renderer.render(escena, camara);
    }
    // Still and alone, it draws only when asked (the controls ask while they move, damping included).
    return !quieto || sola;
  });
  const pedir = () => {
    if (activo && vivo && listo) bucle.pedir();
  };

  const medir = () => {
    ancho = Math.max(1, contenedor.clientWidth);
    alto = Math.max(1, contenedor.clientHeight);
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    // On a tall phone the front would only show the door: back up so the band and the tree fit.
    camara.fov = cam.fov * (camara.aspect < 1 ? Math.min(1.5, 1 / Math.sqrt(camara.aspect)) : 1);
    camara.updateProjectionMatrix();
  };
  // Until preparar() is done, a resize only measures: drawing would compile every shader at once, on the main thread.
  const observador = new ResizeObserver(() => {
    medir();
    if (listo && !bucle.pendiente) {
      aplicar(performance.now());
      renderer.render(escena, camara);
    }
  });
  observador.observe(contenedor);
  medir();

  const perdido = (e) => {
    e.preventDefault();
    opciones.alPerder?.();
  };
  lienzo.addEventListener('webglcontextlost', perdido);

  return {
    /** Compiles the shaders off the main thread where the browser can (KHR_parallel_shader_compile): without it the
     * first frame froze the page for most of a second. */
    async preparar() {
      const pausa = () => new Promise((r) => setTimeout(r, 0));
      await pausa();
      if (!vivo) return;
      await renderer.compileAsync(escena, camara).catch(() => {});
      await pausa();
      if (!vivo) return;
      // The shadow map's own shaders compile on the first frame: draw it now, before the canvas shows.
      aplicar(performance.now());
      renderer.render(escena, camara);
      listo = true;
      pedir();
    },
    /** Draws once now, so the first frame is ready before the canvas fades in. */
    dibujar() {
      if (!listo) return;
      aplicar(performance.now());
      renderer.render(escena, camara);
    },
    noche(si) {
      if (si === noche) return;
      noche = si;
      ponerLuz();
      this.dibujar();
    },
    quieto(si) {
      quieto = si;
      this.dibujar();
      pedir();
    },
    visible(si) {
      activo = si;
      if (si) pedir();
      else bucle.parar();
    },
    /** Back to the photo's point of view. */
    foto() {
      if (!controles) return;
      controles.reset();
      pedir();
    },
    lienzo,
    destruir() {
      vivo = false;
      activo = false;
      bucle.parar();
      observador.disconnect();
      controles?.dispose();
      lienzo.removeEventListener('keydown', alTeclear);
      lienzo.removeEventListener('webglcontextlost', perdido);
      hojas.dispose();
      geometrias.forEach((g) => g.dispose());
      materiales.forEach((m) => m.dispose());
      texturas.forEach((t) => t.dispose());
      sol.shadow.map?.dispose();
      focos.forEach((f) => f.shadow.map?.dispose());
      renderer.dispose();
      renderer.forceContextLoss();
      lienzo.remove();
    },
  };
}

const limitar = (v, a, b) => Math.min(b, Math.max(a, v));
