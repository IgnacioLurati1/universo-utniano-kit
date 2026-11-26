# Universo UTNiano Kit

Piezas sueltas para armar herramientas para alumnos de la UTN. Salen de El Santo Resumen, Super CVG, Sysacad Lindo y el
Universo UTNiano. Cada carpeta se copia sola a tu proyecto, sin compilar nada.

No es un proyecto oficial de la UTN.

## Qué hay

| Carpeta | Para qué |
|---|---|
| [`moodle/`](moodle) | Hablar con el campus virtual desde el navegador, con la clave del alumno. Lee y, si lo prendés, escribe |
| [`sysacad/`](sysacad) | Leer las páginas de Sysacad que el alumno tiene abiertas. Estado académico, exámenes, copia en bloques y CSV para Excel |
| [`formulas/`](formulas) | Leer fórmulas escritas como en clase («e^(-x) - x», «sen(x)/x») y derivarlas, sin `eval` |
| [`calculadoras/`](calculadoras) | La lógica de las calculadoras de las materias. Autómatas, gramáticas, subredes, planificación, banquero, numérico, matrices y más |
| [`facultad/`](facultad) | Horarios, calendario y plan de Ingeniería en Sistemas de FRRO en JSON, con el script que los actualiza |
| [`facu-3d/`](facu-3d) | La entrada de la facultad en 3D, de fondo detrás de una página o sola para girarla |
| [`utiles/`](utiles) | Texto plano de un HTML, links seguros, formato sin HTML, CSV y un proceso de fondo sin red |
| [`universo/carga-utn`](universo/carga-utn) | La animación de carga con el emblema de la UTN |
| [`universo/entrar-con-el-universo`](universo/entrar-con-el-universo) | Que tus usuarios entren con su cuenta del Universo UTNiano |

## Cómo se usa

Copiá la carpeta que necesitás. Su README trae un ejemplo y dice de qué depende. Son módulos de JavaScript (ESM) que
andan en el navegador y en Node.

Si querés correr las pruebas:

```
npm ci
npm test
```

## Aportar

Abrí un issue o un pull request. Antes leé [AGENTS.md](AGENTS.md), con las reglas que cuidan los datos de cada alumno.
Los asistentes de código lo leen solos. Nunca le pases tu usuario ni tu clave del campus a un asistente.

## Licencia

[MIT](LICENSE). El emblema de la UTN (en `universo/carga-utn` y `facu-3d`) y las páginas de prueba de Sysacad no entran en la licencia. Lo de terceros está en
[THIRD-PARTY.md](THIRD-PARTY.md).
