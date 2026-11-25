import { describe, expect, it } from 'vitest';
import { campo, leerPunto } from './campo.js';
import { escribir } from '../formulas/formula.js';

// The fields and results are the course's: parcial-3.md of El Santo Resumen (course notes «7A», «7D», «7F»;
// versión por unidad «19»).
describe('campo vectorial', () => {
  it('−y i + x j gira: Rot(F) = 2k y no es conservativo («7A», p. 1)', () => {
    const r = campo({ P: '-y', Q: 'x', punto: '1; 1' });
    expect(r.veredicto).toBe('no');
    expect(escribir(r.cruzadas[0].u)).toBe('−1');
    expect(escribir(r.cruzadas[0].v)).toBe('1');
    expect(r.punto.F).toEqual([-1, 1]);
    expect(r.punto.rotor[2]).toBe(2);
    expect(r.punto.divergencia).toBe(0);
    expect(escribir(r.nodoRot[2])).toBe('2');
  });

  it('F₁ = (x − y) i + (x − 2) j: P_y = −1 ≠ Q_x = 1 («7D», p. 3)', () => {
    const r = campo({ P: 'x - y', Q: 'x - 2', punto: '0; 0' });
    expect(r.veredicto).toBe('no');
    expect([escribir(r.cruzadas[0].u), escribir(r.cruzadas[0].v)]).toEqual(['−1', '1']);
    expect(r.potencial).toBe(null);
  });

  it('F₂ = (x + 2xy) i + (x² − 3y²) j: P_y = 2x = Q_x y f = ½x² + x²y − y³ + C («7D», pp. 3 y 4)', () => {
    const r = campo({ P: 'x + 2xy', Q: 'x^2 - 3y^2', punto: '1; 1', A: '0; 1', B: '0; -e^pi' });
    expect(r.veredicto).toBe('si');
    expect([escribir(r.cruzadas[0].u), escribir(r.cruzadas[0].v)]).toEqual(['2x', '2x']);
    const p = r.potencial;
    expect(escribir(p.f1)).toBe('½x² + x²y');
    expect(escribir(p.f1y)).toBe('x²');
    expect(escribir(p.phiPrima)).toBe('−3y²');
    expect(escribir(p.phi)).toBe('−y³');
    expect(escribir(p.nodo)).toBe('½x² + x²y − y³');
    // r(π) = (0, −e^π) gives f = e^{3π} + C and r(0) = (0, 1) gives −1 + C: the integral is e^{3π} + 1.
    expect(r.trabajo.fA).toBeCloseTo(-1, 12);
    expect(r.trabajo.fB).toBeCloseTo(Math.exp(3 * Math.PI), 6);
    expect(r.trabajo.W).toBeCloseTo(Math.exp(3 * Math.PI) + 1, 6);
  });

  it('el gradiente de x²y³ es conservativo y vuelve a x²y³ («7A», p. 2)', () => {
    const r = campo({ P: '2xy^3', Q: '3x^2y^2', punto: '1; 1' });
    expect(r.veredicto).toBe('si');
    expect([escribir(r.cruzadas[0].u), escribir(r.cruzadas[0].v)]).toEqual(['6xy²', '6xy²']);
    expect(escribir(r.potencial.nodo)).toBe('x²y³');
    expect(escribir(r.potencial.phiPrima)).toBe('0');
  });

  it('(−y i + x j)/(x² + y²): P_y = Q_x, pero el origen es un agujero («19», p. 16)', () => {
    const r = campo({ P: '-y/(x^2 + y^2)', Q: 'x/(x^2 + y^2)', punto: '1; 1' });
    expect(r.igualan).toBe(true);
    expect(r.veredicto).toBe('hueco');
    expect(r.agujeros).toEqual([[0, 0]]);
    expect(r.potencial).toBe(null);
    // The rules leave 2yx/(x² + y²)² − 2xy/(x² + y²)²: it is 0 everywhere it is defined.
    expect(escribir(r.nodoDiv)).toBe('0');
  });

  it('en tres variables: F₂ = y²z³ i + 2xyz³ j + 3xy²z² k es conservativo («7F», p. 3)', () => {
    const r = campo({ P: 'y^2z^3', Q: '2xyz^3', R: '3xy^2z^2', punto: '1; 1; 1' });
    expect(r.tres).toBe(true);
    expect(r.cruzadas.map((k) => [escribir(k.u), escribir(k.v)])).toEqual([
      ['2yz³', '2yz³'],
      ['3y²z²', '3y²z²'],
      ['6xyz²', '6xyz²'],
    ]);
    expect(r.veredicto).toBe('si');
    expect(escribir(r.potencial.nodo)).toBe('xy²z³');
    expect(r.punto.rotor).toEqual([0, 0, 0]);
  });

  it('en tres variables: F₁ = xz i + xyz j + y² k tiene Rot(F₁) = (2y − xy) i + x j + yz k («7F», p. 2)', () => {
    const r = campo({ P: 'xz', Q: 'xyz', R: 'y^2', punto: '1; 2; 3' });
    expect(r.veredicto).toBe('no');
    expect(r.nodoRot.map(escribir)).toEqual(['2y − xy', 'x', 'yz']);
    // G = Rot(F₁) has Div(G) = −y + 0 + y = 0 («7F», p. 4).
    const g = campo({ P: '2y - xy', Q: 'x', R: 'yz', punto: '1; 2; 3' });
    expect(escribir(g.nodoDiv)).toBe('0');
  });

  it('dice qué dato falla', () => {
    expect(campo({ P: '', Q: 'x', punto: '1; 1' }).error).toEqual({ campo: 'P', texto: 'Falta P.' });
    expect(campo({ P: 'z', Q: 'x', punto: '1; 1' }).error.campo).toBe('P');
    expect(campo({ P: 'y', Q: 'x', punto: '1' }).error.texto).toBe('El punto lleva x e y, como 1; 2. Van separadas por punto y coma.');
    expect(campo({ P: 'y', Q: 'x', punto: '1; 1', A: '0; 0' }).error.campo).toBe('B');
    expect(leerPunto('0,5; 1', 2, 'A').v).toEqual([0.5, 1]);
    expect(leerPunto('1,2', 2, 'A').v).toEqual([1, 2]);
    expect(leerPunto('1; x', 2, 'A').error).toBe('La y de A no es un número.');
  });
});
