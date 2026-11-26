---
name: aportar
description: Revisar un cambio del Universo UTNiano Kit y dejarlo listo para un pull request (reglas, pruebas, README y descripción). Usar cuando el usuario termina un cambio y quiere mandarlo, o pide revisarlo antes de subirlo.
---

# Aportar un cambio

## 1. Qué cambió

`git status` y `git diff` contra la rama principal del repo original. Un pull request, una cosa: si hay dos cambios
sueltos, proponé separarlos.

Frená y avisale al usuario si ves:

- claves, tokens, archivos `.env` o rutas de su computadora;
- datos reales de alguien (notas, nombres, mails, legajos, tomo y folio), también en las pruebas y en las páginas de
  prueba de Sysacad: se inventan;
- archivos generados (`dist/`, `graphify-out/`, `coverage/`) o dependencias nuevas sin motivo.

## 2. Las reglas de `AGENTS.md`

Revisá el cambio contra cada una:

- Cada carpeta se copia sola: los imports quedan dentro de su carpeta (la única excepción es `calculadoras/`, que usa
  `formulas/`).
- Nada de `eval`, `new Function` ni `innerHTML`.
- La clave del campus va en el cuerpo del pedido, nunca en una URL, un log ni un archivo. La contraseña no se guarda.
- Moodle: solo lo que abre la API. Lo que escribe está en la lista cerrada y la app pregunta antes de cada acción.
- Sysacad: solo la página que el alumno ya tiene abierta.
- Los datos del alumno no salen de su navegador por ninguna pieza.

Si el cambio toca una regla, no la esquives: explicale al usuario cuál y buscá juntos otra forma.

## 3. Las pruebas

```
npm test
```

Corre las pruebas de cada carpeta y `scripts/revisar.mjs`, que falla si encuentra una clave, una ruta de una compu o
un mail que no es de ejemplo. Mirá solo lo que falló. Un error arreglado deja su prueba.

## 4. Lo que acompaña al código

- Comentarios del código en inglés. README y textos que lee alguien, en castellano rioplatense, entre compañeros.
- Si cambió cómo se usa la pieza, su README (qué hace, cómo copiarla, un ejemplo corto y de qué depende).
- Una carpeta nueva va en la tabla del `README.md` de la raíz.
- Una dependencia nueva, o algo copiado de otro proyecto, va en `THIRD-PARTY.md` con su licencia.

## 5. La descripción

- Qué cambia para quien usa la pieza, en una o dos oraciones.
- Cómo se probó.
- Si toca una regla de `AGENTS.md`, cuál y por qué no había otra forma.

Abrí el pull request (`gh pr create`) solo si el usuario lo pide. Lo que aportás entra con la licencia MIT del repo.
