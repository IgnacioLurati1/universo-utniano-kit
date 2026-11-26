# Universo UTNiano Kit: cómo se trabaja en este código

Guía para quien aporta, con o sin un asistente de código (Claude Code, Codex, Cursor). `CLAUDE.md` la importa.

Piezas sueltas para armar herramientas para alumnos de la UTN. Cada carpeta se copia sola a otro proyecto: JavaScript
moderno (ESM), sin compilar.

## Las reglas que no se negocian

- **Cada carpeta se copia sola.** Los imports van dentro de su carpeta. La única excepción es `calculadoras/`, que usa
  `formulas/`, y lo dice su README.
- **Nada de `eval`, `new Function` ni `innerHTML`.** Las fórmulas se leen a un árbol y el texto entra con
  `textContent`. Así las piezas andan en sitios con una CSP estricta.
- **La clave del campus.** Va siempre en el cuerpo del pedido, nunca en una URL, un log ni un archivo. La contraseña no
  se guarda nunca.
- **Moodle, solo lo que la API abre.** Por defecto se lee. Lo que escribe en el campus (inscribirse, entregar, mensajes,
  foro) es una lista cerrada que se prende a propósito, y la app le pregunta al alumno antes de cada acción.
- **Sysacad se lee de la página que el alumno ya tiene abierta.** Nada de pedir páginas por atrás ni de esquivar
  controles.
- **Los datos del alumno no salen de su navegador** por ninguna pieza del kit. Lo que haga tu app con ellos es tuyo y
  lo tenés que decir en su página de privacidad.
- **Ejemplos y pruebas con datos inventados.** Mails de `ejemplo.com`, nombres que no son de nadie.

## Guías por pieza

`.claude/skills/` tiene una guía por tarea: `moodle`, `sysacad`, `formulas`, `calculadora-nueva`, `horarios-facultad`,
`objeto-3d` y, antes de un pull request, `aportar`. Leé la que toque antes de cambiar esa pieza.

## Cómo se prueba

```
npm ci
npm test
```

`npm test` corre las pruebas de cada carpeta y `scripts/revisar.mjs`, que falla si encuentra una clave, una ruta de una
compu o un mail que no es de ejemplo.

## Cómo se escribe

- Comentarios del código en inglés. README y textos que lee alguien, en castellano rioplatense, entre compañeros.
- Cada carpeta tiene su README con qué hace, cómo copiarla, un ejemplo corto y de qué depende.
- Lo de terceros va en `THIRD-PARTY.md` con su licencia.

## Licencia

Lo que aportás entra con la licencia MIT del repo.
