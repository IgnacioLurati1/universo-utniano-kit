# utiles

Funciones chicas y puras que se repiten en cualquier app para alumnos.

- `datos.js` pasa HTML a texto plano (`textoPlano`), deja solo links http(s) y les saca la clave (`enlaceSeguro`), lee el
  id de un video de YouTube (`idDeYoutube`), saca el dominio (`dominioDe`), compara textos sin tildes (`normalizar`) y
  dice cuánto falta para una fecha (`faltan`).
- `formato.js` lee un formato mínimo (títulos, listas, negrita, cursiva y links) y devuelve piezas de datos. Nunca
  genera HTML.
- `csv.js` decodifica archivos (UTF-8, UTF-16 o Windows-1252), lee CSV, propone una tabla con nombres y tipos, y escribe
  un CSV que Excel en castellano abre bien.
- `red.js` le saca la red a un worker que corre código de otro. Es un segundo cerrojo. El worker igual necesita una CSP que le cierre `connect-src`, `font-src`, `img-src` y `script-src`, porque `import()` no se puede sacar.

## Cómo copiarla

Copiá la carpeta entera, o solo el archivo que te sirva. Cada uno es independiente, salvo `formato.js` que usa
`enlaceSeguro` de `datos.js`. `textoPlano` necesita un DOM.

## Ejemplo

```js
import { enlaceSeguro, idDeYoutube, faltan } from './utiles/index.js';

enlaceSeguro('javascript:alert(1)');                    // null
enlaceSeguro('https://ejemplo.com/a?token=secreta');    // 'https://ejemplo.com/a'
idDeYoutube('https://youtu.be/dQw4w9WgXcQ?t=3');        // 'dQw4w9WgXcQ'
faltan(vence, Date.now() / 1000);                       // 'Vence mañana'
```

```js
// Adentro de un worker, antes de correr código de otro
import { cerrarRed } from './red.js';
const responder = self.postMessage.bind(self); // cerrarRed también lo saca
cerrarRed(self);
```

## De qué depende

De nada.
