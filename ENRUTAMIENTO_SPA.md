# 🧭 Enrutamiento SPA Avanzado

MitaDOM implementa su enrutador basándose en la **Navigation API** moderna, en lugar de utilizar el clásico (y obsoleto) hack de la `History API` (`history.pushState` + `popstate`). 

## 1. Navigation API vs History API

### El Problema de History API
Tradicionalmente, los frameworks hacían *monkey-patching* (sobrescribir métodos nativos) sobre `history.pushState` para detectar cuándo un usuario cambiaba de ruta en una SPA. Además, requerían escuchar el evento `popstate` para detectar si el usuario usaba los botones "Atrás/Adelante" del navegador. Esto generaba bugs, desincronizaciones de estado, y una arquitectura frágil.

### La Solución: Navigation API
La [Navigation API](https://developer.mozilla.org/en-US/docs/Web/API/Navigation_API) de HTML5 introduce un evento unificado: el evento `navigate`. Este evento se dispara **siempre**, no importa si el cambio fue por un click en un `<a>`, si el usuario usó `history.back()`, o si una función JS ejecutó `window.location.href = '/ruta'`.

**Beneficios en MitaDOM:**
1. **Interceptación Nativa**: `event.intercept()` pausa la recarga normal de la página.
2. **Cero Dependencias**: No dependemos de librerías como `react-router-dom` o `vue-router`.
3. **Control Absoluto**: Podemos despachar promesas (`handler()`) para hacer transiciones, pre-cargar datos (Fetch) o verificar autenticación (Guards) *antes* de que la URL cambie realmente.

---

## 2. Definición de Rutas y Split UI

En MitaDOM, el enrutador no es un componente inmenso que envuelve toda tu aplicación (ej. `<Router><App/></Router>`). MitaDOM expone simplemente un **Signal Global (`rutaActual`)** y tú decides cómo reaccionar a él usando JavaScript puro.

### Ejemplo de Rutas Básicas (Tu archivo `router.js`):
```javascript
import { rutaActual } from 'mita-dom';

const $inicio = document.querySelector('vista-inicio');
const $perfil = document.querySelector('demo-perfil');
const $error404 = document.querySelector('demo-404');

const rutasPermitidas = ['/', '/perfil'];

rutaActual.suscribir(ruta => {
  // Split Routing: Ocultar o Mostrar Web Components
  $inicio.style.display = (ruta === '/') ? 'block' : 'none';
  $perfil.style.display = (ruta === '/perfil') ? 'block' : 'none';

  // Catch-All (Error 404)
  if (!rutasPermitidas.includes(ruta)) {
    $error404.style.display = 'block'; // Mostramos el 404
  } else {
    $error404.style.display = 'none';
  }
});
```

---

## 3. Rutas Avanzadas y Dinámicas (`/blog/:id`)

¿Qué pasa si necesitas rutas dinámicas como perfiles de usuarios (`/usuarios/123`) o entradas de un blog (`/blog/mi-post`)?

Dado que MitaDOM es Vanilla JS, la forma más limpia de manejar esto es usando Regex o la API nativa `URLPattern` de JavaScript.

```javascript
import { rutaActual } from 'mita-dom';

// Inicializar la API nativa URLPattern
const blogPattern = new URLPattern({ pathname: '/blog/:id' });

rutaActual.suscribir(ruta => {
  // Comprobamos si la ruta hace match con nuestro patrón dinámico
  const match = blogPattern.exec({ pathname: ruta });
  
  if (match) {
    const idArticulo = match.pathname.groups.id;
    console.log(`Cargando artículo número: ${idArticulo}`);
    
    // Aquí puedes decirle a tu componente que haga un Fetch con ese ID
    const $blogView = document.querySelector('mi-blog-view');
    $blogView.cargarArticulo(idArticulo);
    $blogView.style.display = 'block';
  }
});
```

> [!TIP]
> **Reflexión de Arquitectura**: En React o Vue, te enseñan que las "Rutas" son componentes JSX/HTML. En MitaDOM te devolvemos la verdad: las rutas son simplemente una cadena de texto (String). Un "Enrutador" no es más que un `switch/if` que evalúa ese string y decide qué ocultar o destruir en el DOM.

---

## 4. Despliegue en Servidores Estáticos (Vercel, Netlify) y Errores 404

Un problema extremadamente común al desplegar una SPA (Single Page Application) es que la navegación interna (`/perfil`, `/docs`) funciona perfectamente cuando haces clic en los enlaces, **pero si recargas la página (F5) o entras directamente a esa URL**, el servidor te devuelve un `404: NOT_FOUND`.

### ¿Por qué sucede esto?
Porque el enrutamiento es **Client-Side** (lo maneja JavaScript en el navegador). El servidor físico (como Vercel) no tiene una carpeta llamada `perfil` ni un archivo `perfil/index.html`. Solo tiene un único archivo raíz: `/index.html`. Cuando el navegador le pide la ruta `/perfil` al servidor, el servidor falla.

### La Solución (Rewrites)
Debemos decirle al servidor: *"Oye, si un usuario pide CUALQUIER ruta, no busques carpetas. Simplemente devuélvele el `index.html` y deja que el Router de MitaDOM (JS) decida qué mostrar."*

**Para Vercel:**
Crea un archivo llamado `vercel.json` en la raíz de tu proyecto con esta configuración de rutas seguras. Esta configuración utiliza `handle: filesystem` para evitar bucles infinitos (Memory Safe) asegurando que si un archivo físico (como una imagen, CSS o el mismo index.html) existe, Vercel lo entregue directamente sin volver a reescribirlo:
```json
{
  "routes": [
    { "handle": "filesystem" },
    { "src": "/.*", "dest": "/index.html" }
  ]
}
```

**Para Netlify:**
Crea un archivo `public/_redirects` con el contenido:
```text
/*    /index.html   200
```
