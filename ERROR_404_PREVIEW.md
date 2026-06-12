# Análisis de Error: HTTP 404 en `npm run preview`

## 🚨 El Problema (Síntomas)
Al ejecutar el comando `npm run preview`, la consola levanta el servidor correctamente en `http://localhost:4173/`, pero el navegador muestra una pantalla en blanco con el error:
> `GET http://localhost:4173/ net::ERR_HTTP_RESPONSE_CODE_FAILURE 404 (Not Found)`

## 🔍 La Causa (El "Por qué")
Este no es un error de tu código, sino un comportamiento completamente esperado basado en cómo configuraste la arquitectura de MitaDOM.

Vite tiene dos formas de compilar (`build`):
1. **Modo App (SPA):** Compila el código, inyecta los scripts en un `index.html` y copia todo a la carpeta `dist/`.
2. **Modo Librería (`build.lib`):** Lo que nosotros usamos. Vite ignora por completo el `index.html` y solo empaqueta el JavaScript en `dist/mita-dom.js` para que pueda ser subido a NPM.

**¿Qué hace `vite preview`?**
El comando `preview` está diseñado para servir los archivos estáticos de la carpeta `dist/`. Como Vite compiló MitaDOM en Modo Librería, **no existe ningún `index.html` en la carpeta `dist/`**. Al entrar al localhost, el servidor de Vite no encuentra un archivo HTML para mostrar, devolviendo el famoso `404 Not Found`.

## 🛠️ La Solución

Dado que MitaDOM es una librería y no una página web estática, el comando `npm run preview` (tal como viene en Vite por defecto) **no debe usarse en este repositorio**.

### ¿Cómo probar entonces la librería?

1. **Para desarrollar y ver el Playground (index.html de la raíz):**
   Utiliza siempre:
   ```bash
   npm run dev
   ```
   Esto levanta el servidor de desarrollo, que sí sirve el `index.html` raíz y compila los archivos al vuelo.

2. **Para probar la versión "Production" compilada (el `dist/`):**
   Usa la carpeta de demostración que creamos (`examples/demo-ts`). Esa carpeta sí está configurada como una "Aplicación" (Modo SPA) y consume tu versión local compilada.
   ```bash
   cd examples/demo-ts
   npm run build
   npm run preview
   ```
   *Ahí sí funcionará el preview perfectamente, porque `demo-ts` es una aplicación cliente, no una librería.*

### Conclusión
Si lo deseas, puedes eliminar el script `"preview": "vite preview"` de tu `package.json` principal para evitar confusiones a futuros contribuidores, ya que una librería de NPM no se "previsualiza" de esta forma, se instala en otro proyecto.
