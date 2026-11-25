# sysacad

Lectores de las páginas de Sysacad FRRO. Cada uno recibe el documento que el alumno ya tiene abierto y devuelve datos simples. No dibujan nada, no guardan nada y no hablan con ningún servidor.

Lo que hay

- `estado.js` lee Estado académico y devuelve las materias, el promedio, el avance y las horas de electivas.
- `examenes.js` lee Exámenes y devuelve cada final con su nota, el turno y un resumen de aprobados, aplazos y ausentes.
- `copia.js` pasa una pestaña a bloques de título, texto y tabla, sin campos ni imágenes.
- `saneo.js` limpia esas copias antes de usarlas en otro lado.
- `csv.js` arma un CSV que Excel en castellano abre en columnas y con tildes.
- `base.js` tiene lo común, como `normalizar`, `filasDe` y los nombres de electivas que Sysacad corta.

## Cómo copiarla

Copiá la carpeta entera a tu proyecto, o solo los archivos que uses más `base.js`. Los imports son relativos y no hay nada que instalar. Para probarla en tu máquina necesitás vitest y jsdom, pero para usarla alcanza con un navegador.

## Ejemplo

Desde un content script, o desde cualquier código que corra en la página de Sysacad.

```js
import { leerEstadoAcademico, leerExamenes, textoCsv, enlaceCsv } from './sysacad/index.js';

const estado = leerEstadoAcademico(document, { carrera: 'Ingeniería en Sistemas de Información' });
if (estado) {
  const { aprobadas, total, promedio } = estado.resumen;
  console.log(`${aprobadas} de ${total} aprobadas, promedio ${promedio?.toFixed(2)}`);
  console.log(`Te faltan ${estado.electivas?.faltan} hs de electivas`);
}

const finales = leerExamenes(document);
const filas = finales.examenes.map((e) => [e.dia, e.materia, e.nota]);
link.href = enlaceCsv([['Fecha', 'Materia', 'Nota'], ...filas]);
```

La `carrera` la escribe Sysacad bajo el nombre del alumno en el menú. Si no la pasás, igual leés todo menos lo que falta para las 20 hs de electivas.

## Datos del alumno

El tomo, el folio, el código de seguridad y el mail son datos del alumno. Estos lectores no los mandan a ningún lado. Lo que hagas con ellos en tu app es cosa tuya y tenés que contarlo en su página de privacidad. En los ejemplos y las pruebas usá siempre datos inventados.

## Depende de

Nada en tiempo de ejecución. Usa el DOM del navegador (`document`, `Date`, `Intl`). Las pruebas usan vitest y jsdom.

## Un aviso

Estos lectores se escribieron mirando las páginas de Sysacad de mediados de 2026. Si la facultad cambia el HTML, algo puede dejar de leerse. Las pruebas con las páginas de `paginas-de-prueba/` te avisan.
