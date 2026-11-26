---
name: sysacad
description: Leer páginas de Sysacad FRRO con la pieza sysacad/ del kit (estado académico, exámenes, copia en bloques, CSV), arreglar un lector cuando Sysacad cambia su HTML o sumar uno para otra página. Usar cuando se pida sacar datos de Sysacad, cuando un lector deja de leer o cuando haya que probar con una página de Sysacad.
---

# Sysacad con la pieza del kit

Sysacad no tiene API. Los lectores de `sysacad/` reciben el `document` de la página que **el alumno ya tiene
abierta** y devuelven datos simples. No dibujan, no guardan y no hablan con ningún servidor.

## Lo que nunca se hace

- No pidas páginas de Sysacad por atrás (`fetch` a sus direcciones, un navegador automático con la sesión del alumno).
  Se lee solo lo que el alumno abrió.
- No esquives sus controles ni su verificación del navegador. Si una página no carga, el alumno la abre a mano.
- No le pidas al usuario su legajo, su contraseña ni una página suya guardada con datos reales.
- Tomo, folio, código de seguridad y mail son datos del alumno. No salen de su navegador por el kit.
- En pruebas y ejemplos, todo inventado: alumno, notas, fechas, códigos y mails de `ejemplo.com`.

## Lo que hay

| Archivo | Qué lee |
|---|---|
| `estado.js` | Estado académico: materias, promedio, avance, horas de electivas (`leerEstadoAcademico(doc, { carrera })`) |
| `examenes.js` | Exámenes: cada final con nota y turno, y el resumen (`leerExamenes(doc)`) |
| `copia.js` | Cualquier pestaña a bloques de título, texto y tabla (`copiaDeLaPestana`) |
| `saneo.js` | Limpia esas copias antes de usarlas en otro lado |
| `csv.js` | CSV que Excel en castellano abre en columnas y con tildes (`textoCsv`, `enlaceCsv`) |
| `base.js` | Lo común: `normalizar`, `filasDe`, `tablasDeDatos`, `tablaConColumnas`, electivas cortadas |

## Cómo se busca una tabla

Las páginas de Sysacad son tablas anidadas sin ids estables. No busques por posición ni por clase: buscá la tabla por
los títulos de sus columnas, normalizados (minúsculas, sin tildes).

```js
const hallada = tablaConColumnas(document, ['ano', 'materia', 'estado']);
if (!hallada) return null; // otra página, o Sysacad cambió
```

Un lector que no encuentra lo suyo devuelve `null`, no tira un error.

## Arreglar un lector o sumar uno

1. Necesitás la estructura real del HTML. El alumno guarda la página (Ctrl+S) y **cambia a mano** nombre, legajo, notas,
   fechas, tomo, folio y códigos por datos inventados antes de pasártela. Si te llega con datos reales, frená y
   pedile que los cambie. No la guardes así en el repo.
2. La página va en `sysacad/paginas-de-prueba/<nombre>-real.html`. Esa carpeta queda fuera de la licencia MIT (lo
   dice su `LEEME.md`).
3. El lector va en su archivo, usa lo de `base.js` y se exporta desde `index.js`. Comentarios en inglés.
4. La prueba en `sysacad/sysacad.test.js` lee la página con `pagina('<nombre>')` y revisa lo que sale. Sumá también
   una tabla armada a mano para el caso borde (materia sin nota, electiva con el nombre cortado, página vacía).
5. Si cambió el HTML de Sysacad, que sigan pasando las pruebas con las páginas viejas cuando se pueda: hay alumnos con
   cachés y extensiones viejas.

## Revisar

`npx vitest run sysacad`. Antes de un pull request, la skill `aportar`.
