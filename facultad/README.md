# facultad

Horarios de cursada y calendario académico de la UTN Facultad Regional Rosario, más el plan de Ingeniería en Sistemas con sus correlativas, todo en JSON y JavaScript listo para usar. Incluye los scripts que traen los horarios de las páginas públicas de la facultad.

Lo que hay

- `datos/horarios.json` tiene las comisiones de las cinco carreras. Cada clase es `[cuatrimestre, día, desde, hasta, materia]`. El día va de 1 (lunes) a 6 (sábado), las horas están en minutos desde la medianoche y la materia es un índice de la lista `materias`. No trae nombres de docentes.
- `datos/calendario.js` tiene el ciclo lectivo, los llamados a final, los trámites y los días sin clases.
- `datos/plan-sistemas.json` tiene las materias de Ingeniería en Sistemas de Información (plan 2023) con sus correlativas.
- `datos/fuentes.json` guarda la huella de cada archivo de la facultad que se leyó, para notar cuándo cambia.
- `actualizar.mjs` trae todo de nuevo. Con `--revisar` no escribe nada y avisa qué cambió.
- `planillas.mjs`, `basicas.mjs` y `pdfs.mjs` leen las planillas y los PDF de horarios. Los tres tienen sus pruebas.

## Cómo copiarla

Copiá la carpeta entera. Si solo querés los datos, llevate `datos/`. Para correr `actualizar.mjs` hace falta Node 20 o más nuevo y las dos dependencias de abajo.

## Ejemplo

```js
import { readFileSync } from 'node:fs';
import { CALENDARIO } from './facultad/datos/calendario.js';

const horarios = JSON.parse(readFileSync('./facultad/datos/horarios.json', 'utf8'));
const plan = JSON.parse(readFileSync('./facultad/datos/plan-sistemas.json', 'utf8'));

// Las clases de la comisión 3K02 y los llamados de este ciclo.
const comision = horarios.comisiones.find((c) => c.codigo === '3K02');
for (const [cuat, dia, desde, hasta, i] of comision.clases) {
  console.log(cuat, dia, desde / 60, hasta / 60, horarios.materias[i]);
}
console.log(CALENDARIO.llamados.map((l) => l.examenes[0]));

// Qué pide Bases de Datos.
console.log(plan.obligatorias.find((m) => m.nombre === 'Bases de Datos'));
```

## Las correlativas

En `plan-sistemas.json` cada materia lleva lo que pide para cursarla, como en la tabla del plan de la carrera. `cursadas` son las materias que tenés que tener regularizadas y `aprobadas`, las que tenés que tener con el final aprobado. Son números que apuntan al campo `n` de otra materia obligatoria.

Las electivas no tienen `n`, pero también pueden pedir materias. En `otras` está el Seminario Integrador, que además pide aprobadas para rendirlo (`paraRendir`). `sinCorrelativas` lista las que existen en Sysacad pero no tienen correlativas cargadas.

Ante la duda, manda siempre lo que diga Sysacad.

## Qué hay que saber de los datos

- Salen de los horarios publicados por la facultad en 2026. Se vuelven viejos, así que traé los nuevos con `node facultad/actualizar.mjs` cada cuatrimestre.
- Hay comisiones que la facultad publica en archivos que no se pueden leer, como PDF escaneados. Quedan anotadas en `carreras[].faltan` de `horarios.json`.
- El calendario académico es un PDF escaneado, así que `calendario.js` está escrito a mano. El script solo avisa si el PDF cambió.
- Los scripts leen los archivos de Google Drive que la facultad enlaza en sus páginas. No se saltean nada y piden lo mismo que pediría un navegador.

## Depende de

- `fflate` (MIT) para abrir las planillas xlsx.
- `pdfjs-dist` (Apache-2.0) para leer los PDF.

Las pruebas corren con vitest.
