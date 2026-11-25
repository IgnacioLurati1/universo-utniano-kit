import { leerNumero, redondear } from './cifras.js';

// Planificación de la CPU of Sistemas Operativos, as the course notes do it (parcial.md of El Santo Resumen, teoría 2b
// and the practice of planning): FCFS, SJF and SRTN for batches, Round Robin and priority for interactive systems.
// Waiting and turnaround as the practice measures them. The logic is El Santo Resumen's simulator
// (its simulator code), returning what happens instead of sentences.

export const ALGORITMOS = {
  fcfs: 'FCFS',
  sjf: 'SJF',
  srtn: 'SRTN',
  rr: 'Round Robin',
  prio: 'Prioridad no apropiativa',
  prioa: 'Prioridad apropiativa',
};

export const usaPrioridad = (alg) => alg === 'prio' || alg === 'prioa';
export const MAX_PROCESOS = 12;
const MAX_TURNOS = 400;
const TOPE = 9999;
const r9 = (x) => Math.round(x * 1e9) / 1e9;

/** A time as the notes write it: comma for decimals, up to 3, the real minus sign and no thousands dot. */
export const tiempo = (x) => String(redondear(Math.abs(x) < 1e-12 ? 0 : x, 3)).replace('.', ',').replace('-', '−');

/**
 * P: [{ nombre, llegada, rafaga, prioridad }] in the student's order. The highest priority is the smallest number
 * unless `chicoEsMas` is false. Ties go to the one that arrived first and, if they arrived together, to the one first
 * in the list (FCFS). In Round Robin, whoever arrives right when a quantum ends goes into the queue before the one
 * leaving the CPU. SRTN and the appropriative priority take the CPU away only if the newcomer is strictly better: the
 * notes compare the newcomer's whole time with what the running one has left.
 *
 * Each turn on the CPU says when it starts (t), who was ready (listos, in queue order for Round Robin), who runs
 * until when, why it ends (termina, quantum, desalojo) and who arrived meanwhile without taking it.
 */
export function planificar(P, alg, { quantum = 1, chicoEsMas = true } = {}) {
  const n = P.length;
  const resta = P.map((p) => p.rafaga);
  const fin = Array(n).fill(0);
  const orden = P.map((_, i) => i).sort((a, b) => P[a].llegada - P[b].llegada || a - b);
  const tramos = [];
  const turnos = [];
  const prio = (i) => (chicoEsMas ? P[i].prioridad : -P[i].prioridad);
  const clave = { fcfs: (i) => P[i].llegada, sjf: (i) => P[i].rafaga, srtn: (i) => resta[i], rr: () => 0, prio, prioa: prio }[alg];
  const antes = (a, b) => clave(a) - clave(b) || P[a].llegada - P[b].llegada || a - b;
  const mejor = (xs) => xs.reduce((a, b) => (antes(b, a) < 0 ? b : a));
  let t = 0;
  let k = 0;
  let hechos = 0;
  let listos = [];
  const traer = (hasta) => {
    const nuevos = [];
    while (k < n && P[orden[k]].llegada <= hasta + 1e-9) {
      listos.push(orden[k]);
      nuevos.push(orden[k]);
      k += 1;
    }
    return nuevos;
  };
  const tramo = (i, a, b) => {
    if (b - a < 1e-9) return;
    const u = tramos[tramos.length - 1];
    if (u && u.i === i && alg !== 'rr' && Math.abs(u.b - a) < 1e-9) u.b = b;
    else tramos.push({ i, a, b });
  };

  while (hechos < n) {
    traer(t);
    if (!listos.length) {
      const hasta = P[orden[k]].llegada;
      tramo(null, t, hasta);
      turnos.push({ t, ociosa: true, hasta, llega: orden[k] });
      t = hasta;
      continue;
    }
    if (alg === 'rr') {
      const cola = listos.slice();
      const e = listos.shift();
      const desde = t;
      const corre = Math.min(quantum, resta[e]);
      t = r9(desde + corre);
      tramo(e, desde, t);
      resta[e] = r9(resta[e] - corre);
      const llegan = traer(t);
      const turno = { t: desde, listos: cola, corre: e, hasta: t, llegan };
      if (resta[e] > 1e-9) {
        turno.motivo = 'quantum';
        turno.queda = resta[e];
        turno.sigue = !listos.length;
        listos.push(e);
      } else {
        turno.motivo = 'termina';
        fin[e] = t;
        hechos += 1;
      }
      turnos.push(turno);
      continue;
    }
    const vistos = listos.slice();
    const e = mejor(listos);
    listos = listos.filter((x) => x !== e);
    const empate = vistos.filter((x) => x !== e && clave(x) === clave(e));
    const turno = { t, listos: vistos, corre: e, valor: clave(e), resta: resta[e], empate, llegan: [] };
    if (alg === 'srtn' || alg === 'prioa') {
      while (k < n && P[orden[k]].llegada < t + resta[e] - 1e-9) {
        const llega = P[orden[k]].llegada;
        tramo(e, t, llega);
        resta[e] = r9(resta[e] - (llega - t));
        t = llega;
        const nuevos = traer(t);
        const m = mejor(nuevos);
        if (clave(m) < clave(e)) {
          turno.motivo = 'desalojo';
          turno.por = m;
          turno.queda = resta[e];
          turno.hasta = t;
          listos.push(e);
          break;
        }
        turno.llegan.push({ t, quienes: nuevos, le: resta[e] });
      }
    }
    if (!turno.motivo) {
      const desde = t;
      t = r9(t + resta[e]);
      tramo(e, desde, t);
      resta[e] = 0;
      fin[e] = t;
      hechos += 1;
      turno.motivo = 'termina';
      turno.hasta = t;
    }
    turnos.push(turno);
  }
  const retorno = P.map((p, i) => r9(fin[i] - p.llegada));
  const espera = P.map((p, i) => r9(retorno[i] - p.rafaga));
  const promedio = (xs) => xs.reduce((a, b) => a + b, 0) / n;
  return { tramos, turnos, fin, retorno, espera, esperaPromedio: promedio(espera), retornoPromedio: promedio(retorno), total: t };
}

const NOMBRE = /^[\p{L}\p{N}_-]{1,8}$/u;

/**
 * The processes as typed, one row each ({ nombre, llegada, rafaga, prioridad } in text), with the quantum and whether
 * priorities count. { P, quantum } or { error: { fila, campo, texto } }, where campo names the cell that is wrong.
 */
export function leerProcesos(filas, { alg, quantum }) {
  const P = [];
  const mal = (fila, campo, texto) => ({ error: { fila, campo, texto } });
  for (let i = 0; i < filas.length; i += 1) {
    const f = filas[i];
    const nombre = String(f.nombre ?? '').trim();
    if (!nombre) return mal(i, 'nombre', `Falta el nombre del proceso ${i + 1}.`);
    if (!NOMBRE.test(nombre)) return mal(i, 'nombre', `«${nombre.slice(0, 12)}» no sirve de nombre. Van letras y números, hasta 8.`);
    const otro = P.findIndex((p) => p.nombre === nombre);
    if (otro >= 0) return mal(i, 'nombre', `${nombre} está dos veces.`);
    const llegada = leerNumero(f.llegada);
    if (llegada.falta) return mal(i, 'llegada', `Falta la llegada de ${nombre}.`);
    if (llegada.mal || llegada.valor < 0 || llegada.valor > TOPE) return mal(i, 'llegada', `La llegada de ${nombre} va de 0 a ${TOPE}.`);
    const rafaga = leerNumero(f.rafaga);
    if (rafaga.falta) return mal(i, 'rafaga', `Falta la ráfaga de ${nombre}.`);
    if (rafaga.mal || !(rafaga.valor > 0) || rafaga.valor > TOPE) return mal(i, 'rafaga', `La ráfaga de ${nombre} va de más de 0 a ${TOPE}.`);
    let prioridad = 0;
    if (usaPrioridad(alg)) {
      const p = leerNumero(f.prioridad);
      if (p.falta) return mal(i, 'prioridad', `Falta la prioridad de ${nombre}.`);
      if (p.mal || !Number.isInteger(p.valor) || Math.abs(p.valor) > 999) return mal(i, 'prioridad', `La prioridad de ${nombre} es un entero de −999 a 999.`);
      prioridad = p.valor;
    }
    P.push({ nombre, llegada: llegada.valor, rafaga: rafaga.valor, prioridad });
  }
  let q = 1;
  if (alg === 'rr') {
    const leido = leerNumero(quantum);
    if (leido.falta) return mal(-1, 'quantum', 'Falta el quantum.');
    if (leido.mal || !(leido.valor > 0) || leido.valor > TOPE) return mal(-1, 'quantum', `El quantum va de más de 0 a ${TOPE}.`);
    q = leido.valor;
    if (P.reduce((s, p) => s + Math.ceil(p.rafaga / q - 1e-9), 0) > MAX_TURNOS) return mal(-1, 'quantum', `Con ese quantum son más de ${MAX_TURNOS} turnos. Probá con uno más grande.`);
  }
  return { P, quantum: q };
}

/** The same processes with every algorithm, to compare. Round Robin if there's a quantum; priority, if it counts. */
export function comparar(P, { quantum, chicoEsMas, conPrioridad, conRoundRobin = true }) {
  return Object.keys(ALGORITMOS)
    .filter((a) => (conPrioridad || !usaPrioridad(a)) && (conRoundRobin || a !== 'rr'))
    .map((a) => {
      const r = planificar(P, a, { quantum, chicoEsMas });
      return { alg: a, espera: r.esperaPromedio, retorno: r.retornoPromedio };
    });
}
