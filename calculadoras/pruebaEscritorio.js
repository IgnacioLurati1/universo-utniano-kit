// Desk checks of Simulación, event by event, as the course notes run them (El Santo Resumen,
// course notes, folios 7 to 23): the single-server queue and the (s, S) inventory. The logic is the simulator's
// of El Santo Resumen (its simulator code, simularCola and simularInventario), with the same order of
// events on a tie and the same use of the random numbers. Each row is the state after one event, with what changed.

import { coma, entreParentesis } from './cifras.js';

const INF = Infinity;
const r9 = (x) => Math.round(x * 1e9) / 1e9;
const f = (x) => coma(x, 4);
const SUB = '₀₁₂₃₄₅₆₇₈₉';
/** «U₁₂». */
export const subindice = (n) => [...String(n)].map((c) => SUB[Number(c)]).join('');

// ----- The queue (folios 7 to 13): arrival and departure, FIFO, ends at the n-th delay.
const areasCola = (dt, q, b) => {
  if (!dt || (!q && !b)) return '';
  if (!q) return ` El área de B(t) suma ${f(dt)}.`;
  return ` El área de Q(t) suma ${q} × ${f(dt)} = ${f(q * dt)}${b ? ` y la de B(t), ${f(dt)}` : ''}.`;
};

/**
 * A: times between arrivals (A₁ is the hour of the first arrival). S: service times in the order the clients enter.
 * n: the run ends at the n-th delay. Each row: { reloj, evento, cliente, B, Q, cola (arrival hours), proxArribo,
 * proxPartida, demorados, demoraTotal, areaQ, areaB, texto }. On a tie the arrival goes first: the notes' timing routine
 * picks the lowest-numbered event (folio 22), and the arrival is the 1.
 */
export function simularCola({ A, S, n }) {
  const filas = [];
  let reloj = 0;
  let B = 0;
  let cola = [];
  let demorados = 0;
  let demoraTotal = 0;
  let areaQ = 0;
  let areaB = 0;
  let llegados = 0;
  let enServicio = 0;
  let iA = 1;
  let iS = 0;
  let proxArribo = r9(A[0]);
  let proxPartida = INF;
  const foto = (evento, cliente, texto) => filas.push({ reloj, evento, cliente, B, Q: cola.length, cola: cola.map((x) => x.t), proxArribo, proxPartida, demorados, demoraTotal, areaQ, areaB, texto });
  foto('inicio', 0, `El reloj arranca en 0, con el sistema vacío y el servidor libre. El primer arribo es en ${f(proxArribo)}.`);
  while (demorados < n && filas.length < 500) {
    const esArribo = proxArribo <= proxPartida;
    const t = esArribo ? proxArribo : proxPartida;
    const dt = r9(t - reloj);
    const areas = areasCola(dt, cola.length, B);
    areaQ = r9(areaQ + cola.length * dt);
    areaB = r9(areaB + B * dt);
    reloj = t;
    let texto;
    let cliente;
    if (esArribo) {
      llegados += 1;
      cliente = llegados;
      let prox;
      if (iA < A.length) {
        proxArribo = r9(t + A[iA]);
        prox = ` El próximo arribo es en ${f(t)} + ${f(A[iA])} = ${f(proxArribo)}.`;
        iA += 1;
      } else {
        proxArribo = INF;
        prox = ' No quedan tiempos entre arribos. No hay otro arribo.';
      }
      if (B) {
        cola.push({ t, c: llegados });
        texto = `Llega el cliente ${llegados} y el servidor está ocupado. Espera en la cola.${prox}`;
      } else {
        demorados += 1;
        B = 1;
        enServicio = llegados;
        proxPartida = r9(t + S[iS]);
        texto = `Llega el cliente ${llegados} y el servidor está libre. Su demora es 0 y sale en ${f(t)} + ${f(S[iS])} = ${f(proxPartida)}.${prox}`;
        iS += 1;
      }
      foto('arribo', cliente, `${texto}${areas}`);
    } else {
      cliente = enServicio;
      if (!cola.length) {
        texto = `Sale el cliente ${enServicio} y no queda nadie. El servidor se libera.`;
        B = 0;
        enServicio = 0;
        proxPartida = INF;
      } else {
        const p = cola[0];
        cola = cola.slice(1);
        const d = r9(t - p.t);
        demorados += 1;
        demoraTotal = r9(demoraTotal + d);
        proxPartida = r9(t + S[iS]);
        texto = `Sale el cliente ${enServicio} y entra el ${p.c}, que llegó en ${f(p.t)}. Su demora es ${f(t)} − ${f(p.t)} = ${f(d)} y sale en ${f(t)} + ${f(S[iS])} = ${f(proxPartida)}.`;
        enServicio = p.c;
        iS += 1;
      }
      foto('partida', cliente, `${texto}${areas}`);
    }
    if (demorados >= n) filas.at(-1).texto += ` Con ${n} ${n === 1 ? 'demora' : 'demoras'} termina la corrida.`;
  }
  const T = reloj;
  return { filas, fin: { n, T, demoraTotal, areaQ, areaB, d: demoraTotal / n, q: areaQ / T, u: areaB / T } };
}

// ----- The inventory with an (s, S) policy (folios 21 to 23).
class FaltanU extends Error {}

const areasInventario = (dt, I) => {
  if (!dt || !I) return '';
  return I > 0 ? ` El área de I⁺ suma ${I} × ${f(dt)} = ${f(I * dt)}.` : ` El área de I⁻ suma ${-I} × ${f(dt)} = ${f(-I * dt)}.`;
};

/**
 * d: { I0, s, S, n, K, i, h, pi, beta, a, b, dec, tamanos, probs, U }. The random numbers are used in this order, as
 * they are needed: one for the first demand time; in each demand, one for its size and one for the time to the next
 * demand; in each order, one for the supplier's delay (folio 23). On a tie the events go as the notes number them:
 * order arrival, demand, end and evaluation (folio 22). Each row: { reloj, evento, aleatorios, I, enCamino, proxArribo,
 * proxDemanda, fin, proxEval, areaMas, areaMenos, costo, texto }.
 */
export function simularInventario(d) {
  const { I0, s, S, n, K, i: ci, h, pi, beta, a, b, dec, tamanos, probs, U } = d;
  let suma = 0;
  const acum = probs.map((p) => {
    suma += p;
    return Math.round(suma * 1e12) / 1e12;
  });
  acum[acum.length - 1] = 1;
  const red = dec === null ? r9 : (x) => r9(Math.round(x * 10 ** dec) / 10 ** dec);
  const filas = [];
  let k = 0;
  const tomar = () => {
    if (k >= U.length) throw new FaltanU();
    k += 1;
    return { u: U[k - 1], idx: k };
  };
  const nombre = (x) => `U${subindice(x.idx)}`;
  let reloj = 0;
  let I = I0;
  let enCamino = 0;
  let areaMas = 0;
  let areaMenos = 0;
  let costo = 0;
  let pedidos = 0;
  let proxArribo = INF;
  let proxDemanda = INF;
  let proxEval = 0;
  const foto = (evento, aleatorios, texto) => filas.push({ reloj, evento, aleatorios, I, enCamino, proxArribo, proxDemanda, fin: n, proxEval, areaMas, areaMenos, costo, texto });
  const salto = () => {
    const u = tomar();
    return { ...u, dt: red(-beta * Math.log(u.u)) };
  };
  let corte = '';
  try {
    const u = salto();
    proxDemanda = u.dt;
    foto('inicio', [{ nombre: nombre(u), u: u.u }], `El reloj arranca en 0 con I(0) = ${I0} y nada pedido. La primera demanda es en −${f(beta)}·ln(${f(u.u)}) = ${f(u.dt)}.`);
    for (;;) {
      if (filas.length > 600) throw new FaltanU();
      const lista = [proxArribo, proxDemanda, n, proxEval];
      let tipo = 0;
      for (let j = 1; j < 4; j += 1) if (lista[j] < lista[tipo]) tipo = j;
      const t = lista[tipo];
      const dt = r9(t - reloj);
      const areas = areasInventario(dt, I);
      if (I > 0) areaMas = r9(areaMas + I * dt);
      else if (I < 0) areaMenos = r9(areaMenos - I * dt);
      reloj = t;
      const antes = I;
      if (tipo === 0) {
        I += enCamino;
        const texto = `Llega el pedido de ${enCamino} y I pasa de ${f(antes)} a ${f(I)}.${antes < 0 ? ' Primero se cubre lo que se les debía a los clientes.' : ''}${areas}`;
        enCamino = 0;
        proxArribo = INF;
        foto('pedido', [], texto);
      } else if (tipo === 1) {
        const u1 = tomar();
        let j = 0;
        while (j < acum.length - 1 && u1.u >= acum[j]) j += 1;
        I -= tamanos[j];
        const u2 = salto();
        proxDemanda = r9(t + u2.dt);
        const tramo = `[${f(j ? acum[j - 1] : 0)}; ${f(acum[j])})`;
        const deuda = I < 0 ? `. Se les deben ${-I} a los clientes` : '';
        foto(
          'demanda',
          [{ nombre: nombre(u1), u: u1.u }, { nombre: nombre(u2), u: u2.u }],
          `${nombre(u1)} = ${f(u1.u)} cae en ${tramo} y se llevan ${tamanos[j]}. I pasa de ${f(antes)} a ${f(I)}${deuda}. La próxima demanda es en ${f(t)} − ${f(beta)}·ln(${f(u2.u)}) = ${f(t)} + ${f(u2.dt)} = ${f(proxDemanda)}.${areas}`,
        );
      } else if (tipo === 2) {
        const sinEval = proxEval === n ? ' La evaluación de ese instante no se hace, porque el fin va antes.' : '';
        foto('fin', [], `Fin de la corrida a los ${n} ${n === 1 ? 'mes' : 'meses'}.${sinEval}${areas}`);
        break;
      } else {
        const mes = Math.round(t) + 1;
        let usados = [];
        let texto = `Evaluación al principio del mes ${mes}.`;
        if (I < s) {
          const Z = S - I;
          const c = K + ci * Z;
          costo = r9(costo + c);
          pedidos += 1;
          enCamino = Z;
          const u = tomar();
          const demora = red(a + u.u * (b - a));
          proxArribo = r9(t + demora);
          usados = [{ nombre: nombre(u), u: u.u }];
          texto += ` I = ${f(I)} es menor que s = ${s}. Se piden Z = ${S} − ${entreParentesis(I)} = ${Z}, con costo ${f(K)} + ${f(ci)} × ${Z} = ${f(c)}. Con ${nombre(u)} = ${f(u.u)} la demora es ${f(a)} + ${f(u.u)} × (${f(b)} − ${f(a)}) = ${f(demora)}, así que llega en ${f(proxArribo)}.`;
        } else texto += ` I = ${f(I)} no es menor que s = ${s}. No se pide.`;
        proxEval = r9(t + 1);
        foto('evaluacion', usados, `${texto}${areas}`);
      }
    }
  } catch (e) {
    if (!(e instanceof FaltanU)) throw e;
    corte = k >= U.length ? 'faltan-u' : 'demasiados';
  }
  const fin = corte ? null : { n, costo, pedidos, areaMas, areaMenos, pedido: costo / n, mant: (h * areaMas) / n, falt: (pi * areaMenos) / n };
  if (fin) fin.total = fin.pedido + fin.mant + fin.falt;
  return { filas, fin, corte, usados: k, acum };
}
