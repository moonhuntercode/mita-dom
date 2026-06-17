# Changelog de MitaDOM

## [2.4.0] - 2026-06-17

### 🔥 Hito Arquitectónico: La Era de la Longevidad y el DX Estricto

El día de hoy marca un antes y un después en la filosofía y arquitectura interna de MitaDOM. Hemos pasado de ser una simple librería de componentes web a ser un **Framework Orientado a la Longevidad** que enseña y protege a los desarrolladores de cometer errores de rendimiento a largo plazo, garantizando que el código escrito hoy siga funcionando y sea mantenible en la próxima década.

#### 🏗️ 1. Paradigma Obligatorio: La Tríada de Archivos
- **Deprecación Estilística:** Se documentó y prohibió formalmente el uso de plantillas de texto para insertar grandes bloques de HTML o CSS (`this.innerHTML = \`<style>...</style>\``).
- **Implementación de la Tríada:** Se oficializó el uso del ecosistema Vite con el sufijo `?raw`. Ahora los componentes están estrictamente separados en `componente.js`, `componente.html` y `componente.css`.
- **Beneficios:** Esto desbloquea el 100% de capacidades del IDE (Syntax Highlighting), HMR (Hot Module Replacement) instantáneo sin pérdida de estado, y hace que los atributos de Accesibilidad y SEO (ej. ARIA) sean reales y auditables.

#### 🛡️ 2. El DX Linter Engine (MitaElement)
- **Telemetría Inteligente:** Sobrescribimos y blindamos internamente la propiedad `set innerHTML` y el método `_safeRender()` dentro de la clase `MitaElement`.
- **Alertas Educativas en Consola:** Si MitaDOM detecta que un componente está re-escribiendo su DOM de forma salvaje (múltiples veces en menos de 100ms), lanzará un `⚠️ [MitaDOM DX Linter]` en consola advirtiendo sobre la caída masiva de rendimiento de la CPU.
- **Retro-Compatibilidad Preservada:** El *Linter* es pasivo-agresivo. Lanza la advertencia pero NO rompe la aplicación. Los flujos de *Conditional Rendering* tradicionales (if/else que cambian vistas grandes de forma ocasional) siguen funcionando perfectamente.

#### 🧪 3. Adopción del Testing Dual
- **Estrategia Multi-Runner:** Se formalizó la filosofía de que depender de un solo corredor de pruebas es un riesgo a 10 años.
- Ahora MitaDOM y su ecosistema (`loader-1`) están configurados y documentados para pasar al 100% tanto en la API Nativa de Node (`node --test`) como en `vitest` emulando JSDOM.

#### 📚 4. Nuevos Manifiestos Filosóficos
Se crearon documentos obligatorios para entender el porqué detrás de las decisiones del framework:
- **`docs/filosofia/DECADA_ESTABLE.md`**: Explica por qué elegir Web Components Nativos y ES Modules nos blinda ante la efervescencia y muerte de meta-frameworks pesados (React, Angular).
- **`docs/aprende/ANTI_PATRONES.md`**: Un documento crudo y honesto donde documentamos nuestros propios errores (HTML en Strings, Re-renders masivos emulando Virtual DOM, Estado Espagueti) y demostramos con ejemplos cómo resolverlos usando el poder del Light DOM Granular.
- **`docs/referencia/ARQUITECTURA_OPINIONADA.md`**: Actualizado para imponer reglas estrictas de estructura de carpetas y obligar al desarrollador a ser limpio desde el día 1.

### 🐛 Bug Fixes
- **Corrección Crítica en `MitaElement`:** La implementación de la telemetría del `setter` de `innerHTML` oscureció temporalmente el `getter` nativo de `HTMLElement`, lo que rompía pruebas y lecturas del DOM (`undefined`). Se reimplementó explícitamente `get innerHTML() { return super.innerHTML; }` recuperando el 100% del test suite.
- **Resolución de ESLint:** Se corrigieron warnings en tests relacionados con argumentos inactivos (`_elemento`).
