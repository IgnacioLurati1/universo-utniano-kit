# moodle

Habla con el campus Moodle de tu facultad por su API móvil, sin framework. Sirve para armar tu propio panel de cursos,
tareas, calendario o mensajes. Se lee por defecto, y lo que escribe en el campus se prende a propósito.

## Cómo copiarla

Copiá la carpeta entera a tu proyecto. Anda sola, en el navegador o en Node 18 o más nuevo (usa `fetch`).
`bloquesCampus.js` además necesita un DOM (`DOMParser`), o sea un navegador o jsdom.

## Ejemplo

```js
import { crearMoodle } from './moodle/index.js';

// El campus es solo el origen, con https. Este es el de FRRO.
const moodle = crearMoodle({ campus: 'https://frro.cvg.utn.edu.ar' });

const clave = await moodle.pedirClave(usuario, contrasena); // un intento por llamada
const sitio = await moodle.llamar(clave, 'core_webservice_get_site_info');
const cursos = await moodle.llamar(clave, 'core_enrol_get_users_courses', { userid: sitio.userid });
```

Para pasar el HTML de un texto del campus a bloques sin etiquetas.

```js
import { leerBloques } from './moodle/index.js';
const bloques = leerBloques(curso.summary); // títulos, listas y párrafos como datos, sin HTML
```

## Las reglas que trae

- `llamar` rechaza, antes de pedir nada, cualquier función que no esté en `LECTURA`.
- La clave del alumno va siempre en el cuerpo del pedido, nunca en la URL.
- Los archivos solo se piden al campus con el que creaste el cliente, y los redirects nunca se siguen con la clave.
- Las lecturas que se piden en el mismo momento salen juntas en un solo pedido.
- Escribir en el campus (inscribirse, entregar tareas, mensajes, responder en un foro) viene apagado. Se prende con
  `crearMoodle({ campus, escritura: true })`, y cada función escribe una vez, sin reintentar. Preguntale al alumno antes
  de cada acción, que eso no lo hace la librería.

## De qué depende

De nada. Las pruebas usan vitest y jsdom.
