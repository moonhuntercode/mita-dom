# ⚡ Ecosistema y Configuración (Vite + MitaDOM)

MitaDOM está diseñado para integrarse perfectamente con **Vite**, el bundler más rápido del ecosistema moderno. Aquí explicamos cómo dominar las herramientas que acompañan al framework.

## 1. Hot Module Replacement (HMR) Quirúrgico
Cuando desarrollas una SPA, no quieres perder el estado de tu aplicación (ej. lo que escribiste en un formulario) cada vez que guardas un archivo CSS o JS.

### El Mita Vite Plugin
El *core* de nuestra librería provee `mitaHmrPlugin()`. Cuando lo inyectas en tu `vite.config.js`, este plugin optimiza la comunicación por WebSockets entre el navegador y Vite:
- **Cambios en `.css`**: Se inyectan en 0ms sin recargar la página.
- **Cambios en `.js`**: Vite intercepta los módulos actualizados y los re-inyecta, manteniendo el estado global intacto.
- **Cambios en `.html`**: MitaDOM garantiza un `full-reload` instantáneo para refrescar las plantillas de los Web Components que fueron cargadas mediante `?raw`.

```javascript
import { defineConfig } from 'vite';
import { mitaHmrPlugin } from 'mita-dom';

export default defineConfig({
  plugins: [
    mitaHmrPlugin()
  ]
});
```

## 2. Soporte a Navegadores Antiguos (Polyfills)
Aunque usamos APIs modernas como `window.navigation` y `CustomElements`, queremos que MitaDOM funcione en SmartTVs, pantallas industriales y entornos corporativos.
Para lograrlo, recomendamos usar `@vitejs/plugin-legacy`:

```javascript
import legacy from '@vitejs/plugin-legacy';

export default defineConfig({
  plugins: [
    mitaHmrPlugin(),
    legacy({
      targets: ['defaults', 'not IE 11'], 
      polyfills: ['es.promise.finally', 'es/map', 'es/set']
    })
  ]
});
```
Esto le dice a Vite que, en la fase de `build` (Producción), debe crear dos versiones de tu SPA:
1. Una ultra-rápida (ESModules) para Chrome, Edge, Safari modernos.
2. Una versión segura con *Polyfills* (código inyectado de `core-js`) para navegadores viejos.

## 3. Configuración para Single Page Applications (SPA)
El problema típico de las SPAs es el famoso "Error 404 al recargar". Si el usuario navega a `tu-dominio.com/perfil` y presiona F5, el servidor web buscará físicamente la carpeta `/perfil/index.html` y fallará.

Para desarrollo local, Vite soluciona esto con `historyApiFallback`:

```javascript
export default defineConfig({
  server: {
    historyApiFallback: true, // Redirige todo el tráfico a index.html
  }
});
```

> [!IMPORTANT]
> **En Producción**: Cuando subas tu app a Vercel, Netlify o Nginx, debes configurar las reglas de reescritura (*Rewrites*) para que cualquier URL apunte siempre a `/index.html`. El router nativo de MitaDOM se encargará del resto una vez que el HTML haya cargado.
