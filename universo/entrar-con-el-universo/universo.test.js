import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { crearUniverso, desafioDe, direccionSegura, ErrorUniverso } from './universo.js';

const almacen = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) };
};

// A fake service that records what it receives.
function servicioFalso(respuestas) {
  const pedidos = [];
  const pedir = async (url, opciones = {}) => {
    const a = new URL(url).searchParams.get('a');
    pedidos.push({ a, opciones, cuerpo: opciones.body ? Object.fromEntries(opciones.body) : null });
    const [estado, cuerpo] = respuestas[a] ?? [404, { error: 'ruta' }];
    return { ok: estado < 400, status: estado, json: async () => cuerpo };
  };
  return { pedir, pedidos };
}

const base = (extra = {}) => ({
  servicio: 'https://servicio.ejemplo.com/utn',
  permiso: 'https://universo.ejemplo.com/autorizar',
  clientId: 'app_ejemplo',
  vuelta: 'https://miapp.ejemplo.com/vuelta',
  alcances: ['perfil', 'materias'],
  almacen: almacen(),
  cripto: webcrypto,
  ...extra,
});

describe('desafioDe', () => {
  it('matches the PKCE example of RFC 7636', async () => {
    expect(await desafioDe('dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk', webcrypto)).toBe(
      'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM',
    );
  });
});

describe('crearUniverso', () => {
  it('takes https addresses only, or http to your own computer', () => {
    expect(() => crearUniverso({ ...base(), servicio: 'http://servicio.ejemplo.com/utn' })).toThrow('servicio tiene que ser https');
    expect(() => crearUniverso({ ...base(), vuelta: 'http://localhost:5173/vuelta' })).not.toThrow();
    expect(direccionSegura('https://u:p@miapp.ejemplo.com/')).toBe(false);
  });

  it('drops a broken saved sign-in instead of keeping it', async () => {
    const guardado = almacen();
    guardado.setItem('universo-ingreso', '{roto');
    const u = crearUniverso(base({ almacen: guardado, pedir: servicioFalso({}).pedir }));
    await expect(u.alVolver('?code=a&state=b')).rejects.toThrow('state');
    expect(guardado.getItem('universo-ingreso')).toBeNull();
  });

  it('asks for every address it needs', () => {
    expect(() => crearUniverso({ ...base(), clientId: '' })).toThrow('Falta clientId');
  });

  it('goes out with PKCE and comes back with the tokens', async () => {
    const { pedir, pedidos } = servicioFalso({ 'oauth-token': [200, { access_token: 'uat_1', refresh_token: 'urt_1' }] });
    const u = crearUniverso(base({ pedir }));
    const ida = new URL(await u.direccionDeIngreso());
    expect(ida.searchParams.get('code_challenge_method')).toBe('S256');
    expect(ida.searchParams.get('scope')).toBe('perfil materias');
    const state = ida.searchParams.get('state');

    const tokens = await u.alVolver(`?code=abc&state=${state}`);
    expect(tokens.access_token).toBe('uat_1');
    const { cuerpo } = pedidos[0];
    expect(cuerpo.grant_type).toBe('authorization_code');
    expect(await desafioDe(cuerpo.code_verifier, webcrypto)).toBe(ida.searchParams.get('code_challenge'));
  });

  it('rejects a return with another state, and the saved one is used only once', async () => {
    const { pedir, pedidos } = servicioFalso({});
    const u = crearUniverso(base({ pedir }));
    await u.direccionDeIngreso();
    await expect(u.alVolver('?code=abc&state=otro')).rejects.toBeInstanceOf(ErrorUniverso);
    await expect(u.alVolver('?code=abc&state=otro')).rejects.toThrow('state');
    expect(pedidos).toHaveLength(0);
  });

  it('returns null when the student says no', async () => {
    const u = crearUniverso(base({ pedir: servicioFalso({}).pedir }));
    const state = new URL(await u.direccionDeIngreso()).searchParams.get('state');
    expect(await u.alVolver(`?error=access_denied&state=${state}`)).toBeNull();
  });

  it('reads the API with the bearer token and passes the error code on', async () => {
    const { pedir, pedidos } = servicioFalso({
      'api-yo': [200, { id: 'x', alcances: ['perfil'] }],
      'api-materias': [403, { error: 'insufficient_scope' }],
    });
    const u = crearUniverso(base({ pedir }));
    expect((await u.leer('api-yo', 'uat_1')).id).toBe('x');
    expect(pedidos[0].opciones.headers.authorization).toBe('Bearer uat_1');
    await expect(u.leer('api-materias', 'uat_1')).rejects.toMatchObject({ codigo: 'insufficient_scope', estado: 403 });
  });

  it('renews and revokes with the client_id', async () => {
    const { pedir, pedidos } = servicioFalso({ 'oauth-token': [200, {}], 'oauth-revocar': [200, {}] });
    const u = crearUniverso(base({ pedir }));
    await u.renovar('urt_1');
    await u.revocar('urt_2');
    expect(pedidos.map((p) => [p.a, p.cuerpo.client_id])).toEqual([
      ['oauth-token', 'app_ejemplo'],
      ['oauth-revocar', 'app_ejemplo'],
    ]);
    expect(pedidos[0].cuerpo.grant_type).toBe('refresh_token');
  });
});
