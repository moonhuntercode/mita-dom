# 🏛️ Arquitectura Avanzada de MitaDOM

Esta sección profundiza en las decisiones arquitectónicas clave de MitaDOM. Construimos un framework resiliente, enfocado en el rendimiento y la seguridad por defecto.

## 1. Routing Nativo Avanzado
MitaDOM abandona el viejo parche del `window.history.pushState` con detectores de clics globales, a favor de la moderna **Navigation API** (`window.navigation`).

### ¿Por qué `window.navigation`?
Las Single Page Applications (SPA) tradicionalmente secuestraban los eventos de los botones `<a>` para evitar la recarga. La Navigation API nativa nos ofrece:
- **Intercepción Nativa**: El navegador nos avisa de la intención de navegar *antes* de recargar.
- **Eficiencia**: Menos listeners globales colgados en el `body`.
- **Compatibilidad**: MitaDOM incluye un fallback automático para navegadores antiguos que no soportan la Navigation API, asegurando funcionamiento continuo.

## 2. Polyfills y Soporte *Legacy*
Aunque apuntamos a la modernidad (ES6, Web Components), el mundo real requiere soporte para navegadores de corporativos o SmartTVs.
- En la SPA de ejemplo usamos `@vitejs/plugin-legacy` para inyectar automáticamente los Polyfills de `core-js` (ej. soporte absoluto para Promesas, Mapas y Sets en entornos donde fallarían).
- ¿Por qué? Porque el código hermoso no sirve de nada si el cliente final ve una pantalla blanca.

## 3. Safe Memory y Prevención de Leaks
El Virtual DOM suele causar fugas de memoria (Memory Leaks) porque mantiene referencias huérfanas a nodos antiguos. 
En MitaDOM:
- Destruimos los nodos directamente.
- Al aislar la lógica en Web Components (`MitaElement`), el ciclo de vida `disconnectedCallback()` (cuando se implementa) garantiza que el Garbage Collector de JavaScript barra limpiamente la memoria del nodo.

## 4. Seguridad: DOMPurify y XSS
Nunca inyectes `innerHTML` sin protección si los datos vienen del usuario.
MitaDOM proporciona la utilidad de sanitización `sanitizarTexto(html)` impulsada por `DOMPurify` internamente (o una lógica custom).
- **Regla de oro**: Si renderizas Markdown local o código tuyo, puedes inyectarlo directo. Si renderizas comentarios de un foro, *siempre* pásalo por el sanitizador para prevenir ataques de Cross-Site Scripting (XSS).

## 5. Performance API y Telemetría
Nuestro framework viene con `MitaElement`, una envoltura alrededor de `HTMLElement`.
Cada componente MitaDOM mide automáticamente su tiempo de renderizado gracias a `performance.now()` del navegador.
- Detecta cuellos de botella al instante (Ej. renderizados > 16.6ms).
- Esta telemetría es asíncrona, no bloquea el hilo principal y puede ser reportada silenciosamente a un backend.

## 6. SEO y Accesibilidad (A11y)
Como MitaDOM inyecta el contenido en el *Light DOM* (sin Shadow DOM agresivo), todas las etiquetas HTML5 semánticas que uses son inmediatamente legibles por los rastreadores de Google (Googlebot) y por los lectores de pantalla.
Para un SEO perfecto, MitaDOM está diseñado para ser transicionado hacia **SSG (Static Site Generation)** en futuras actualizaciones, fusionando la experiencia SPA con páginas 100% pre-renderizadas.
