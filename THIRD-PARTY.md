# Lo de terceros

No hay código de terceros copiado adentro de las piezas. Lo que usan se instala con `npm ci` y mantiene su licencia.

## Paquetes

| Paquete | Licencia | Quién lo usa |
|---|---|---|
| fflate | MIT | `facultad/` para leer las planillas de horarios |
| pdfjs-dist | Apache-2.0 | `facultad/` para leer los PDF de la facultad |
| three | MIT | `facu-3d/` para dibujar la entrada (en el kit, solo para las pruebas) |
| vitest | MIT | las pruebas |
| jsdom | MIT | las pruebas que necesitan una página |

## Lo que no entra en la licencia MIT

- El emblema de la UTN de `universo/carga-utn` y de `facu-3d` es de la Universidad Tecnológica Nacional.
- Las páginas de `sysacad/paginas-de-prueba` son copias de páginas de la UTN con datos inventados.
- Los horarios y el calendario de `facultad/datos` salen de lo que publica la facultad. El kit los ordena en JSON.

## Métodos de la bibliografía

Son fórmulas y métodos conocidos, escritos de nuevo.

- `calculadoras/distribuciones.js` usa la aproximación de Lanczos para ln Γ y la de Hart para Φ(x).
- `calculadoras/numerico.js` sigue los métodos del libro de Chapra (Métodos Numéricos para Ingenieros).
- Algunas pruebas usan los números de ejercicios de los apuntes de El Santo Resumen y de figuras de libros de cátedra,
  como la figura 6-7 de Sistemas Operativos. Son números, no texto de los libros.
