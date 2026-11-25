# calculadoras

La lógica de las calculadoras de las materias, sin pantallas. Cada módulo recibe texto o números y devuelve datos
(pasos, tablas, árboles), así que lo dibujás como quieras.

| Módulo | Qué hace |
|---|---|
| `automatas` | expresiones regulares, autómatas y su paso a AFD |
| `gramaticas` | clasificación, derivaciones y árbol de derivación |
| `proposiciones` | parser y tabla de verdad |
| `relaciones`, `arboles` | propiedades de relaciones, árboles y recorridos |
| `dependencias` | cierres, claves y formas normales de bases de datos |
| `subred` | subdivisión de redes IP |
| `congestion` | ventana de congestión de TCP |
| `planificacion`, `reemplazo`, `interbloqueos` | planificación de CPU, reemplazo de páginas e interbloqueos |
| `distribuciones`, `estadistica` | modelos de probabilidad y medidas de una muestra |
| `matrices`, `racional` | determinante, inversa, rango y fracciones exactas |
| `numerico` | raíces, punto fijo y ecuaciones diferenciales |
| `estudio`, `campo`, `lgr`, `tiro`, `cargas` | análisis de funciones, campos vectoriales, lugar de raíces, tiro oblicuo y cargas |
| `graficadora`, `graficadora3d`, `superficies`, `trazado` | los números detrás de los gráficos, sin dibujarlos |
| `stocks`, `pruebaEscritorio` | gestión de stocks y simulación de colas e inventarios |
| `cifras`, `decir` | leer y mostrar números como en los apuntes |

## Cómo copiarla

Copiá `calculadoras/` y también `formulas/`, que es lo único de afuera que usa (`../formulas/`). No usa `window`.

## Ejemplo

```js
import { subred, proposiciones, matrices } from './calculadoras/index.js';

const red = subred.subdividir('192.168.0.0/24', 'c', '4'); // cuatro subredes
red.filas[0].broadcast;                                    // '192.168.0.63'

proposiciones.tablaVerdad('p -> q').asignaciones;          // las cuatro filas de V y F
```

También podés importar un módulo suelto, por ejemplo `./calculadoras/subred.js`, y se lleva `formulas/` solo si lo usa.

## De qué depende

De `../formulas/`. Nada más.
