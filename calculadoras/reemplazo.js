// Reemplazo de páginas of Sistemas Operativos, as the practice of virtual memory does it (of El Santo
// Resumen, «Cómo se hace el ejercicio de reemplazo»): a column per referenced page, a row per frame, and on a fault
// who leaves. FIFO, LRU and OPT as the practice, with FIFO breaking the ties of OPT; second chance and clock as teoría
// 3a. The bit R goes to 1 on loading and on every reference, and only the algorithm clears it. Each new page goes into
// the frame of the one that leaves. Logic of El Santo Resumen's simulator (its simulator code).

export const ALGORITMOS = { fifo: 'FIFO', lru: 'LRU', opt: 'Óptimo', seg: 'Segunda oportunidad', reloj: 'Reloj' };
export const usaR = (alg) => alg === 'seg' || alg === 'reloj';
export const MAX_REFERENCIAS = 60;
export const MAX_MARCOS = 10;

/**
 * Each reference: the page, the frames after it (null when free), the bits R, where the clock's hand is left, whether
 * it was a fault, the frame it went into and why. `motivo` says what the algorithm looked at:
 * fifo { cargada } (the reference where the leaving page came in), lru { usada }, opt { proximas: [{ pagina, en }],
 * empate }, seg { vueltas: [pages that got their second chance], lista }, reloj { desde, vueltas: [frames] }.
 */
export function reemplazar(refs, m, alg) {
  const marcos = Array(m).fill(null);
  const R = Array(m).fill(0);
  const carga = Array(m).fill(-1);
  const uso = Array(m).fill(-1);
  let lista = [];
  let mano = 0;
  let fallos = 0;
  const pasos = refs.map((pagina, k) => {
    const en = marcos.indexOf(pagina);
    if (en >= 0) {
      uso[en] = k;
      R[en] = 1;
      return { pagina, marcos: marcos.slice(), R: R.slice(), mano, fallo: false, donde: en };
    }
    fallos += 1;
    let donde = marcos.indexOf(null);
    let sale = null;
    let motivo = null;
    if (donde >= 0) {
      if (alg === 'seg') lista.push(donde);
      if (alg === 'reloj') mano = (donde + 1) % m;
    } else if (alg === 'fifo') {
      donde = carga.indexOf(Math.min(...carga));
      motivo = { cargada: carga[donde] };
    } else if (alg === 'lru') {
      donde = uso.indexOf(Math.min(...uso));
      motivo = { usada: uso[donde] };
    } else if (alg === 'opt') {
      const prox = marcos.map((x) => {
        const i = refs.indexOf(x, k + 1);
        return i < 0 ? Infinity : i;
      });
      const lejos = Math.max(...prox);
      const candidatos = marcos.map((_, j) => j).filter((j) => prox[j] === lejos);
      donde = candidatos.reduce((a, b) => (carga[b] < carga[a] ? b : a));
      motivo = { proximas: marcos.map((x, j) => ({ pagina: x, en: prox[j] })), empate: candidatos.length > 1 ? candidatos.map((j) => marcos[j]) : [] };
    } else if (alg === 'seg') {
      const vueltas = [];
      while (R[lista[0]]) {
        const j = lista.shift();
        R[j] = 0;
        lista.push(j);
        vueltas.push(marcos[j]);
      }
      donde = lista.shift();
      lista.push(donde);
      motivo = { vueltas };
    } else {
      const desde = mano;
      const vueltas = [];
      while (R[mano]) {
        R[mano] = 0;
        vueltas.push(mano);
        mano = (mano + 1) % m;
      }
      donde = mano;
      mano = (mano + 1) % m;
      motivo = { desde, vueltas };
    }
    if (marcos[donde] !== null) sale = marcos[donde];
    marcos[donde] = pagina;
    carga[donde] = k;
    uso[donde] = k;
    R[donde] = 1;
    if (alg === 'seg' && motivo) motivo.lista = lista.map((j) => marcos[j]);
    return { pagina, marcos: marcos.slice(), R: R.slice(), mano, fallo: true, donde, sale, motivo };
  });
  return { pasos, fallos };
}

/** The reference string: pages split by spaces, commas or semicolons, numbers or letters of up to 4. */
export function leerCadena(texto) {
  const fichas = String(texto ?? '').split(/[\s,;]+/).filter(Boolean);
  if (!fichas.length) return { error: 'Falta la cadena de referencias.' };
  if (fichas.length > MAX_REFERENCIAS) return { error: `Son ${fichas.length} referencias y entran hasta ${MAX_REFERENCIAS}.` };
  const mala = fichas.find((x) => !/^[\p{L}\p{N}]{1,4}$/u.test(x));
  if (mala) return { error: `«${mala.slice(0, 10)}» no sirve de página. Van números o letras, hasta 4.` };
  return { refs: fichas };
}

/** Faults of every algorithm with m frames and with one more, as the finals ask («con 3 y 4 marcos»). */
export function comparar(refs, m) {
  const marcos = [m, m + 1].filter((x) => x <= MAX_MARCOS);
  return {
    marcos,
    filas: Object.keys(ALGORITMOS).map((alg) => ({ alg, fallos: marcos.map((x) => reemplazar(refs, x, alg).fallos) })),
  };
}
