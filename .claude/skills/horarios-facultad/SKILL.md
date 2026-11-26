---
name: horarios-facultad
description: Actualizar o corregir los horarios de cursado, el calendario académico o el plan de Sistemas de UTN FRRO en facultad/ del kit, o arreglar un lector cuando la facultad cambia el formato de sus archivos. Usar cuando cambian los horarios de un cuatrimestre, falta o está mal una comisión, sale el calendario nuevo o falla facultad/actualizar.mjs.
---

# Horarios, calendario y plan de la facultad

Están en `facultad/datos/`. Cambian cada cuatrimestre y salen de lo que publica la facultad en sus páginas públicas.

## Horarios

- `node facultad/actualizar.mjs` los trae de las páginas de cada departamento y reescribe `horarios.json` y
  `fuentes.json`.
- `node facultad/actualizar.mjs --revisar` no escribe nada. Dice en Markdown qué cambió y sale con 2 si algo cambió.
  Corré este primero.
- `--sin-calendario` reescribe los horarios pero deja la huella del calendario viejo, para que el aviso del calendario
  nuevo siga hasta que alguien lo pase a mano.
- Cómo se lee cada carrera:
  - Sistemas publica planillas, una por año (`planillas.mjs`).
  - Civil, Química y Mecánica publican PDF hechos con la misma plantilla (`pdfs.mjs`). Un PDF escaneado no tiene
    texto y no se puede leer.
  - Materias Básicas publica una planilla por carrera (`basicas.mjs`) y completa las comisiones que no dio el
    departamento.
- Lo que no se pudo leer queda en `carreras[].faltan` de `horarios.json`. No se inventa una comisión ni un horario.
- Los nombres oficiales de las materias de cada carrera están en `facultad/planes.json`, con sus alias. Una materia
  que no se reconoce se suma ahí como alias, no se renombra en el lector.
- Los horarios no llevan nombres de docentes.

## Si una carrera cambió el formato

El arreglo va en su lector, con una prueba en su `*.test.mjs` hecha con un recorte del archivo nuevo. Recortá solo lo
que la prueba necesita y sin nombres de personas.

Los scripts piden los archivos que la facultad enlaza (muchos en Google Drive) como lo haría un navegador. No se
saltean nada: si un archivo pide permiso o no se puede bajar, queda en `faltan`.

## Calendario académico

`facultad/datos/calendario.js` se pasa a mano del PDF oficial, que viene escaneado: ciclo lectivo, llamados a final,
trámites y días sin clases, tal cual dice el PDF. El script solo compara la huella del PDF para notar uno nuevo.

## Plan de Sistemas

`facultad/datos/plan-sistemas.json` es el plan 2023 con sus correlativas: `cursadas` (regularizadas) y `aprobadas`
(con final), como números que apuntan al `n` de otra materia. Las electivas no tienen `n`. Ante la duda, manda lo que
diga Sysacad.

## Revisar

- `npx vitest run facultad`.
- En el pull request, el link de la fuente oficial de lo que cambió. Después, la skill `aportar`.
