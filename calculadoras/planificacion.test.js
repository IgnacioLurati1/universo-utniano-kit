import { describe, expect, it } from 'vitest';
import { comparar, leerProcesos, planificar, tiempo } from './planificacion.js';

// The examples of Sistemas Operativos (of El Santo Resumen): the practice's 24, 3 and 3 ms
// with quantum 4, FCFS in both orders, and the book's SJF and its counterexample. With the averages they give.
const procesos = (rafagas, llegadas = rafagas.map(() => 0), nombres = rafagas.map((_, i) => `P${i + 1}`), prioridades = rafagas.map(() => 0)) =>
  rafagas.map((rafaga, i) => ({ nombre: nombres[i], llegada: llegadas[i], rafaga, prioridad: prioridades[i] }));

describe('planificación de la CPU', () => {
  it('Round Robin de la práctica: 24, 3 y 3 ms con quantum de 4', () => {
    const r = planificar(procesos([24, 3, 3]), 'rr', { quantum: 4 });
    expect(r.tramos.slice(0, 4).map((x) => [x.i, x.a, x.b])).toEqual([[0, 0, 4], [1, 4, 7], [2, 7, 10], [0, 10, 14]]);
    expect(r.fin).toEqual([30, 7, 10]);
    expect(r.espera).toEqual([6, 4, 7]);
    expect(tiempo(r.esperaPromedio)).toBe('5,667');
    expect(r.turnos[0]).toMatchObject({ t: 0, listos: [0, 1, 2], corre: 0, hasta: 4, motivo: 'quantum', queda: 20 });
    // Once P2 and P3 are done, P1 keeps the CPU until its burst ends.
    expect(r.turnos.slice(3).every((x) => x.corre === 0)).toBe(true);
    expect(r.turnos.at(-1)).toMatchObject({ motivo: 'termina', hasta: 30 });
  });

  it('FCFS con 24, 3 y 3 espera 17 en promedio, y 3 al revés', () => {
    expect(planificar(procesos([24, 3, 3]), 'fcfs').esperaPromedio).toBe(17);
    expect(planificar(procesos([3, 3, 24]), 'fcfs').esperaPromedio).toBe(3);
  });

  it('SJF del libro: 8, 4, 4 y 4 minutos terminan en promedio a los 11, y a los 14 en orden', () => {
    const P = procesos([8, 4, 4, 4], undefined, ['A', 'B', 'C', 'D']);
    expect(planificar(P, 'sjf').retornoPromedio).toBe(11);
    expect(planificar(P, 'sjf').fin).toEqual([20, 4, 8, 12]);
    expect(planificar(P, 'fcfs').retornoPromedio).toBe(14);
    // B, C and D tie at 4: the one first in the list goes first.
    expect(planificar(P, 'sjf').turnos[0]).toMatchObject({ corre: 1, empate: [2, 3] });
  });

  it('el contraejemplo de SJF: retorno 4,6 y espera 2,8', () => {
    const P = procesos([2, 4, 1, 1, 1], [0, 0, 3, 3, 3], ['A', 'B', 'C', 'D', 'E']);
    const r = planificar(P, 'sjf');
    expect(r.tramos.map((x) => P[x.i].nombre)).toEqual(['A', 'B', 'C', 'D', 'E']);
    expect(tiempo(r.retornoPromedio)).toBe('4,6');
    expect(tiempo(r.esperaPromedio)).toBe('2,8');
  });

  it('SRTN compara la ráfaga del que llega con lo que le queda al que corre', () => {
    const P = procesos([8, 4, 9, 5], [0, 1, 2, 3]);
    const r = planificar(P, 'srtn');
    expect(r.turnos[0]).toMatchObject({ corre: 0, motivo: 'desalojo', por: 1, hasta: 1, queda: 7 });
    expect(r.tramos.map((x) => [x.i, x.a, x.b])).toEqual([[0, 0, 1], [1, 1, 5], [3, 5, 10], [0, 10, 17], [2, 17, 26]]);
    // P3 and P4 arrive while P2 runs and neither is shorter than what P2 has left.
    expect(r.turnos[1].llegan.map((x) => x.quienes)).toEqual([[2], [3]]);
  });

  it('prioridad, con el número más chico o el más grande como la más alta', () => {
    const P = procesos([10, 1, 2], [0, 1, 2], undefined, [3, 1, 2]);
    expect(planificar(P, 'prio').tramos.map((x) => x.i)).toEqual([0, 1, 2]);
    expect(planificar(P, 'prioa').tramos.map((x) => x.i)).toEqual([0, 1, 2, 0]);
    expect(planificar(P, 'prioa', { chicoEsMas: false }).tramos.map((x) => x.i)).toEqual([0, 2, 1]);
  });

  it('la CPU queda ociosa hasta que llega alguien', () => {
    const r = planificar(procesos([2, 3], [0, 5]), 'fcfs');
    expect(r.tramos.map((x) => [x.i, x.a, x.b])).toEqual([[0, 0, 2], [null, 2, 5], [1, 5, 8]]);
    expect(r.turnos[1]).toMatchObject({ ociosa: true, t: 2, hasta: 5, llega: 1 });
  });

  it('Round Robin: el que llega justo al terminar el quantum entra antes que el que sale', () => {
    const r = planificar(procesos([6, 2], [0, 4]), 'rr', { quantum: 4 });
    expect(r.tramos.map((x) => x.i)).toEqual([0, 1, 0]);
    expect(r.turnos[0].llegan).toEqual([1]);
  });

  it('lee los procesos y dice qué celda está mal', () => {
    const fila = (nombre, llegada, rafaga, prioridad = '') => ({ nombre, llegada, rafaga, prioridad });
    expect(leerProcesos([fila('P1', '0', '2,5')], { alg: 'fcfs' }).P[0].rafaga).toBe(2.5);
    expect(leerProcesos([fila('P1', '0', '0')], { alg: 'fcfs' }).error).toMatchObject({ fila: 0, campo: 'rafaga' });
    expect(leerProcesos([fila('P1', '', '2')], { alg: 'fcfs' }).error).toMatchObject({ campo: 'llegada', texto: 'Falta la llegada de P1.' });
    expect(leerProcesos([fila('P1', '0', '2'), fila('P1', '0', '2')], { alg: 'fcfs' }).error).toMatchObject({ fila: 1, campo: 'nombre' });
    expect(leerProcesos([fila('P 1', '0', '2')], { alg: 'fcfs' }).error.campo).toBe('nombre');
    expect(leerProcesos([fila('P1', '0', '2')], { alg: 'prio' }).error.campo).toBe('prioridad');
    expect(leerProcesos([fila('P1', '0', '2', '1,5')], { alg: 'prio' }).error.campo).toBe('prioridad');
    expect(leerProcesos([fila('P1', '0', '2')], { alg: 'rr', quantum: '' }).error).toMatchObject({ fila: -1, campo: 'quantum' });
    expect(leerProcesos([fila('P1', '0', '9999')], { alg: 'rr', quantum: '1' }).error.campo).toBe('quantum');
  });

  it('compara todos los algoritmos con los mismos datos', () => {
    const c = comparar(procesos([24, 3, 3]), { quantum: 4, chicoEsMas: true, conPrioridad: false });
    expect(c.map((x) => x.alg)).toEqual(['fcfs', 'sjf', 'srtn', 'rr']);
    expect(c.find((x) => x.alg === 'fcfs').espera).toBe(17);
    expect(c.find((x) => x.alg === 'sjf').espera).toBe(3);
  });
});
