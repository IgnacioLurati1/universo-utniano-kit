// The faculty's entrance in 3D, mounted without a framework. This file is light: three.js and the scene (escena.js)
// arrive with import() only when the container is about to show. Two uses:
// - «fondo»: decorative, behind a page. Hidden from screen readers, it sways slowly at 30 frames a second.
// - «sola»: a screen of its own, turned with the mouse, a finger or the keyboard (arrows, + and −).
// Day or night is yours to say (`noche`), the reduced motion of the system is followed unless `quieto` says otherwise.

const SOFTWARE = /swiftshader|llvmpipe|softpipe|lavapipe|software|basic render/i;

export const DESCRIPCION =
  'La entrada de la Facultad Regional Rosario, con la fachada celeste, las puertas de vidrio bajo el cartel, un árbol, dos barandas amarillas y la calle de adoquines.';

/** Whether a WebGL renderer name is a CPU pretending to be a GPU. */
export const esPorSoftware = (renderizador) => SOFTWARE.test(renderizador ?? '');

let puede;
/** WebGL 2 (three.js needs it) on a real GPU and some memory. Checked once.
 * On software rendering (SwiftShader, llvmpipe) the scene is drawn on the CPU and freezes the page for seconds.
 * `failIfMajorPerformanceCaveat` alone doesn't catch it: Chrome hands out SwiftShader anyway when it's allowed, so the
 * renderer's name is checked too. */
export function puede3D() {
  if (puede !== undefined) return puede;
  try {
    if (typeof window === 'undefined') return (puede = false);
    if (navigator.deviceMemory && navigator.deviceMemory < 2) return (puede = false);
    const gl = document.createElement('canvas').getContext('webgl2', { failIfMajorPerformanceCaveat: true });
    const info = gl?.getExtension('WEBGL_debug_renderer_info');
    const nombre = gl && (info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER));
    puede = !!gl && !esPorSoftware(nombre);
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    puede = false;
  }
  return puede;
}

const CONSULTA = '(prefers-reduced-motion: reduce)';

/**
 * Mounts the entrance inside `contenedor` (it should have a size: the canvas fills it).
 * Options: `modo` ('fondo' | 'sola'), `noche` (dark theme), `quieto` (true or false wins over the system's reduced
 * motion; undefined follows it), `alFallar()` (no 3D here, or the GPU dropped it: nothing is left in the page),
 * `alEstarLista()` (first frame drawn), `cargar` (how escena.js arrives; tests and bundlers can swap it).
 * Returns `{ foto, enfocar, noche, quieto, destruir }`. Without WebGL 2 on a GPU it calls `alFallar` and does nothing.
 */
export function montarFacu3D(contenedor, opciones = {}) {
  const { modo = 'fondo', alFallar, alEstarLista, cargar = () => import('./escena.js') } = opciones;
  const sola = modo === 'sola';
  let noche = Boolean(opciones.noche);
  let quietoPedido = opciones.quieto;
  let vivo = true;
  let api = null;
  let visible = false;
  let pedido = false;
  let espera = 0;

  const caja = document.createElement('div');
  caja.className = `facu3d facu3d--${modo}`;
  if (!sola) caja.setAttribute('aria-hidden', 'true');
  const escenaNodo = document.createElement('div');
  escenaNodo.className = 'facu3d__escena';
  caja.append(escenaNodo);

  const mq = typeof window !== 'undefined' ? window.matchMedia?.(CONSULTA) : null;
  const quietoAhora = () => (quietoPedido === undefined ? Boolean(mq?.matches) : Boolean(quietoPedido));
  const alCambiarSistema = () => api?.quieto(quietoAhora());
  const avisar = () => api?.visible(visible && !document.hidden);

  let yaFallo = false;
  const fallar = () => {
    if (yaFallo) return;
    yaFallo = true;
    limpiar();
    alFallar?.();
  };

  const arrancar = async () => {
    try {
      const { crearEscena, describirEscena } = await cargar();
      if (!vivo) return;
      api = crearEscena(escenaNodo, {
        escena: describirEscena(),
        modo,
        noche,
        quieto: quietoAhora(),
        depurar: opciones.depurar,
        alPerder: fallar,
      });
      if (sola) {
        const lienzo = api.lienzo;
        lienzo.tabIndex = 0;
        // It takes the arrows and plus and minus: a screen reader lets them through to it.
        lienzo.setAttribute('role', 'application');
        lienzo.setAttribute('aria-label', `${DESCRIPCION} Flechas para girar, más y menos para acercarte.`);
      }
      await api.preparar();
      if (!vivo || !api) return;
      api.dibujar();
      avisar();
      // One frame later, so the canvas starts transparent and the fade in runs.
      requestAnimationFrame(() => {
        if (!vivo) return;
        caja.classList.add('facu3d--lista');
        alEstarLista?.();
      });
    } catch {
      if (vivo) fallar();
    }
  };

  const io =
    typeof IntersectionObserver === 'undefined'
      ? null
      : new IntersectionObserver(
          ([e]) => {
            visible = e.isIntersecting;
            if (visible && !pedido) {
              pedido = true;
              // Building the scene keeps the main thread busy for a moment: not while the page settles.
              if (sola) arrancar();
              else if ('requestIdleCallback' in window) espera = window.requestIdleCallback(arrancar, { timeout: 1500 });
              else espera = setTimeout(arrancar, 300);
            }
            avisar();
          },
          { rootMargin: '120px 0px' },
        );

  function limpiar() {
    vivo = false;
    io?.disconnect();
    if (typeof window !== 'undefined' && 'cancelIdleCallback' in window) window.cancelIdleCallback(espera);
    clearTimeout(espera);
    mq?.removeEventListener?.('change', alCambiarSistema);
    if (typeof document !== 'undefined') document.removeEventListener('visibilitychange', avisar);
    api?.destruir();
    api = null;
    caja.remove();
  }

  if (!puede3D() || !io) {
    vivo = false;
    queueMicrotask(() => alFallar?.());
  } else {
    contenedor.append(caja);
    io.observe(caja);
    document.addEventListener('visibilitychange', avisar);
    mq?.addEventListener?.('change', alCambiarSistema);
  }

  return {
    /** Back to the photo's point of view («sola»). */
    foto: () => api?.foto(),
    /** Moves the keyboard focus to the canvas («sola»). */
    enfocar: () => api?.lienzo.focus(),
    /** Day (false) or night (true). */
    noche(si) {
      noche = Boolean(si);
      api?.noche(noche);
    },
    /** true or false: still or moving, whatever the system says. undefined: back to the system's reduced motion. */
    quieto(si) {
      quietoPedido = si;
      api?.quieto(quietoAhora());
    },
    destruir: limpiar,
  };
}
