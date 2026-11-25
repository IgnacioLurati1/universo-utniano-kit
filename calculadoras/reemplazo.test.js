import { describe, expect, it } from 'vitest';
import { comparar, leerCadena, reemplazar } from './reemplazo.js';

// The sequence of the parcial of 09/11/2022 of Sistemas Operativos, with 3 and 4 frames, and the faults El Santo
// Resumen gives for it (propuestas.json): FIFO 16 and 8, LRU 16 and 8, OPT 10 and 8.
const PARCIAL = '0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3, 4, 5, 6, 7';

describe('reemplazo de páginas', () => {
  it('lee la cadena del parcial', () => {
    expect(leerCadena(PARCIAL).refs).toHaveLength(16);
    expect(leerCadena('7 0 1;2').refs).toEqual(['7', '0', '1', '2']);
    expect(leerCadena('').error).toBe('Falta la cadena de referencias.');
    expect(leerCadena('1 2 #').error).toMatch('«#»');
    expect(leerCadena(Array(61).fill('1').join(' ')).error).toMatch('61');
  });

  it('los fallos del parcial con 3 y 4 marcos', () => {
    const refs = leerCadena(PARCIAL).refs;
    const c = comparar(refs, 3);
    expect(c.marcos).toEqual([3, 4]);
    const de = (alg) => c.filas.find((f) => f.alg === alg).fallos;
    expect(de('fifo')).toEqual([16, 8]);
    expect(de('lru')).toEqual([16, 8]);
    expect(de('opt')).toEqual([10, 8]);
  });

  it('OPT saca la que más tarda en volver y desempata con FIFO las que no vuelven', () => {
    const { pasos } = reemplazar(leerCadena(PARCIAL).refs, 3, 'opt');
    expect(pasos[3]).toMatchObject({ fallo: true, sale: '2', marcos: ['0', '1', '3'] });
    expect(pasos[3].motivo.proximas.map((x) => x.en)).toEqual([4, 5, 6]);
    // At page 4 none of 1, 2 and 3 comes back: the oldest loaded leaves.
    expect(pasos[12].motivo.empate).toHaveLength(3);
    expect(pasos[12].sale).toBe('3');
  });

  it('FIFO y LRU dicen cuándo entró o se usó la que sale', () => {
    const refs = leerCadena('1 2 3 1 4').refs;
    expect(reemplazar(refs, 3, 'fifo').pasos[4]).toMatchObject({ sale: '1', donde: 0, motivo: { cargada: 0 } });
    expect(reemplazar(refs, 3, 'lru').pasos[4]).toMatchObject({ sale: '2', donde: 1, motivo: { usada: 1 } });
  });

  it('segunda oportunidad: con todos los R en 1 es FIFO puro', () => {
    const refs = leerCadena('1 2 3 4').refs;
    const p = reemplazar(refs, 3, 'seg').pasos[3];
    expect(p.motivo.vueltas).toEqual(['1', '2', '3']);
    expect(p.sale).toBe('1');
    expect(p.R).toEqual([1, 0, 0]);
    expect(p.motivo.lista).toEqual(['2', '3', '4']);
    expect(reemplazar(refs, 3, 'seg').fallos).toBe(reemplazar(refs, 3, 'fifo').fallos);
  });

  it('reloj: la manecilla borra los R que encuentra en 1 y saca el primero en 0', () => {
    const refs = leerCadena('1 2 3 4 2 5').refs;
    const { pasos } = reemplazar(refs, 3, 'reloj');
    expect(pasos[2].mano).toBe(0);
    expect(pasos[3]).toMatchObject({ sale: '1', donde: 0, mano: 1, motivo: { desde: 0, vueltas: [0, 1, 2] } });
    expect(pasos[4]).toMatchObject({ fallo: false, R: [1, 1, 0] });
    expect(pasos[5]).toMatchObject({ sale: '3', donde: 2, mano: 0, motivo: { desde: 1, vueltas: [1] } });
  });

  it('un acierto no cambia los marcos', () => {
    const { pasos, fallos } = reemplazar(['A', 'A'], 1, 'lru');
    expect(fallos).toBe(1);
    expect(pasos[1]).toMatchObject({ fallo: false, marcos: ['A'] });
  });
});
