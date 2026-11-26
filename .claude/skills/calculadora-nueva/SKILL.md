---
name: calculadora-nueva
description: Sumar al kit la lógica de una calculadora de una materia de la UTN, o cambiar el método de una que está en calculadoras/. Usar cuando se pida una calculadora, un simulador o un resolvedor paso a paso de una materia.
---

# Calculadora nueva

Una calculadora del kit resuelve como lo enseña la cátedra, paso a paso, con la notación del apunte. Una que resuelve
bien con otro método le enseña mal al alumno. En el kit va solo la cuenta: devuelve datos (pasos, tablas, árboles) y
cada app la dibuja a su manera.

## Antes de escribir código

1. **La fuente.** Pedile al usuario el apunte, la clase o el ejercicio resuelto de la cátedra que define el método
   (archivo, página). Sin una fuente no se arranca. El método no sale de lo que sabés en general. Si el apunte y tu
   conocimiento no coinciden, manda el apunte.
2. **Mirá una parecida.** Leé el módulo de la misma materia o del mismo estilo en `calculadoras/` (la tabla del
   README las agrupa). `reemplazo.js` y su prueba son un buen modelo.
3. **¿Ya existe?** Si es otra variante de una que está (otro algoritmo de planificación, otra distribución), va como
   opción de ese módulo, no como uno nuevo.

## Las partes

1. **La cuenta**, en `calculadoras/<nombre>.js`: funciones puras, sin DOM ni `window`. Arriba, un comentario en inglés
   que cita la fuente (materia, apunte, páginas) y dice qué convenciones sigue (desempates, redondeos).
   - Lo que escribe el alumno se lee con `cifras.js` (`leerNumero`, `leerLista`) o, si es una fórmula, con
     `../formulas/` (`leer`, `intentar`). Nada de `eval`.
   - Un dato mal escrito devuelve `{ error: '<qué falta, para el alumno>' }`, no tira.
   - Los números para mostrar, con `coma` y `redondear` de `cifras.js` o lo de `decir.js`, con coma decimal.
2. **Su prueba**, en `calculadoras/<nombre>.test.js`: los ejemplos del apunte con los resultados del apunte, más una
   entrada mal escrita y un caso borde. Si un resultado no coincide con el apunte, la que está mal es la calculadora.
   Se copian números de un ejercicio, nunca el texto de un libro.
3. **El índice**: `export * as <nombre> from './<nombre>.js';` en `calculadoras/index.js`, en orden alfabético.
4. **El README**: su fila en la tabla de `calculadoras/README.md`, con qué hace en pocas palabras.
5. **Si usa un método de la bibliografía** (una aproximación, un algoritmo con nombre), una línea en
   `THIRD-PARTY.md`, en «Métodos de la bibliografía».

## Revisar

- `npx vitest run calculadoras`.
- Probala con el dato más largo que tenga sentido y con uno vacío.
- Antes del pull request, la skill `aportar`.
