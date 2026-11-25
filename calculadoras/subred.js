// Subredes of Redes de Datos, with the practice's method (parcial-2.md of El Santo Resumen, Conceptos IPv4, pages 23 to
// 27): three formulas, 2^N ≥ C, 2^M − 2 = H and salto = 256 − the last decimal of the mask. N are the subnet bits, C
// the subnets asked, M the host bits and H the hosts. The network comes out of an AND between address and mask.
// Logic of El Santo Resumen's simulator (its simulator code). VLSM is not in the notes.

export const MAX_LISTA = 16;
export const ORDINAL = ['primer', 'segundo', 'tercer', 'cuarto'];

export const aTexto = (n) => [24, 16, 8, 0].map((s) => (n >>> s) & 255).join('.');
export const mascaraDe = (p) => (p === 0 ? 0 : (0xffffffff << (32 - p)) >>> 0);
/** The 32 bits of a number, as text. */
export const bitsDe = (n) => (n >>> 0).toString(2).padStart(32, '0');

/** An address as typed, with its prefix (/24) or its mask (255.255.255.0) after it. { ip, p, red } or { error }. */
export function leerRed(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return { error: 'Falta la red.' };
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})\s*(?:\/\s*(\d{1,2})|\s+(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3}))$/.exec(t);
  if (!m) return { error: 'Va la red con su prefijo, como 192.168.1.0/24, o con su máscara, como 192.168.1.0 255.255.255.0.' };
  const octetos = m.slice(1, 5).map(Number);
  if (octetos.some((o) => o > 255)) return { error: 'Cada número de la dirección va de 0 a 255.' };
  let p;
  if (m[5] !== undefined) {
    p = Number(m[5]);
    if (p < 1 || p > 30) return { error: 'El prefijo va de 1 a 30. Con /31 o /32 no quedan hosts.' };
  } else {
    const mk = m.slice(6, 10).map(Number);
    if (mk.some((o) => o > 255)) return { error: 'Cada número de la máscara va de 0 a 255.' };
    const v = mk.reduce((a, o) => a * 256 + o, 0);
    p = bitsDe(v).indexOf('0');
    if (p < 0) p = 32;
    if (mascaraDe(p) !== v) return { error: 'Esa máscara no sirve. Son todos unos seguidos y después todos ceros.' };
    if (p < 1 || p > 30) return { error: 'Con esa máscara no quedan hosts.' };
  }
  const ip = octetos.reduce((a, o) => a * 256 + o, 0);
  return { ip, p, red: (ip & mascaraDe(p)) >>> 0 };
}

/**
 * The exercise: the network and what is asked (pide: 'c' subnets, 'h' hosts per subnet, 'n' subnet bits) with how
 * many. { ... } with every number of the resolution, or { error, en } with the field that is wrong.
 */
export function subdividir(textoRed, pide, cuanto) {
  const r = leerRed(textoRed);
  if (r.error) return { error: r.error, en: 'red' };
  const t = String(cuanto ?? '').trim();
  const nombre = { c: 'la cantidad de subredes', h: 'la cantidad de hosts', n: 'la cantidad de bits' }[pide];
  if (!t) return { error: `Falta ${nombre}.`, en: 'cuanto' };
  if (!/^\d{1,9}$/.test(t)) return { error: `En ${nombre} va un número entero.`, en: 'cuanto' };
  const k = Number(t);
  const libres = 32 - r.p;
  let N;
  let M;
  if (pide === 'c') {
    if (k < 1) return { error: 'Va 1 subred o más.', en: 'cuanto' };
    N = 0;
    while (2 ** N < k) N += 1;
    M = libres - N;
    if (M < 2) return { error: `Para ${k} subredes hacen falta ${N} bits. La red /${r.p} tiene ${libres} libres y no quedan 2 para hosts.`, en: 'cuanto' };
  } else if (pide === 'h') {
    if (k < 1) return { error: 'Va 1 host o más.', en: 'cuanto' };
    M = 2;
    while (2 ** M - 2 < k) M += 1;
    N = libres - M;
    if (N < 0) return { error: `Para ${k} hosts hacen falta ${M} bits. La red /${r.p} tiene ${libres} libres.`, en: 'cuanto' };
  } else {
    N = k;
    M = libres - N;
    if (M < 2) return { error: `La red /${r.p} tiene ${libres} bits libres. N va de 0 a ${libres - 2}.`, en: 'cuanto' };
  }
  const p2 = r.p + N;
  const mascara = mascaraDe(p2);
  const octeto = Math.floor((p2 - 1) / 8);
  const ultimo = (mascara >>> (24 - 8 * octeto)) & 255;
  const salto = 256 - ultimo;
  const tam = 2 ** M;
  const cantidad = 2 ** N;
  const fila = (i) => {
    const base = r.red + i * tam;
    return { i, red: aTexto(base), primera: aTexto(base + 1), ultima: aTexto(base + tam - 2), broadcast: aTexto(base + tam - 1) };
  };
  const filas = Array.from({ length: Math.min(cantidad, MAX_LISTA) }, (_, i) => fila(i));
  const ultima = cantidad > MAX_LISTA ? fila(cantidad - 1) : null;
  return { ...r, pide, k, libres, N, M, p2, mascara, octeto, ultimo, salto, cantidad, hosts: tam - 2, filas, ultima };
}
