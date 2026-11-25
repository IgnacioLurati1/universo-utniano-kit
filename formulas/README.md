# formulas

Lee fórmulas como se escriben en clase y las convierte en un árbol, sin `eval` ni `new Function`. Las evalúa, las deriva
y las vuelve a escribir con la notación de la cátedra, así que anda también en sitios con una CSP estricta.

Entiende la coma decimal, la multiplicación sin signo (`2x`, `3(x + 1)`, `xy`), `sen`, `tg`, `raiz`, `π`, `√`, `²` y `³`.

## Cómo copiarla

Copiá la carpeta entera. No usa `window` ni nada del navegador, así que también corre en Node.

## Ejemplo

```js
import { leer, compilar, derivar, escribir } from './formulas/index.js';

const f = leer('e^(-x) - x');
compilar(f)(1);          // -0.632...
escribir(derivar(f));    // '−e^(−x) − 1'

const g = leer('2xy^3', ['x', 'y']);
compilar(g, ['x', 'y'])(2, 1); // 4
```

Si el texto está mal escrito, `leer` tira un `ErrorFormula`. `intentar` hace lo mismo pero devuelve `{ error }`.
`decimales.js` trae `leerNumero` y `dec` para leer y mostrar números con coma.

## De qué depende

De nada.
