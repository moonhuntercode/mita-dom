# MitaDOM v2.7.0 🚀

MitaDOM es una librería hiper-ligera, sin dependencias de runtime, para crear **Web Components Nativos** usando JavaScript puro (Vanilla JS) con reactividad granular por Signals, protección de memoria estilo Rust (`rustGuard`), estrategias universales (`CSR`/`SSR`/`SSG`/`Hybrid`), `@defer`, `Signal Forms` y CLI (`npx mita`).

- 📚 **Documentación Oficial y 15 Laboratorios Interactivos:** [docs-mita-dom.vercel.app](https://docs-mita-dom.vercel.app/)
- 🛠️ **Guía de Contribución, SemVer y Release:** [CONTRIBUTING.md](./CONTRIBUTING.md)
- 📝 **Changelog v2.7.0 (Antes vs Después):** [changelogs/2026-11-22-v2.7.0.md](./changelogs/2026-11-22-v2.7.0.md)

```bash
npm install mita-dom
npx mita doctor
```

## 🌟 Filosofía y Arquitectura (La Tríada)
En MitaDOM **prohibimos el uso de Shadow DOM**. Esto asegura que tus componentes sigan siendo accesibles, indexables por SEO, y fáciles de estilar globalmente. 
En su lugar, promovemos el uso de **CSS `@scope`** (CSS3 Moderno) junto con **Light DOM**.

### Ventajas:
1. **Rendimiento Extremo**: Cero Virtual DOM.
2. **Error Boundaries Nativos**: Al estilo Rust/Go (`mitaResult`), los errores de renderizado no rompen la página, muestran un hermoso fallback con detalles técnicos.
3. **Props Automáticas**: Lee atributos de HTML (como `show-quick-options`) directamente en JS como `this.props.showQuickOptions`.
4. **Emisor de Eventos**: Usa `this.emit('mi-evento', data)` en lugar del largo `new CustomEvent()`.

---

## 📦 Guía de Buenas Prácticas y Reusabilidad

### 1. La Tríada Modular (HTML, CSS, JS)
Para que un componente sea **altamente re-usable**, nunca mezcles el HTML y el CSS dentro del JS. Usa Vite y la importación `?raw` para mantener la separación:

```js
// mi-componente.js
import { MitaElement, crearEstadoLocal } from 'mita-dom';
import templateHtml from './mi-componente.html?raw';
import './mi-componente.css';

export class MiComponente extends MitaElement {
  alMontar() {
    this.estado = crearEstadoLocal(0);
    this.render();
  }

  render() {
    this.innerHTML = templateHtml;
    
    // Leer Props dinámicamente
    if (this.props.color) {
      this.querySelector('.titulo').style.color = this.props.color;
    }
  }
}
customElements.define('mi-componente', MiComponente);
```

### 2. Ciclo de Vida Estandarizado
MitaDOM te permite usar los ciclos de vida en tu idioma:
* `alMontar()`: Se ejecuta al entrar al DOM (equivalente a `connectedCallback`).
* `alDesmontar()`: Se ejecuta al salir del DOM (equivalente a `disconnectedCallback`).
* `render()`: Tu función principal, protegida automáticamente por un Error Boundary de MitaDOM.

### 3. Evitando el Anti-Patrón (DX Linter)
Si intentas hacer `this.innerHTML` muchas veces por segundo (ej: en una animación o dentro del `suscribir` de un estado), MitaDOM detectará el abuso y lanzará un **Warning**.
**Solución Granular:**
```js
// ❌ Malo (MitaDOM avisará)
this.estado.suscribir(() => {
  this.innerHTML = `<p>${this.estado.get()}</p>`;
});

// ✅ Bueno (Rendimiento Nativo)
const parrafo = this.querySelector('p');
this.estado.suscribir((val) => {
  parrafo.textContent = val;
});
```

---

## 🧪 Estrategias de Testing (Vitest)
Para testear Web Components en Node, usamos `jsdom`.

1. **Configurar Vitest (`vitest.config.js`)**:
   Evita usar threads antiguos. Mantenlo simple:
   ```js
   export default defineConfig({
     test: { environment: 'jsdom' }
   });
   ```

2. **Escribir el Test**:
   ```js
   import { test, expect } from 'vitest';
   import './mi-componente.js'; // Importa el archivo que registra el customElement

   test('Mi Componente renderiza correctamente', () => {
     // 1. Montar en el JSDOM
     const el = document.createElement('mi-componente');
     document.body.appendChild(el);
     
     // 2. Afirmar (Assert)
     expect(el.querySelector('.titulo')).not.toBeNull();
   });
   ```

---

## 💡 Ejemplos Prácticos
Revisa la carpeta `optica-01/src/components` para ver ejemplos en producción del uso de `MitaElement`, como el `FriendlyDatePicker` que integra eventos (`this.emit`), lectura de `this.props` y reactividad condicional del DOM.
