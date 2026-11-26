---
name: moodle
description: Usar la pieza moodle/ del kit para hablar con el campus virtual de la UTN (cursos, tareas, calendario, mensajes, foros, archivos), sumarle una función de lectura o entender un error del campus. Usar cuando se pida leer o escribir algo del campus Moodle, o cuando falle un pedido al campus.
---

# Moodle con la pieza del kit

El campus de cada facultad (FRRO: `https://frro.cvg.utn.edu.ar`) tiene la API móvil de Moodle. `moodle/` habla con
ella desde el navegador o desde Node, con la clave del alumno.

## Lo que nunca se hace

- **No le pidas al usuario su usuario, su contraseña ni su clave del campus**, ni para probar. Si hace falta probar
  contra el campus de verdad, lo corre el alumno en su navegador y te cuenta qué pasó. Lo que vos probás va contra un
  `fetch` falso.
- La clave va en el cuerpo del pedido. Nunca en una URL, un log, un archivo ni un mensaje de error.
- La contraseña solo pasa por `pedirClave` y no se guarda en ningún lado.
- Nada de pedir páginas del campus por atrás de la API (scraping) ni de esquivar sus controles.

## Cómo se usa

```js
import { crearMoodle } from './moodle/index.js';

const moodle = crearMoodle({ campus: 'https://frro.cvg.utn.edu.ar' });
const clave = await moodle.pedirClave(usuario, contrasena); // un intento por llamada, sin reintentos
const sitio = await moodle.llamar(clave, 'core_webservice_get_site_info');
```

- `llamar(clave, funcion, parametros)` solo acepta funciones de `LECTURA`. Cualquier otra se rechaza antes de pedir
  nada. Los pedidos del mismo momento salen juntos en uno solo.
- `pedirArchivo` y `bajarArchivo` solo piden al campus con el que creaste el cliente (`esArchivoDelCampus`). Los
  redirects nunca se siguen con la clave.
- `leerBloques(html)` (`bloquesCampus.js`) pasa el HTML de un texto del campus a datos sin etiquetas. Necesita
  `DOMParser`. El texto se muestra con `textContent`, nunca con `innerHTML`.

## Escribir en el campus

Viene apagado. Se prende con `crearMoodle({ campus, escritura: true })` y solo alcanza a la lista cerrada `ESCRITURA`:
inscribirse, subir y entregar tareas, mensajes, marcar como leída y responder en un foro. Cada función escribe una vez,
sin reintentar.

La app le pregunta al alumno antes de **cada** acción. La librería no lo hace por vos.

## Sumar una función de lectura

1. Buscá el nombre exacto en la documentación de la API de Moodle. Tiene que leer sin dejar rastro, casi siempre con
   `_get_` en el nombre. Nunca una que empiece o siga un intento, registre una vista o marque algo (`start_attempt`,
   `view_*`, `mark_*`).
2. Sumala a `LECTURA` en `moodle/moodle.js`, con un comentario en inglés que diga para qué se usa.
3. Probala en `moodle/moodle.test.js` con `vi.stubGlobal('fetch', ...)` y una respuesta inventada. La prueba
   `only lists functions that read` tiene que seguir pasando.

Sumar algo a `ESCRITURA` es otra conversación: abrí un issue antes.

## Los errores

Salen como `ErrorCampus` con un mensaje para el alumno y un `codigo`:

| `codigo` | Qué pasó |
|---|---|
| `invalidlogin` | Usuario o contraseña mal |
| `enablewsdescription`, `servicenotavailable` | El campus tiene la API móvil apagada |
| `sesion` | La clave venció o falta aceptar algo en el campus (`invalidtoken`, `accessexception`, `sitepolicynotagreed`, `usernotfullysetup`). Hay que volver a entrar |
| otro | El campus no respondió. Se reintenta más tarde, no en un bucle |

Cada pedido corta a los `TOPE_MS` (15 s), con el código `tiempo`.

## Revisar

`npx vitest run moodle`. Antes de un pull request, la skill `aportar`.
