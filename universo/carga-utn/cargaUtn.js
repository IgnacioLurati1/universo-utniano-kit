// Loading placeholder of the Universo UTNiano: the UTN emblem, still and dark, with a beam of light that runs around its
// edge. The outline is the union of the emblem's pieces, computed once in units of 100 high, so there are no lines
// inside. Plain DOM, no framework and no innerHTML. Styles in carga-utn.css.

/** The emblem's outline as an SVG path, 100 units high. */
export const CONTORNO =
  'M0.0 58.2L33.4 58.2L33.4 59.4L32.9 59.5L28.4 60.8L24.1 62.6L20.1 64.8L16.3 67.5L12.8 70.6L9.7 74.1L7.0 77.9L4.7 82.0L2.9 86.3L1.7 90.8L0.9 95.3L0.6 100.0L17.4 100.0L17.5 97.2L18.0 94.5L18.8 91.8L19.8 89.3L21.2 86.8L22.8 84.6L24.6 82.5L26.7 80.6L29.0 79.0L31.4 77.7L33.4 76.9L33.4 100.0L50.8 100.0L50.8 76.8L52.9 77.7L55.3 79.0L57.6 80.6L59.7 82.5L61.5 84.6L63.1 86.8L64.5 89.3L65.5 91.8L66.3 94.5L66.8 97.2L66.9 100.0L83.7 100.0L83.4 95.3L82.7 90.8L81.4 86.3L79.6 82.0L77.3 77.9L74.6 74.1L71.5 70.6L68.1 67.5L64.3 64.8L60.2 62.6L55.9 60.8L51.4 59.5L50.8 59.4L50.8 58.2L84.3 58.2L84.3 41.1L50.8 41.1L50.8 40.6L51.4 40.5L55.9 39.2L60.2 37.4L64.3 35.2L68.1 32.5L71.5 29.4L74.6 25.9L77.3 22.1L79.6 18.0L81.4 13.7L82.7 9.2L83.4 4.7L83.7 0.0L66.9 0.0L66.8 2.8L66.3 5.5L65.5 8.2L64.5 10.7L63.1 13.2L61.5 15.4L59.7 17.5L57.6 19.4L55.3 21.0L52.9 22.3L50.8 23.2L50.8 0.0L33.4 0.0L33.4 23.1L31.4 22.3L29.0 21.0L26.7 19.4L24.6 17.5L22.8 15.4L21.2 13.2L19.8 10.7L18.8 8.2L18.0 5.5L17.5 2.8L17.4 0.0L0.6 0.0L0.9 4.7L1.7 9.2L2.9 13.7L4.7 18.0L7.0 22.1L9.7 25.9L12.8 29.4L16.3 32.5L20.1 35.2L24.1 37.4L28.4 39.2L32.9 40.5L33.4 40.6L33.4 41.1L0.0 41.1Z';

const SVG = 'http://www.w3.org/2000/svg';

/**
 * Builds the placeholder. `texto` is what screen readers hear; `pantalla` makes it cover the whole window.
 * Returns the element; take it out (or add the class carga-utn--lista) when the content is ready.
 */
export function crearCargaUtn({ texto = 'Cargando', pantalla = false, documento = globalThis.document } = {}) {
  const caja = documento.createElement('div');
  caja.className = pantalla ? 'carga-utn carga-utn--pantalla' : 'carga-utn';
  caja.setAttribute('role', 'status');

  const svg = documento.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '-6 -6 96.3 112');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  for (const parte of ['base', 'estela', 'haz']) {
    const p = documento.createElementNS(SVG, 'path');
    p.setAttribute('class', `carga-utn__${parte}`);
    p.setAttribute('d', CONTORNO);
    if (parte !== 'base') p.setAttribute('pathLength', '100');
    svg.append(p);
  }

  const lectores = documento.createElement('span');
  lectores.className = 'carga-utn__lectores';
  lectores.textContent = texto;

  caja.append(svg, lectores);
  return caja;
}

/**
 * Two placeholders in a row (one while the code downloads, another while the content builds) would restart the beam
 * from zero. Anchoring every animation to the page clock's zero keeps them in the same phase, so the beam goes on.
 */
export function anclarAnimacion(caja) {
  for (const a of caja.getAnimations?.({ subtree: true }) ?? []) a.startTime = 0;
}
