// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// puede3D() is checked once per module: each test imports a fresh copy.
const importar = async () => {
  vi.resetModules();
  return import('./facu3d.js');
};

function glFalso(nombre) {
  return {
    RENDERER: 1,
    getExtension: (e) => (e === 'WEBGL_debug_renderer_info' ? { UNMASKED_RENDERER_WEBGL: 2 } : { loseContext() {} }),
    getParameter: () => nombre,
  };
}

let observados;
beforeEach(() => {
  observados = [];
  globalThis.IntersectionObserver = class {
    constructor(f) {
      this.f = f;
      observados.push(this);
    }
    observe() {}
    disconnect() {}
  };
  window.requestIdleCallback = (f) => setTimeout(f, 0);
  window.cancelIdleCallback = (id) => clearTimeout(id);
});
afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('esPorSoftware', () => {
  it('tells a CPU renderer from a real GPU', async () => {
    const { esPorSoftware } = await importar();
    expect(esPorSoftware('ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)))')).toBe(true);
    expect(esPorSoftware('llvmpipe (LLVM 15.0.7, 256 bits)')).toBe(true);
    expect(esPorSoftware('ANGLE (NVIDIA, NVIDIA GeForce RTX 3060 Direct3D11 vs_5_0 ps_5_0)')).toBe(false);
    expect(esPorSoftware(undefined)).toBe(false);
  });
});

describe('montarFacu3D', () => {
  it('without WebGL 2 leaves nothing in the page and says so', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const { montarFacu3D } = await importar();
    const alFallar = vi.fn();
    const cargar = vi.fn();
    montarFacu3D(document.body, { alFallar, cargar });
    await Promise.resolve();
    expect(alFallar).toHaveBeenCalledOnce();
    expect(document.body.children).toHaveLength(0);
    expect(cargar).not.toHaveBeenCalled();
  });

  it('on software rendering stays out too', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(glFalso('SwiftShader'));
    const { montarFacu3D } = await importar();
    const alFallar = vi.fn();
    montarFacu3D(document.body, { alFallar });
    await Promise.resolve();
    expect(alFallar).toHaveBeenCalledOnce();
  });

  it('loads the scene when it shows, labels its own screen and cleans up', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(glFalso('ANGLE (NVIDIA GeForce)'));
    const { montarFacu3D, DESCRIPCION } = await importar();
    const lienzo = document.createElement('canvas');
    const escena = {
      lienzo,
      preparar: vi.fn(async () => {}),
      dibujar: vi.fn(),
      visible: vi.fn(),
      noche: vi.fn(),
      quieto: vi.fn(),
      foto: vi.fn(),
      destruir: vi.fn(),
    };
    let recibidas;
    const cargar = vi.fn(async () => ({
      describirEscena: () => ({ cajas: [] }),
      crearEscena: (nodo, opciones) => {
        recibidas = opciones;
        nodo.append(lienzo);
        return escena;
      },
    }));
    let facu;
    const lista = new Promise((r) => {
      facu = montarFacu3D(document.body, { modo: 'sola', noche: true, quieto: true, cargar, alEstarLista: r });
      expect(document.querySelector('.facu3d--sola')).not.toBeNull();
      expect(cargar).not.toHaveBeenCalled();
      observados[0].f([{ isIntersecting: true }]);
    });
    await lista;

    expect(cargar).toHaveBeenCalledOnce();
    expect(recibidas).toMatchObject({ modo: 'sola', noche: true, quieto: true });
    expect(lienzo.getAttribute('role')).toBe('application');
    expect(lienzo.getAttribute('aria-label')).toContain(DESCRIPCION);
    expect(lienzo.tabIndex).toBe(0);
    expect(document.querySelector('.facu3d').getAttribute('aria-hidden')).toBeNull();
    expect(document.querySelector('.facu3d--lista')).not.toBeNull();
    expect(escena.visible).toHaveBeenLastCalledWith(true);

    facu.noche(false);
    expect(escena.noche).toHaveBeenLastCalledWith(false);
    facu.foto();
    expect(escena.foto).toHaveBeenCalledOnce();
    facu.destruir();
    expect(escena.destruir).toHaveBeenCalledOnce();
    expect(document.querySelector('.facu3d')).toBeNull();
  });

  it('behind a page it is hidden from screen readers and waits for an idle moment', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(glFalso('ANGLE (NVIDIA GeForce)'));
    const { montarFacu3D } = await importar();
    const cargar = vi.fn(() => new Promise(() => {}));
    const facu = montarFacu3D(document.body, { cargar });
    expect(document.querySelector('.facu3d--fondo').getAttribute('aria-hidden')).toBe('true');
    observados[0].f([{ isIntersecting: true }]);
    expect(cargar).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(cargar).toHaveBeenCalledOnce();
    facu.destruir();
  });
});
