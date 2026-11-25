// A relation on a set, as Lógica y Estructuras Discretas works it (parcial-2.md, «Relación», «Matriz y digrafo»,
// «Trayectorias y Rⁿ», «Las seis propiedades» and «Relaciones de equivalencia»): pairs, matrix, domain and range, R² by
// paths of length 2 and the six properties one by one. The reading and the properties are El Santo Resumen's
// (its simulator code, leerConjunto, leerPares and propiedades).

export const MAX_ELEMENTOS = 10;
const ELEMENTO = /^[^\s(),;{}]{1,6}$/;

/** A set as typed: {1, 2, 3} or a b c. Elements of up to 6 characters, without repeats. */
export function leerConjunto(texto) {
  const partes = String(texto).replace(/[{}]/g, ' ').split(/[\s,;]+/).filter(Boolean);
  if (!partes.length) return { error: 'Escribí los elementos de A.' };
  if (partes.length > MAX_ELEMENTOS) return { error: `A tiene ${partes.length} elementos y el tope es ${MAX_ELEMENTOS}.` };
  const mal = partes.find((p) => !ELEMENTO.test(p));
  if (mal) return { error: `«${mal.slice(0, 12)}» es muy largo. Cada elemento va de hasta 6 caracteres.` };
  const repetido = partes.find((p, i) => partes.indexOf(p) !== i);
  if (repetido) return { error: `${repetido} está dos veces en A.` };
  return { elementos: partes };
}

/** The pairs as typed: (1,2), (2,3). Every element has to be in A. Empty is the empty relation. */
export function leerPares(texto, elementos) {
  const t = String(texto).trim();
  const pares = [];
  const vistos = new Set();
  const PAR = /\(\s*([^\s(),;{}]+)\s*[,;]\s*([^\s(),;{}]+)\s*\)/g;
  let resto = t;
  for (const m of t.matchAll(PAR)) {
    for (const e of [m[1], m[2]]) if (!elementos.includes(e)) return { error: `En ${m[0]}, ${e.slice(0, 12)} no está en A.` };
    const k = `${m[1]},${m[2]}`;
    if (!vistos.has(k)) {
      vistos.add(k);
      pares.push([m[1], m[2]]);
    }
    resto = resto.replace(m[0], ' ');
  }
  const sobra = resto.replace(/[\s,;{}∅]/g, '');
  if (sobra) return { error: `No entiendo «${sobra.slice(0, 16)}». Los pares van como (1,2), (2,3).` };
  return { pares };
}

export const par = ([a, b]) => `(${a},${b})`;
export const conjunto = (xs) => (xs.length ? `{${xs.join(', ')}}` : '∅');
export const deParesTexto = (pares) => (pares.length ? `{${pares.map(par).join(', ')}}` : '∅');

const TOPE_LISTA = 24;
const lista = (xs) => (xs.length > TOPE_LISTA ? `${xs.slice(0, TOPE_LISTA).join(', ')} y ${xs.length - TOPE_LISTA} más` : xs.join(', '));

/** Everything the sheet shows of R on A. */
export function analizar(elementos, pares) {
  const hay = new Set(pares.map(([a, b]) => `${a},${b}`));
  const esta = (a, b) => hay.has(`${a},${b}`);
  // In the order of A, as the course lists them.
  const orden = (ps) => elementos.flatMap((a) => elementos.flatMap((b) => ps.filter(([x, y]) => x === a && y === b)));
  const ordenados = orden(pares);
  const dominio = elementos.filter((a) => pares.some(([x]) => x === a));
  const rango = elementos.filter((b) => pares.some(([, y]) => y === b));

  // R²: (a,b) when there is x with (a,x) and (x,b) in R, a path of length 2. The first x found is kept to show it.
  const vias = new Map();
  for (const [a, x] of ordenados) for (const [y, b] of ordenados) if (x === y && !vias.has(`${a},${b}`)) vias.set(`${a},${b}`, { par: [a, b], por: x });
  const r2 = elementos.flatMap((a) => elementos.flatMap((b) => (vias.has(`${a},${b}`) ? [vias.get(`${a},${b}`)] : [])));
  const fuera = r2.filter(({ par: [a, b] }) => !esta(a, b));

  const p = (a, b) => `(${a},${b})`;
  const bucles = ordenados.filter(([a, b]) => a === b);
  const sinBucle = elementos.find((a) => !esta(a, a));
  const idaSinVuelta = ordenados.find(([a, b]) => !esta(b, a));
  const idaYVuelta = ordenados.find(([a, b]) => a !== b && esta(b, a));
  const cadenas = [];
  let rota = null;
  for (const [a, x] of ordenados) {
    for (const [y, b] of ordenados) {
      if (x !== y) continue;
      if (!esta(a, b)) rota = rota || [a, x, b];
      else cadenas.push(`${p(a, x)} y ${p(x, b)} dan ${p(a, b)}`);
    }
  }
  const vacia = !pares.length;
  const propiedades = [
    { nombre: 'Reflexiva', cumple: !sinBucle, por: sinBucle ? `${p(sinBucle, sinBucle)} no está.` : `Están ${lista(elementos.map((a) => p(a, a)))}.` },
    { nombre: 'Irreflexiva', cumple: !bucles.length, por: bucles.length ? `${p(...bucles[0])} está.` : 'Ningún elemento está relacionado con sí mismo.' },
    {
      nombre: 'Simétrica',
      cumple: !idaSinVuelta,
      por: idaSinVuelta ? `${p(...idaSinVuelta)} está y ${p(idaSinVuelta[1], idaSinVuelta[0])} no.` : vacia ? 'No hay ningún par. Se cumple por vacuidad.' : `Cada par tiene su vuelta. Están ${lista(ordenados.map(([a, b]) => p(a, b)))}.`,
    },
    {
      nombre: 'Asimétrica',
      cumple: !bucles.length && !idaYVuelta,
      por: bucles.length ? `${p(...bucles[0])} está. La asimétrica no deja bucles.` : idaYVuelta ? `Están ${p(...idaYVuelta)} y ${p(idaYVuelta[1], idaYVuelta[0])}.` : vacia ? 'No hay ningún par. Se cumple por vacuidad.' : 'Ningún par tiene vuelta y no hay bucles.',
    },
    {
      nombre: 'Antisimétrica',
      cumple: !idaYVuelta,
      por: idaYVuelta ? `Están ${p(...idaYVuelta)} y ${p(idaYVuelta[1], idaYVuelta[0])}, con ${idaYVuelta[0]} ≠ ${idaYVuelta[1]}.` : ordenados.some(([a, b]) => a !== b) ? 'Entre elementos distintos, ningún par tiene vuelta.' : 'No hay pares entre elementos distintos. Se cumple por vacuidad.',
    },
    {
      nombre: 'Transitiva',
      cumple: !rota,
      por: rota ? `Están ${p(rota[0], rota[1])} y ${p(rota[1], rota[2])}, pero ${p(rota[0], rota[2])} no.` : cadenas.length ? `${lista(cadenas)}.` : 'No hay dos flechas seguidas. Se cumple por vacuidad.',
    },
  ];
  const tiene = (n) => propiedades.find((x) => x.nombre === n).cumple;
  const equivalencia = tiene('Reflexiva') && tiene('Simétrica') && tiene('Transitiva');
  const deOrden = tiene('Reflexiva') && tiene('Antisimétrica') && tiene('Transitiva');
  let clases = null;
  if (equivalencia) {
    const ya = new Set();
    clases = [];
    for (const a of elementos) {
      if (ya.has(a)) continue;
      const c = elementos.filter((b) => esta(a, b));
      c.forEach((b) => ya.add(b));
      clases.push({ de: a, elementos: c });
    }
  }
  return { pares: ordenados, dominio, rango, r2, fuera, transitiva: !fuera.length, propiedades, equivalencia, deOrden, clases };
}

/** The 0 and 1 of the matrix of R: row a, column b is 1 when (a,b) is in R. */
export const matriz = (elementos, pares) => {
  const hay = new Set(pares.map(([a, b]) => `${a},${b}`));
  return elementos.map((a) => elementos.map((b) => (hay.has(`${a},${b}`) ? 1 : 0)));
};
