// The drawing loop of the entrance, apart from three.js so it can be tested. At most one frame is ever pending:
// the controls ask for a frame from inside the frame itself, and two pending frames became four, then eight, until
// the tab hung (dragging on its own screen).

/** `paso(ahora)` draws and says whether to keep going. `pedir()` asks for a frame; twice in a row is still one. */
export function crearBucle(paso, { raf = (f) => requestAnimationFrame(f), cancelar = (id) => cancelAnimationFrame(id) } = {}) {
  let id = 0;
  const cuadro = (ahora) => {
    id = 0;
    if (paso(ahora) && !id) id = raf(cuadro);
  };
  return {
    pedir() {
      if (!id) id = raf(cuadro);
    },
    parar() {
      if (id) cancelar(id);
      id = 0;
    },
    get pendiente() {
      return id !== 0;
    },
  };
}
