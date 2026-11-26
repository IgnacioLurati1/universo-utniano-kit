# facu-3d

La entrada de la Facultad Regional Rosario en 3D, con three.js. La que está atrás del ingreso de Super CVG. De día con
el tema claro y de noche con el oscuro, con el cartel, el hall y los faroles prendidos.

Tiene dos usos:

- **De fondo** (`modo: 'fondo'`), detrás de una página. Se mueve despacio, queda debajo de un velo con el color de tu
  fondo para que los textos se sigan leyendo y los lectores de pantalla no la anuncian.
- **Sola** (`modo: 'sola'`), en una pantalla para ella. Se gira arrastrando con el mouse o un dedo, y se acerca con la
  rueda o con dos dedos. Con el teclado, las flechas giran (con Shift, más rápido) y `+` y `-` acercan.

El emblema de la UTN que aparece en la fachada es de la Universidad Tecnológica Nacional y no entra en la licencia MIT
del kit. Usalo en proyectos de alumnos de la UTN.

## Cómo copiarla

Copiá la carpeta entera. Necesita [three.js](https://threejs.org) (MIT), probada con la 0.187:

```
npm install three
```

Sin bundler, un import map alcanza:

```html
<script type="importmap">
  {
    "imports": {
      "three": "https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js",
      "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.187.0/examples/jsm/"
    }
  }
</script>
```

`facu3d.js` es liviano. three.js y la escena (unos 170 KB con gzip si pasan por un bundler) bajan recién cuando la
caja está por verse, y de fondo esperan a que el navegador esté libre.

## Ejemplo

```js
import { montarFacu3D } from './facu-3d/facu3d.js';
import './facu-3d/facu-3d.css'; // o un <link> en tu página

const noche = () => document.documentElement.dataset.tema === 'oscuro';

const facu = montarFacu3D(document.querySelector('#escena'), {
  modo: 'sola',
  noche: noche(),
  alFallar: () => mostrarAviso('Tu navegador no la puede dibujar.'),
});

// Cuando cambia el tema de tu sitio
facu.noche(noche());

// Un botón «Verla de frente»
facu.foto();

// Al salir de la pantalla
facu.destruir();
```

La caja que le pasás tiene que tener tamaño, porque el dibujo la llena. De fondo se pone sola en `position: fixed`
detrás de todo.

## Lo que conviene saber

- Solo se dibuja con WebGL 2 en una placa de video de verdad (`puede3D()`). Con dibujo por software, como SwiftShader o
  llvmpipe, trababa la página varios segundos, así que no se monta y llama a `alFallar`. Lo mismo si el navegador pierde
  la placa en el medio. En Chrome y Edge la aceleración se prende en Configuración, Sistema, «Usar aceleración de
  gráficos cuando esté disponible».
- Si el sistema pide reducir el movimiento, queda quieta y se sigue pudiendo girar. `quieto: true` o `false` le gana
  al sistema, y `facu.quieto(undefined)` vuelve a seguirlo.
- Si el usuario eligió en tu sitio no ver animaciones o ahorrar datos, directamente no la montes.
- En una pantalla sola, `facu.enfocar()` le pasa el foco del teclado. El lienzo se anuncia como una aplicación con
  `DESCRIPCION`, así el lector de pantalla le deja pasar las flechas.
- Colores del CSS: `--facu3d-fondo` (el velo de fondo, por defecto el del sistema) y `--facu3d-foco` (el borde del
  foco).

## Cómo está hecha

- `describir.js` arma la escena como datos: cada pieza en metros, sin three.js. Las medidas salen de una foto tomada
  desde la vereda de enfrente, con el ajuste explicado arriba del archivo. El error ronda el 10 %.
- `logo.js` es el emblema calcado de la pared, de la misma foto.
- `escena.js` lo pasa a three.js: junta las cajas por material para hacer pocos dibujos, compila los shaders sin trabar
  la página y de fondo dibuja a 30 cuadros por segundo.
- `bucle.js` deja un solo cuadro pendiente por vez. Sin eso, arrastrar pedía cuadros de más hasta colgar la pestaña.

Las pruebas (`npm test`) revisan la escena, el bucle y el montaje. Lo que se ve, solo se puede probar en un navegador
con placa de video.
