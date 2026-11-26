---
name: formulas
description: Leer, evaluar, derivar y escribir fórmulas como se escriben en clase con la pieza formulas/ del kit, sin eval. Usar cuando haya que tomar una fórmula que escribe un alumno («e^(-x) - x», «2xy³», «sen(x)/x»), sumarle una función o un nombre que no entiende, o cuando una fórmula se lea o se derive mal.
---

# Fórmulas sin `eval`

`formulas/` pasa el texto a un árbol y trabaja sobre el árbol. Así anda en sitios con una CSP estricta y un texto
malicioso no puede correr código.

## Lo que nunca se hace

- Nada de `eval`, `new Function`, `with` ni de armar código con el texto del alumno. Si algo parece necesitarlo, va
  como un caso más del árbol.
- La fórmula escrita se muestra con `textContent`, nunca con `innerHTML`.

## Cómo se usa

```js
import { leer, intentar, compilar, derivar, escribir, leerNumero, dec } from './formulas/index.js';

const f = leer('e^(-x) - x');      // tira ErrorFormula si está mal escrita
compilar(f)(1);                    // -0.632...
escribir(derivar(f));              // '−e^(−x) − 1'

const g = leer('2xy^3', ['x', 'y']); // las variables se declaran, el resto es multiplicación
const { nodo, error } = intentar('2x +', ['x']); // sin tirar: error = 'La fórmula termina antes de tiempo.'
```

Lo que entiende: coma decimal, multiplicación sin signo (`2x`, `3(x + 1)`, `xy`), `π`, `√`, `²`, `³`, y las funciones
de `FUNCIONES` en `formula.js` con los nombres de la cátedra (`sen`, `tg`, `arcsen`, `senh`, `raiz`, `ln`, `log` en
base 10). Los nombres en inglés (`sin`, `tan`, `sqrt`) se aceptan por `OTROS_NOMBRES`.

`escribir` usa la notación de la cátedra: `−` de verdad, `·`, `√` y `sen`. `decimales.js` lee y muestra números
con coma (`leerNumero`, `dec`, `cientifico`, `porcentaje`).

## El árbol

Cada nodo tiene `t`: `n` (número), `v` (variable), `c` (constante, `pi` o `e`), `neg`, `+`, `-`, `*`, `/`, `^` y `f`
(función, con `n` el nombre y `a` el argumento). `N` (exportada), `F` y `OP` lo arman. `simplificar` limpia lo
que deja `derivar`.

## Sumar una función

Va en cuatro lugares de `formulas/formula.js`, y si falta uno se nota recién al derivar o al escribir:

1. `FUNCIONES`, con el nombre de la cátedra y su función de `Math`.
2. `OTROS_NOMBRES`, si tiene otro nombre común.
3. El caso `'f'` de `derivar`, con su regla y la regla de la cadena (mirá `senh` y `cosh`).
4. `simplificar`, si tiene valores exactos que conviene dejar (como `ln(e) = 1`).

Pruebas en `formulas/formula.test.js`: que se lea con los dos nombres, que evalúe, que la derivada coincida con una
derivada numérica en varios puntos y que `escribir` la muestre como en el apunte.

## Una fórmula que se lee mal

Primero escribí la prueba con el texto tal cual lo escribió el alumno y lo que esperaba. La multiplicación sin signo es
la causa más común. `sen2x` se rechaza (pide `sen(2x)`) y `e^2x` se lee como e²·x. Esas reglas están en `leer`.
Si cambiás cómo se lee algo, corré también `npx vitest run calculadoras`, que usa esta pieza.

## Revisar

`npx vitest run formulas calculadoras`. Antes de un pull request, la skill `aportar`.
