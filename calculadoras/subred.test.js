import { describe, expect, it } from 'vitest';
import { aTexto, leerRed, subdividir } from './subred.js';

// The practice's examples of Redes de Datos (parcial-2.md of El Santo Resumen, Conceptos IPv4): 192.168.168.0/24 in 8
// areas gives 3 bits, /27, 255.255.255.224, 30 hosts and salto 32; 192.168.0.0/24 in 20 networks gives 5 bits, /29,
// 255.255.255.248, 6 hosts and salto 8. The guide's problem 9: 5 machines need 3 host bits and the mask ends in 248.
// And the AND of the practice: 192.168.55.44 with 255.255.255.0 is the network 192.168.55.0, broadcast .255.

describe('subredes', () => {
  it('192.168.168.0/24 en 8 áreas', () => {
    const s = subdividir('192.168.168.0/24', 'c', '8');
    expect(s).toMatchObject({ N: 3, M: 5, p2: 27, ultimo: 224, salto: 32, cantidad: 8, hosts: 30, octeto: 3 });
    expect(aTexto(s.mascara)).toBe('255.255.255.224');
    expect(s.filas[1]).toEqual({ i: 1, red: '192.168.168.32', primera: '192.168.168.33', ultima: '192.168.168.62', broadcast: '192.168.168.63' });
    expect(s.filas.at(-1).broadcast).toBe('192.168.168.255');
  });

  it('192.168.0.0/24 en 20 redes', () => {
    const s = subdividir('192.168.0.0/24', 'c', '20');
    expect(s).toMatchObject({ N: 5, M: 3, p2: 29, ultimo: 248, salto: 8, cantidad: 32, hosts: 6 });
    expect(s.filas).toHaveLength(16);
    expect(s.ultima).toMatchObject({ i: 31, red: '192.168.0.248', broadcast: '192.168.0.255' });
  });

  it('5 hosts por subred: 3 bits de host y la máscara termina en 248', () => {
    expect(subdividir('192.168.0.0/24', 'h', '5')).toMatchObject({ M: 3, N: 5, ultimo: 248, p2: 29 });
    expect(subdividir('192.168.0.0/24', 'h', '6')).toMatchObject({ M: 3 });
    expect(subdividir('192.168.0.0/24', 'h', '7')).toMatchObject({ M: 4 });
  });

  it('el AND de la práctica: 192.168.55.44 con 255.255.255.0', () => {
    const r = leerRed('192.168.55.44 255.255.255.0');
    expect(r.p).toBe(24);
    expect(aTexto(r.red)).toBe('192.168.55.0');
    const s = subdividir('192.168.55.44 255.255.255.0', 'n', '0');
    expect(s.filas[0]).toMatchObject({ red: '192.168.55.0', broadcast: '192.168.55.255' });
  });

  it('el salto cae en el octeto donde termina la máscara', () => {
    const s = subdividir('10.0.0.0/11', 'n', '0');
    expect(s).toMatchObject({ octeto: 1, ultimo: 224, salto: 32 });
    expect(subdividir('10.0.0.0/16', 'n', '8')).toMatchObject({ p2: 24, octeto: 2, ultimo: 255, salto: 1 });
  });

  it('dice qué está mal', () => {
    expect(subdividir('', 'c', '8')).toMatchObject({ en: 'red', error: 'Falta la red.' });
    expect(subdividir('192.168.1/24', 'c', '8').en).toBe('red');
    expect(subdividir('192.168.1.300/24', 'c', '8').error).toMatch('0 a 255');
    expect(subdividir('192.168.1.0/31', 'c', '2').error).toMatch('/31');
    expect(subdividir('192.168.1.0 255.0.255.0', 'c', '2').error).toMatch('máscara');
    expect(subdividir('192.168.1.0/24', 'c', '').en).toBe('cuanto');
    expect(subdividir('192.168.1.0/24', 'c', '2,5').en).toBe('cuanto');
    expect(subdividir('192.168.1.0/24', 'c', '100').error).toMatch('7 bits');
    expect(subdividir('192.168.1.0/24', 'h', '300').error).toMatch('9 bits');
    expect(subdividir('192.168.1.0/24', 'n', '7').error).toMatch('0 a 6');
  });
});
