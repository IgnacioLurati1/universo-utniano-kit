---
name: objeto-3d
description: Cómo armar un objeto o un lugar en 3D para la web con three.js que se parezca al de verdad y no trabe la página, con facu-3d/ del kit como ejemplo completo. Usar al crear una escena 3D, sumarle una pieza o un material, calcarla de una foto o usar facu-3d en una app; no para ajustar un valor suelto.
---

# Objetos en 3D para la web

`facu-3d/` es el ejemplo completo: la entrada de UTN FRRO medida de una foto. Leé `describir.js` (datos en metros) y
`escena.js` (three.js) antes de arrancar algo parecido.

## Formas calcadas, nunca a ojo

- Cada forma sale de una referencia real: plano, plantilla o foto. Se calca y se compara superpuesta. Dibujada a ojo
  sale irreconocible. Si la referencia no se ve bien, pedí otra.
- La escala sale de medidas conocidas (una puerta, un escalón) y se corrige la perspectiva de la foto. En el archivo
  de cada forma van la fuente, las medidas usadas y el error del ajuste. Mirá el comentario de arriba de
  `facu-3d/describir.js`.
- Unidades reales (metros o milímetros) y un solo sistema de ejes, escrito en un archivo.
- Contornos cerrados y suaves, con las esquinas marcadas a propósito.
- Sin marcas ajenas: de un producto de otra marca se calca la forma, sin sus logos ni sus letras. Un emblema que no es
  tuyo va con su excepción en el README y en `THIRD-PARTY.md`, como el de la UTN.

## Datos aparte de three.js

- Una función pura describe la escena (cajas, piezas, materiales, cámara) y no importa three.js. Así se prueba en Node:
  que cada pieza esté dentro de sus límites, que no se solapen y que respete las proporciones de la referencia
  (`facu-3d/describir.test.js`).
- La escena aplica esa descripción. Cambiar un color o un material cambia valores, no rearma ni recompila.
- Cada falla arreglada suma una prueba que la habría atrapado.

## Armado y materiales

- Una pieza por material y por parte que cambia. Las cajas del mismo material se juntan en una geometría
  (`mergeGeometries`): pocos dibujos por cuadro.
- Sin caras coplanares que titilan (separalas una fracción de milímetro) y sin huecos en las uniones.
- Material estándar (PBR) con texturas chicas hechas en un canvas, nada de imágenes pesadas. Sutiles y comparados con
  la foto: lo exagerado se ve de juguete.

## Que no trabe la página

- three.js y la escena bajan aparte, con `import()`, cuando la caja está por verse (IntersectionObserver) y, si es
  decorativa, cuando el navegador está libre (`requestIdleCallback`).
- Se deja de dibujar fuera de la vista y con la pestaña oculta. Un solo cuadro pendiente por vez (`facu-3d/bucle.js`).
- Tope de densidad de píxeles. Si es un fondo, 30 cuadros por segundo alcanzan.
- Los shaders se compilan antes de mostrar (`compileAsync`) y el lienzo aparece con un fundido.
- Sin WebGL 2 o con dibujo por software (SwiftShader, llvmpipe), no se monta: nada o una imagen, sin romper la
  página.

## Accesibilidad

- Con `prefers-reduced-motion`, sin movimiento solo. Se puede seguir girando.
- Girar arrastrando sin robarle el scroll a la página en el celular (`touch-action: none` solo en su pantalla).
- Si es decorativa, `aria-hidden`. Si se maneja, foco con teclado (flechas, `+` y `-`), `role="application"` y una
  etiqueta que describa lo que se ve.

## Revisar antes de mostrar

- Capturas con placa de video real: un navegador con ventana (no headless, que dibuja por software), con
  `--use-angle=d3d11` en Windows, y un servidor propio en un puerto libre.
- De cerca y desde varios ángulos, sobre todo uniones y bordes. De día y de noche si tiene los dos.
- Antes y después del cambio, para ver que nada más se movió.
- Mirá las capturas antes de decir que está listo.
