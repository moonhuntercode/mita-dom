# Estrategia de Testing QA para MitaDOM (Librería)

Para asegurar que **mita-dom** sea una librería de clase mundial, robusta y libre de bugs (especialmente considerando que manipula el DOM y maneja estado reactivo), el esquema actual basado en Vitest + JSDOM es un excelente primer paso, pero **no es suficiente**.

Aquí está la evaluación de lo que tenemos y lo que **falta** para garantizar 100% de confiabilidad.

## 1. Lo que ya tenemos (Y está bien)
- **Unit Testing rápido**: Usamos Vitest con JSDOM para probar lógica pura (Signals, Derivados, Router Mock).
- **Cobertura de Arquitectura**: Hay tests verificando que no se inyecte Shadow DOM y que el `innerHTML` reaccione.

## 2. Lo que FALTA (Brechas Críticas)

### A. End-to-End (E2E) en Navegadores Reales (Playwright)
**Por qué falta:** JSDOM es un simulador de DOM escrito en JavaScript. JSDOM **no pinta píxeles**, **no tiene motor de render (layout engine)**, y muchas veces los eventos de teclado/ratón o el recolector de basura (garbage collector) actúan diferente que en Chrome/Safari.
**Acción Requerida:** Implementar Playwright para probar los Web Components nativos en navegadores reales (Chromium, WebKit, Firefox).
*Ejemplo:* Renderizar un `<mita-component>`, disparar eventos click, y comprobar que el DOM se actualiza visualmente sin errores de consola reales.

### B. Pruebas de Rendimiento y Fugas de Memoria (Memory Leaks)
**Por qué falta:** El mayor problema de crear una librería de DOM/Reactividad (Signals) es dejar escuchadores de eventos (`event listeners`) colgados cuando un componente se destruye (`alDesmontar`), causando fugas de memoria.
**Acción Requerida:** Usar `vitest bench` o herramientas como `tachometer` para medir FPS (Frames per Second) al re-renderizar 10,000 elementos, y verificar que la memoria no suba tras destruir componentes.

### C. Pruebas de Tipado (TS-Expect-Error)
**Por qué falta:** Aunque se use JSDoc, los usuarios consumirán la API en TypeScript.
**Acción Requerida:** Añadir `tsc --noEmit` en el CI, y crear tests `.test-d.ts` o usar `@vitest/typecheck` para asegurar que enviar tipos incorrectos a un `signal()` lanza error de compilación.

---

## 3. Guía de Ejecución (Comandos)

Actualmente la librería soporta los siguientes comandos de calidad:

```bash
# 1. Compilar y minificar con Esbuild (ultra-rápido)
npm run build

# 2. Ejecutar Linters de JS (Reglas de Elite QA)
npm run lint

# 3. Ejecutar Linters de CSS (Stylelint para estilos inyectados)
npm run lint:css

# 4. Tests Unitarios y Componentes (JSDOM)
npm run test

# 5. Pipeline QA Completo Recomendado antes de cada Commit:
npm run lint && npm run test && npm run build
```

## 4. Próximos Pasos (Roadmap de QA)
1. Instalar `@playwright/test` en el repositorio.
2. Crear la carpeta `test/e2e/`.
3. Montar una aplicación de prueba real en Vite (interna) que Playwright pueda navegar y clickear para verificar mutaciones del DOM.
