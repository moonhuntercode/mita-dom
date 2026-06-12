# Planificación: Lanzamiento mita-dom v1.0.0 (NPM)

Este documento registra los ajustes estructurales realizados para preparar a mita-dom para su distribución global mediante NPM.

## 1. Empaquetado Predictivo (Vite)

Para distribuir una librería, los consumidores confían en que las rutas de los archivos sean estables. Hemos modificado la configuración de Rollup en Vite para deshabilitar los hashes dinámicos (ej: `lib-mita-a8b9c.js` -> `mita-dom.js`). Esto asegura que los *import statements* de los usuarios jamás se rompan.

## 2. Metadatos de Publicación (package.json)

- Se eliminó la etiqueta `"private": true` para hacer el repositorio de código abierto.
- Se introdujeron los campos `"exports"` y `"files"`, optimizando el peso de descarga del paquete al subir únicamente el código empaquetado en `/dist` y el código fuente en `/src`, excluyendo pruebas y carpetas temporales.

## 3. Pruebas Aisladas (Mocks)

Se implementaron simuladores o dobles de prueba ("Mocks") para validar piezas de código atadas a APIs exclusivas del navegador:

- **Mock de `window.navigation`**: Para simular rutas en nuestro router sin abrir un navegador real.
- **Mock de `Element.setHTML()`**: Para verificar la sanitización nativa de XSS.

Con esta planificación aseguramos que el empaquetado final es seguro, modular e infalible.
