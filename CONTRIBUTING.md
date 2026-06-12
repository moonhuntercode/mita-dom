# 🛠️ Guía de Mantenimiento y Contribución (mita-dom)

¡Bienvenido al ciclo de vida de mita-dom! Esta guía está diseñada para los mantenedores del proyecto y cualquier desarrollador de la comunidad que desee aportar mejoras a la librería o publicar nuevas versiones oficiales en NPM.

---

## 🔄 El Ciclo de Vida de una Actualización (Publishing)

Para publicar una mejora en el código y distribuirla globalmente a todos los usuarios de NPM, debes seguir estrictamente este ciclo de 4 pasos:

### 1. Desarrollar la Mejora

Todo el código fuente y la magia de mita-dom vive en la carpeta `src/`.

- Si creas un nuevo componente, asegúrate de mantener nuestro enfoque *Mobile First*, usar *Light DOM* y aplicar etiquetas de *HTML Semántico*.
- Mantén la filosofía nativa: sin dependencias de terceros, basándote puramente en APIs del navegador.

### 2. Aumentar la Versión (Semantic Versioning)

NPM **jamás permite sobrescribir** versiones publicadas en el pasado. El tiempo solo va hacia adelante. Para lanzar tu código, debes abrir el archivo `package.json` y subir el número de `"version"` siguiendo la regla estándar *SemVer*:

- **Parche (ej. `1.0.1`):** Súbelo cuando arreglas un error menor o *bug* invisible.
- **Menor (ej. `1.1.0`):** Súbelo cuando añades funcionalidades nuevas (ej. un nuevo `<mita-carrusel>`) pero el resto del código viejo sigue funcionando perfectamente.
- **Mayor (ej. `2.0.0`):** Súbelo cuando cambias la arquitectura y vas a romper el código de las personas que usen las versiones anteriores.

### 3. Empaquetar el Código (El "Build")

NPM no ejecuta tus archivos fuente directamente; distribuye el código ultra-optimizado que vive en la carpeta `dist/`. Cada vez que cambies el código, **debes compilarlo** antes de subirlo:

```bash
# Compila y ofusca el código en dist/mita-dom.js
npm run build

# Valida que tus cambios no hayan roto la librería
node --test
```

### 4. Lanzar a la Nube (Publish)

Una vez el empaquetado esté seguro en `dist/` y los tests estén en verde, lanza el comando final en tu consola para enviar el paquete comprimido a los servidores mundiales de NPM:

```bash
npm publish
```

*(Si usas llaves Passkey o 2FA, recuerda generar tu Granular Access Token y autenticarte previamente).*

¡Felicidades! Al instante, desarrolladores de todo el mundo podrán descargar tus mejoras simplemente ejecutando `npm update mita-dom` en sus terminales.
