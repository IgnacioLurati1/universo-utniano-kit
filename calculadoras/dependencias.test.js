import { describe, expect, it } from 'vitest';
import { descomponer, formas, leer, motor, pasosCierre, pasosClaves, pasosFormas } from './dependencias.js';

// The examples are the ones of the notes of Bases de Datos (from the 1° parcial of 25/09/2023, ETAPAS,
// and of 29/09/2025, PRODUCTO), with the normal form the course gives for each.
const ETAPAS = ['ETAPAS(nroProyecto, nroEtapa, descProyecto, detalleEtapa)', 'nroProyecto, nroEtapa -> detalleEtapa\nnroProyecto -> descProyecto'];
const PRODUCTO = ['PRODUCTO(idProducto, nombre, codCategoria, nombreCategoria)', 'idProducto -> nombre, codCategoria\ncodCategoria -> nombreCategoria'];

function resolver([relacion, df], conjunto = '') {
  const d = leer(relacion, df, conjunto);
  const e = motor(d.rel.attrs, d.dfs);
  const k = pasosClaves(e, d.dfs);
  const f = formas(e, d.dfs, k.ks);
  return { d, e, k, f };
}

describe('dependencias', () => {
  it('ETAPAS: la clave es (nroProyecto, nroEtapa) y no llega a 2FN por una parcial', () => {
    const { d, e, k, f } = resolver(ETAPAS);
    expect(k.ks.map(e.det)).toEqual(['(nroProyecto, nroEtapa)']);
    expect(k.directa).toBe(true);
    expect(f.nivel).toBe(1);
    expect(f.parciales.map((p) => `${e.det(p.S)} → ${e.lista(p.D)}`)).toEqual(['nroProyecto → descProyecto']);
    expect(f.tipo).toEqual(['', 'parcial']);
    const pasos = pasosFormas(e, f, k.ks[0]);
    expect(pasos.map((p) => p.cumple)).toEqual([true, false, false, false]);
    const desc = descomponer(e, d.dfs, d.rel, k.ks[0], f);
    expect(desc.tablas.map((T) => `${T.nombre} (${T.orden.join(', ')}) CP (${T.claves.join(', ')})`)).toEqual([
      'ETAPAS (nroProyecto, nroEtapa, detalleEtapa) CP (nroProyecto, nroEtapa)',
      'R1 (nroProyecto, descProyecto) CP (nroProyecto)',
    ]);
    expect(desc.tablas[0].cfs.map((cf) => cf.ref)).toEqual(['R1']);
  });

  it('el cierre de {nroProyecto}, DF por DF', () => {
    const { d, e } = resolver(ETAPAS, 'nroProyecto');
    const c = pasosCierre(e, d.dfs, d.X);
    expect(e.conj(c.c)).toBe('{nroProyecto, descProyecto}');
    expect(c.pasos.map((p) => e.df(p.d))).toEqual(['nroProyecto → descProyecto']);
    expect(c.superclave).toBe(false);
    const todo = pasosCierre(e, d.dfs, leer(...ETAPAS, 'nroProyecto nroEtapa descProyecto').X);
    expect(todo).toMatchObject({ superclave: true, candidata: false, sobra: 'descProyecto' });
  });

  it('PRODUCTO: clave simple, 2FN pero no 3FN por una transitiva, y sus dos tablas', () => {
    const { d, e, k, f } = resolver(PRODUCTO);
    expect(k.ks.map(e.det)).toEqual(['idProducto']);
    expect(f.nivel).toBe(2);
    expect(f.tipo).toEqual(['', 'transitiva']);
    const pasos = pasosFormas(e, f, k.ks[0]);
    expect(pasos[1].texto).toBe('La clave es simple. No hay una parte de la clave de la que depender.');
    expect(pasos[2].texto).toMatch(/Es transitiva, idProducto → codCategoria → nombreCategoria\./);
    const desc = descomponer(e, d.dfs, d.rel, k.ks[0], f);
    expect(desc.tablas.map((T) => `${T.nombre} (${T.orden.join(', ')})`)).toEqual(['PRODUCTO (idProducto, nombre, codCategoria)', 'R1 (codCategoria, nombreCategoria)']);
    expect(desc.tablas[0].cfs).toEqual([{ attrs: 1 << 2, ref: 'R1' }]);
    expect(desc.tablas.every((T) => !T.noBC)).toBe(true);
  });

  it('dos claves candidatas, y cuando prueba combinaciones', () => {
    const { e, k } = resolver(['R(a, b, c)', 'a -> b\nb -> a\na -> c']);
    expect(k.ks.map(e.det)).toEqual(['a', 'b']);
    expect(k.directa).toBe(false);
    expect(k.pruebas.map((p) => p.clave)).toEqual([true, true]);
  });

  it('dice qué está mal y en qué campo', () => {
    expect(leer('', 'a -> b')).toMatchObject({ campo: 'relacion', error: 'Escribí la relación, como R(a, b, c).' });
    expect(leer('R(a, b', 'a -> b').campo).toBe('relacion');
    expect(leer('R(a, a)', '').error).toBe('«a» está dos veces en la relación.');
    expect(leer('R(a, b)', 'a b')).toMatchObject({ campo: 'df', error: 'A «a b» le falta la flecha, como en a -> b.' });
    expect(leer('R(a, b)', 'a -> B').error).toBe('«B» no está en la relación. ¿Es «b»?');
    expect(leer('R(a, b)', 'a, b -> a').error).toMatch(/no agrega nada/);
    expect(leer('R(a, b)', 'a -> b', 'c')).toMatchObject({ campo: 'conjunto' });
  });
});
