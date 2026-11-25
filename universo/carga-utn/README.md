# Carga con el emblema de la UTN

La animación que aparece mientras carga el Universo UTNiano. El emblema queda quieto y oscuro, y una luz le da la vuelta
al borde con una estela. Sin framework y sin dependencias.

El emblema es de la Universidad Tecnológica Nacional y no entra en la licencia MIT del kit. Usalo en proyectos de
alumnos de la UTN.

## Cómo se usa

Copiá `cargaUtn.js` y `carga-utn.css`.

```js
import { crearCargaUtn } from './cargaUtn.js';
import './carga-utn.css'; // o un <link> en tu página

const carga = crearCargaUtn({ texto: 'Cargando tus materias', pantalla: true });
document.body.append(carga);

await cargarTodo();
carga.classList.add('carga-utn--lista'); // se va con un fundido
setTimeout(() => carga.remove(), 400);
```

En React, el mismo SVG va dentro de un componente:

```jsx
import { CONTORNO } from './cargaUtn.js';

export function CargaUtn({ texto = 'Cargando' }) {
  return (
    <div className="carga-utn" role="status">
      <svg viewBox="-6 -6 96.3 112" aria-hidden="true" focusable="false">
        <path className="carga-utn__base" d={CONTORNO} />
        <path className="carga-utn__estela" d={CONTORNO} pathLength="100" />
        <path className="carga-utn__haz" d={CONTORNO} pathLength="100" />
      </svg>
      <span className="carga-utn__lectores">{texto}</span>
    </div>
  );
}
```

## Para ajustarla

- Los colores son variables de `.carga-utn` (`--carga-fondo`, `--carga-haz` y las demás).
- El tamaño sale del ancho del `svg`.
- Con movimiento reducido el emblema queda quieto.
- Si encadenás dos cargas (una mientras baja el código y otra mientras se arma la pantalla), `anclarAnimacion(carga)`
  hace que la luz siga de largo en vez de arrancar de cero.
