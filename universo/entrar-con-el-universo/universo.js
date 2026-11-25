// «Entrar con el Universo» for a student's app that lives in the browser: OAuth 2.0 authorization code with PKCE S256
// (RFC 6749, RFC 7636), then read-only calls to the API. The public guide, with scopes and error codes, is at
// https://universo.lutastudios.com/desarrolladores. SERVICIO, PERMISO and the client_id arrive when the app is approved.
// An app with its own server exchanges the code there, with its secret, and never ships the secret to the browser.

/** An error of the service, with its code (`invalid_grant`, `invalid_token`…) and the HTTP status. */
export class ErrorUniverso extends Error {
  constructor(codigo, estado) {
    super(codigo);
    this.name = 'ErrorUniverso';
    this.codigo = codigo;
    this.estado = estado;
  }
}

const CLAVE = 'universo-ingreso';
const LOCALES = new Set(['localhost', '127.0.0.1', '[::1]']);

/** https, or http to your own computer while you build the app. Never a user or password inside. */
export function direccionSegura(texto) {
  let u;
  try {
    u = new URL(texto);
  } catch {
    return false;
  }
  if (u.username || u.password) return false;
  if (u.protocol === 'https:') return Boolean(u.hostname);
  return u.protocol === 'http:' && LOCALES.has(u.hostname);
}

function leerGuardado(almacen) {
  const texto = almacen.getItem(CLAVE);
  almacen.removeItem(CLAVE);
  try {
    return JSON.parse(texto ?? 'null');
  } catch {
    return null;
  }
}

export const base64url = (bytes) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const alAzar = (cripto) => base64url(cripto.getRandomValues(new Uint8Array(32)));

/** The PKCE challenge of a verifier: SHA-256 in base64url. */
export async function desafioDe(verificador, cripto = globalThis.crypto) {
  return base64url(await cripto.subtle.digest('SHA-256', new TextEncoder().encode(verificador)));
}

/**
 * The client for one app. `almacen` keeps the verifier and the state between going out and coming back
 * (sessionStorage by default: it dies with the tab). `pedir` and `cripto` are there for tests.
 */
export function crearUniverso({
  servicio,
  permiso,
  clientId,
  vuelta,
  alcances = ['perfil'],
  almacen = globalThis.sessionStorage,
  pedir = globalThis.fetch?.bind(globalThis),
  cripto = globalThis.crypto,
}) {
  for (const [nombre, valor] of Object.entries({ servicio, permiso, clientId, vuelta })) {
    if (!valor) throw new Error(`Falta ${nombre}`);
  }
  // The code, the verifier and the tokens travel through these: https only, or http to your own computer.
  for (const [nombre, valor] of Object.entries({ servicio, permiso, vuelta })) {
    if (!direccionSegura(valor)) throw new Error(`${nombre} tiene que ser https`);
  }

  const ruta = (a) => `${servicio}?a=${encodeURIComponent(a)}`;

  async function respuesta(res) {
    const cuerpo = await res.json().catch(() => ({}));
    if (!res.ok) throw new ErrorUniverso(cuerpo.error ?? 'desconocido', res.status);
    return cuerpo;
  }

  const formulario = (datos) =>
    pedir(ruta(datos.ruta), {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams(datos.campos),
    }).then(respuesta);

  return {
    /** The address to send the student to. Saves the verifier and the state for the way back. */
    async direccionDeIngreso() {
      const verificador = alAzar(cripto);
      const state = alAzar(cripto);
      almacen.setItem(CLAVE, JSON.stringify({ verificador, state }));
      const url = new URL(permiso);
      url.search = new URLSearchParams({
        client_id: clientId,
        redirect_uri: vuelta,
        response_type: 'code',
        scope: alcances.join(' '),
        state,
        code_challenge: await desafioDe(verificador, cripto),
        code_challenge_method: 'S256',
      }).toString();
      return url.toString();
    },

    /**
     * On the return page, with its query string. Returns the tokens, or null if the student said no.
     * Throws if the return does not belong to the sign-in that this tab started.
     */
    async alVolver(busqueda) {
      const p = new URLSearchParams(busqueda);
      const guardado = leerGuardado(almacen);
      if (!guardado || !p.get('state') || p.get('state') !== guardado.state) {
        throw new ErrorUniverso('state', 0);
      }
      if (p.get('error')) return null;
      return formulario({
        ruta: 'oauth-token',
        campos: {
          grant_type: 'authorization_code',
          code: p.get('code') ?? '',
          redirect_uri: vuelta,
          client_id: clientId,
          code_verifier: guardado.verificador,
        },
      });
    },

    /** A new pair of tokens. The old refresh token stops working: renew from one place only. */
    renovar(refreshToken) {
      return formulario({
        ruta: 'oauth-token',
        campos: { grant_type: 'refresh_token', refresh_token: refreshToken, client_id: clientId },
      });
    },

    /** When the student signs out of your app. */
    revocar(token) {
      return formulario({ ruta: 'oauth-revocar', campos: { token, client_id: clientId } });
    },

    /** Read one API route (`api-yo`, `api-materias`) with the access token. */
    leer(rutaApi, accessToken) {
      return pedir(ruta(rutaApi), { headers: { authorization: `Bearer ${accessToken}` } }).then(respuesta);
    },
  };
}
