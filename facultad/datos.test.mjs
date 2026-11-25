import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { CALENDARIO } from './datos/calendario.js';

const leer = (archivo) => JSON.parse(fs.readFileSync(path.join(import.meta.dirname, 'datos', archivo), 'utf8'));
const esDia = (d) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d));

describe('plan-sistemas.json', () => {
  const plan = leer('plan-sistemas.json');

  it('has the 35 obligatory subjects, numbered 1 to 35', () => {
    expect(plan.obligatorias.map((m) => m.n)).toEqual(Array.from({ length: 35 }, (_, i) => i + 1));
  });

  it('only asks for subjects that exist and never for itself', () => {
    const numeros = new Set(plan.obligatorias.map((m) => m.n));
    for (const m of [...plan.obligatorias, ...plan.electivas]) {
      for (const n of [...m.cursadas, ...m.aprobadas]) {
        expect(numeros.has(n), `${m.nombre} pide la ${n}`).toBe(true);
        expect(n).not.toBe(m.n);
      }
    }
  });
});

describe('horarios.json', () => {
  const horarios = leer('horarios.json');

  it('keeps each class as [cuatrimestre, dia, desde, hasta, materia] and no teacher', () => {
    expect(horarios.comisiones.length).toBeGreaterThan(0);
    for (const c of horarios.comisiones) {
      for (const clase of c.clases) {
        expect(clase).toHaveLength(5);
        expect(horarios.materias[clase[4]]).toBeTypeOf('string');
        expect(clase[2]).toBeLessThan(clase[3]);
      }
    }
  });
});

describe('calendario.js', () => {
  it('has valid, ordered dates', () => {
    expect(esDia(CALENDARIO.desde) && esDia(CALENDARIO.hasta)).toBe(true);
    expect(CALENDARIO.desde < CALENDARIO.hasta).toBe(true);
    for (const l of CALENDARIO.llamados) expect(l.examenes.every(esDia)).toBe(true);
    for (const [dia] of CALENDARIO.sinClases) expect(esDia(dia)).toBe(true);
  });
});
