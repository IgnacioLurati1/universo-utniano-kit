# Entrar con el Universo

Para que los usuarios de tu app entren con su cuenta del Universo UTNiano, la misma de El Santo Resumen. Con su permiso,
tu app lee algunos datos suyos. Nunca ves la contraseña, nunca tocás la base y solo leés.

La guía completa, con los alcances y los errores, está en https://universo.lutastudios.com/desarrolladores. Ahí también
se pide el acceso. Si se aprueba, te llegan tu `client_id` y las direcciones de `servicio` y `permiso`.

## Cómo se usa

Copiá `universo.js`. Es para una app que vive en el navegador. Usa OAuth 2.0 con PKCE y no lleva secreto.

```js
import { crearUniverso } from './universo.js';

const universo = crearUniverso({
  servicio: 'https://…', // te la pasamos con tu client_id
  permiso: 'https://…',
  clientId: 'app_xxxxxxxxxxxxxxxxxxxxxx',
  vuelta: 'https://miapp.ejemplo.com/vuelta',
  alcances: ['perfil', 'materias'],
});

// En el botón «Entrar con el Universo»
location.assign(await universo.direccionDeIngreso());

// En la página de vuelta
const busqueda = location.search;
history.replaceState(null, '', location.pathname); // saca el código de la barra antes de canjearlo
const tokens = await universo.alVolver(busqueda);
if (tokens) {
  const { materias } = await universo.leer('api-materias', tokens.access_token);
} // null: el alumno dijo que no
```

## Lo que conviene saber

- El token de acceso dura 1 hora. Con `renovar(refresh_token)` te llega un par nuevo y el viejo deja de servir.
  Renová desde un solo lugar.
- Cuando el alumno sale de tu app, `revocar(refresh_token)`.
- Los errores llegan como `ErrorUniverso`, con `codigo` (`invalid_grant`, `invalid_token`, `insufficient_scope`…) y
  `estado`. Con `invalid_token`, o con `invalid_grant` al renovar, el alumno vuelve a entrar.
- Si tu app tiene servidor propio, el canje del código se hace ahí con tu secreto. El secreto nunca va al navegador.
- Guardá los tokens donde guardás una sesión. Nunca en la dirección de la página ni en un log.
