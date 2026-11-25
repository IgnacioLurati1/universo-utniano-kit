// Ventana de congestión of Redes de Datos, as the notes tell it (parcial-2.md of El Santo Resumen, Capa de Transporte,
// TCP, pages 14 to 16): slow start doubles the window up to the threshold, then it grows by one per round. On a loss
// the threshold drops to half the window. Tahoe starts again from 1 with slow start; Reno, with fast recovery, goes on
// from the new threshold. The book's figure starts with threshold 32 and loses a segment with the window at 40.
// Logic of El Santo Resumen's simulator (its simulator code).

export const MAX_RONDAS = 60;
const TOPE = 100000;

/** The window at the start of every round, the threshold then and what happens in it. */
export function correr({ umbral: umbral0, inicial, rondas, perdidas }, reno) {
  const pierde = new Set(perdidas);
  const serie = [];
  let ventana = inicial;
  let umbral = umbral0;
  for (let ronda = 0; ronda <= rondas; ronda += 1) {
    const fase = pierde.has(ronda) ? 'perdida' : ventana < umbral ? 'slow' : 'aditivo';
    serie.push({ ronda, ventana, umbral, fase });
    if (pierde.has(ronda)) {
      umbral = Math.max(1, Math.floor(ventana / 2));
      ventana = reno ? umbral : 1;
    } else {
      ventana = ventana < umbral ? Math.min(ventana * 2, umbral) : ventana + 1;
    }
  }
  return serie;
}

const entero = (t) => (/^\s*\d{1,9}\s*$/.test(String(t ?? '')) ? Number(t) : NaN);

/** The fields as typed. { umbral, inicial, rondas, perdidas } or { error, en } with the field that is wrong. */
export function leerVentana({ umbral, inicial, rondas, perdidas }) {
  const u = entero(umbral);
  if (!(u >= 1 && u <= TOPE)) return { error: 'El umbral es un entero de 1 en adelante.', en: 'umbral' };
  const v = entero(inicial);
  if (!(v >= 1 && v <= TOPE)) return { error: 'La ventana inicial es un entero de 1 en adelante.', en: 'inicial' };
  const r = entero(rondas);
  if (!(r >= 1 && r <= MAX_RONDAS)) return { error: `Las rondas van de 1 a ${MAX_RONDAS}.`, en: 'rondas' };
  const lista = new Set();
  for (const p of String(perdidas ?? '').split(/[\s,;]+/).filter(Boolean)) {
    const n = entero(p);
    if (!Number.isFinite(n)) return { error: `«${p.slice(0, 12)}» no es una ronda. Van enteros, como 8, 15.`, en: 'perdidas' };
    if (n > r) return { error: `La ronda ${n} queda después de la última, la ${r}.`, en: 'perdidas' };
    lista.add(n);
  }
  return { umbral: u, inicial: v, rondas: r, perdidas: [...lista].sort((a, b) => a - b) };
}

/** Rounds in a row with the same phase: { fase, desde, hasta, valores }. */
export function tramos(serie) {
  const salida = [];
  for (const x of serie) {
    const u = salida[salida.length - 1];
    if (u && u.fase === x.fase && x.fase !== 'perdida' && u.hasta === x.ronda - 1) {
      u.hasta = x.ronda;
      u.valores.push(x.ventana);
    } else salida.push({ fase: x.fase, desde: x.ronda, hasta: x.ronda, valores: [x.ventana] });
  }
  return salida;
}
