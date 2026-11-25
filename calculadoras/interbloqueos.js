// Detección de interbloqueos con varios recursos de cada tipo, as the course notes of Sistemas Operativos do it
// (El Santo Resumen, teoría 5c, figure 6-7): E existing, A available, C current allocation and R
// requests. While some unmarked process has its row of R less than or equal to A, its row of C is added to A and it is
// marked. The unmarked ones left are deadlocked. Every resource is allocated or available: ΣC + A = E.
// Logic of El Santo Resumen's simulator (its simulator code).

export const MAX_PROCESOS = 10;
export const MAX_RECURSOS = 6;
const TOPE = 9999;

/** «(2 1 0 0)», as the notes write a vector. */
export const vector = (v) => `(${v.join(' ')})`;

/** One cell: an integer from 0 to 9999, or why not. */
function leerCelda(texto) {
  const t = String(texto ?? '').trim();
  if (!t) return { falta: true };
  if (!/^\d{1,4}$/.test(t)) return { mal: true };
  return { valor: Number(t) };
}

/**
 * The matrices C and R (n × m, text) and the vector (m, text), given as E or as A. { C, R, A, E?, usado? } or
 * { error: { donde: 'C' | 'R' | 'v', fila, columna, texto } } with the first cell that is wrong.
 */
export function leerDatos({ C, R, vector: v, es }) {
  const leerMatriz = (M, donde, nombre) => {
    const salida = [];
    for (let i = 0; i < M.length; i += 1) {
      const fila = [];
      for (let j = 0; j < M[i].length; j += 1) {
        const c = leerCelda(M[i][j]);
        if (c.falta) return { error: { donde, fila: i, columna: j, texto: `En ${nombre}, falta P${i + 1} del recurso ${j + 1}.` } };
        if (c.mal) return { error: { donde, fila: i, columna: j, texto: `En ${nombre}, P${i + 1} del recurso ${j + 1} tiene que ser un entero de 0 a ${TOPE}.` } };
        fila.push(c.valor);
      }
      salida.push(fila);
    }
    return { M: salida };
  };
  const c = leerMatriz(C, 'C', 'C');
  if (c.error) return c;
  const r = leerMatriz(R, 'R', 'R');
  if (r.error) return r;
  const nombre = es === 'E' ? 'E' : 'A';
  const valores = [];
  for (let j = 0; j < v.length; j += 1) {
    const x = leerCelda(v[j]);
    if (x.falta) return { error: { donde: 'v', fila: 0, columna: j, texto: `En ${nombre}, falta el recurso ${j + 1}.` } };
    if (x.mal) return { error: { donde: 'v', fila: 0, columna: j, texto: `En ${nombre}, el recurso ${j + 1} tiene que ser un entero de 0 a ${TOPE}.` } };
    valores.push(x.valor);
  }
  if (es !== 'E') return { C: c.M, R: r.M, A: valores };
  const usado = valores.map((_, j) => c.M.reduce((s, fila) => s + fila[j], 0));
  const j = usado.findIndex((u, k) => u > valores[k]);
  if (j >= 0) return { error: { donde: 'v', fila: 0, columna: j, texto: `Del recurso ${j + 1} hay ${usado[j]} asignados y existen ${valores[j]}. Lo asignado no puede pasar a lo que existe.` } };
  return { C: c.M, R: r.M, E: valores, usado, A: valores.map((x, k) => x - usado[k]) };
}

/**
 * The search of the notes, from the first process every time, taking the first one that can finish. Each round says
 * the A it started with, the processes that couldn't and the resource that was short (falta), and the one marked.
 */
export function detectar(C, R, A0) {
  const n = C.length;
  let A = A0.slice();
  const marcado = Array(n).fill(false);
  const orden = [];
  const rondas = [];
  while (orden.length < n) {
    const revisados = [];
    let elegido = -1;
    for (let i = 0; i < n && elegido < 0; i += 1) {
      if (marcado[i]) continue;
      const falta = R[i].findIndex((x, j) => x > A[j]);
      if (falta < 0) elegido = i;
      else revisados.push({ i, falta });
    }
    if (elegido < 0) {
      rondas.push({ A: A.slice(), revisados, elegido });
      break;
    }
    const antes = A.slice();
    A = A.map((x, j) => x + C[elegido][j]);
    marcado[elegido] = true;
    orden.push(elegido);
    rondas.push({ A: antes, revisados, elegido, despues: A.slice() });
  }
  return { orden, rondas, bloqueados: marcado.map((m, i) => (m ? -1 : i)).filter((i) => i >= 0), A };
}
