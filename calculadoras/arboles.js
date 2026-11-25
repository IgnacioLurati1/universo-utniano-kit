// Binary trees of Lógica y Estructuras Discretas (parcial-3.md, «Árbol de una expresión» and «Recorridos»): the tree of
// an expression, or one written as A(B, C(, D)), and its three traversals. The parsers are El Santo Resumen's
// (its simulator code, arbolDeExpresion and arbolAnidado).

export const MAX_VERTICES = 31;
const SIMBOLO = { '+': '+', '-': '−', '−': '−', '*': '×', '×': '×', '/': '÷', '÷': '÷', '^': '^' };
const PRECEDENCIA = { '+': 1, '−': 1, '×': 2, '÷': 2, '^': 3 };

/** The tree of an expression with + − × ÷ ^ and brackets. The labels stay as written, as the notes ask. */
export function arbolDeExpresion(texto) {
  const fichas = String(texto).match(/[A-Za-z0-9_.,]+|[-+*/^×÷−()]|\S/g) || [];
  if (!fichas.length) return { error: 'Escribí la expresión.' };
  const mala = fichas.find((f) => !/^[A-Za-z0-9_.,]+$/.test(f) && !SIMBOLO[f] && f !== '(' && f !== ')');
  if (mala) return { error: `«${mala}» no es un operador. Van + − × ÷ ^ y paréntesis.` };
  let i = 0;
  let error = null;
  const atomo = () => {
    const f = fichas[i];
    if (f === undefined) return { error: 'Falta un operando al final.' };
    if (f === '(') {
      i += 1;
      const e = nivel(1);
      if (e.error) return e;
      if (fichas[i] !== ')') return { error: 'Falta cerrar un paréntesis.' };
      i += 1;
      return e;
    }
    if (SIMBOLO[f] || f === ')') return { error: `Sobra «${SIMBOLO[f] || f}». Falta un operando antes.` };
    i += 1;
    if (f.length > 6) return { error: `«${f.slice(0, 12)}» es muy largo. Cada operando va de hasta 6 caracteres.` };
    return { e: f };
  };
  function nivel(min) {
    let izq = atomo();
    if (izq.error) return izq;
    for (;;) {
      const op = SIMBOLO[fichas[i]];
      if (!op || PRECEDENCIA[op] < min) return izq;
      i += 1;
      const der = nivel(op === '^' ? PRECEDENCIA[op] : PRECEDENCIA[op] + 1);
      if (der.error) return der;
      izq = { e: op, i: izq, d: der };
    }
  }
  const raiz = nivel(1);
  if (raiz.error) return raiz;
  if (i < fichas.length) error = fichas[i] === ')' ? 'Sobra un paréntesis que cierra.' : `Sobra «${fichas[i]}». Entre dos operandos va un operador.`;
  return error ? { error } : { raiz };
}

/** A binary tree written as A(B(D, E), C(, F)): each vertex and, in brackets, its left and right child. Either may be
 * missing. */
export function arbolAnidado(texto) {
  const t = String(texto).replace(/\s+/g, '');
  if (!t) return { error: 'Escribí el árbol.' };
  let i = 0;
  const vertice = () => {
    const m = /^[^(),]+/.exec(t.slice(i));
    if (!m) return { error: t[i] === undefined ? 'El árbol termina antes de tiempo.' : `En el carácter ${i + 1} falta el nombre de un vértice.` };
    if (m[0].length > 6) return { error: `«${m[0].slice(0, 12)}» es muy largo. Cada vértice va de hasta 6 caracteres.` };
    i += m[0].length;
    const n = { e: m[0] };
    if (t[i] !== '(') return n;
    i += 1;
    if (t[i] !== ',' && t[i] !== ')') {
      const h = vertice();
      if (h.error) return h;
      n.i = h;
    }
    if (t[i] === ',') {
      i += 1;
      if (t[i] !== ')') {
        const h = vertice();
        if (h.error) return h;
        n.d = h;
      }
    }
    if (t[i] !== ')') return { error: 'Falta cerrar un paréntesis, o hay más de dos hijos. Es un árbol binario.' };
    i += 1;
    return n;
  };
  const raiz = vertice();
  if (raiz.error) return raiz;
  if (i < t.length) return { error: `Sobra «${t.slice(i, i + 12)}» después del árbol.` };
  return { raiz };
}

export const RECORRIDOS = {
  preorden: { nombre: 'Preorden', regla: 'raíz, izquierdo, derecho', da: 'Forma polaca o prefija.' },
  entreorden: { nombre: 'Entreorden', regla: 'izquierdo, raíz, derecho', da: 'Forma infija sin paréntesis.' },
  postorden: { nombre: 'Postorden', regla: 'izquierdo, derecho, raíz', da: 'Forma polaca inversa o postfija.' },
};

export function recorrer(n, cual) {
  if (!n) return [];
  if (cual === 'preorden') return [n, ...recorrer(n.i, cual), ...recorrer(n.d, cual)];
  if (cual === 'entreorden') return [...recorrer(n.i, cual), n, ...recorrer(n.d, cual)];
  return [...recorrer(n.i, cual), ...recorrer(n.d, cual), n];
}

/**
 * The tree ready to draw, as in class: the leaves side by side and each vertex over the middle of its children, in the
 * row of its level (the root is level 0, as in the notes). A missing child keeps its place empty, so an only child
 * still hangs to its side.
 */
export function ubicar(raiz) {
  const vertices = [];
  const aristas = [];
  let columna = 0;
  let altura = 0;
  const ir = (n, nivel, padre, lado) => {
    n.y = nivel;
    n.id = vertices.length;
    altura = Math.max(altura, nivel);
    vertices.push(n);
    if (padre) aristas.push({ de: padre, a: n, lado });
    if (!n.i && !n.d) {
      n.x = columna;
      columna += 1;
      return;
    }
    let izq = columna;
    if (n.i) {
      ir(n.i, nivel + 1, n, 'i');
      izq = n.i.x;
    } else columna += 1;
    let der = columna;
    if (n.d) {
      ir(n.d, nivel + 1, n, 'd');
      der = n.d.x;
    } else columna += 1;
    n.x = (izq + der) / 2;
  };
  ir(raiz, 0, null, null);
  return { vertices, aristas, columnas: columna, altura, hojas: vertices.filter((v) => !v.i && !v.d) };
}

/** Reads the tree of the chosen form and checks its size. */
export function leerArbol(texto, forma) {
  const r = forma === 'anidado' ? arbolAnidado(texto) : arbolDeExpresion(texto);
  if (r.error) return r;
  const contar = (n) => (n ? 1 + contar(n.i) + contar(n.d) : 0);
  const total = contar(r.raiz);
  if (total > MAX_VERTICES) return { error: `El árbol tiene ${total} vértices y el tope es ${MAX_VERTICES}.` };
  return { raiz: r.raiz, ...ubicar(r.raiz) };
}
