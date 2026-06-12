// @ts-check
/**
 * mita-dom - Librería Principal
 */

// 1. Motor Lógico (Signals, Router, Resources)
export { Signal } from './core/signals.js';
export { rutaActual, navegarA } from './core/router.js';
export { crearRecurso } from './core/resource.js';

// 2. Utilidades de Seguridad
export { sanitizarTexto } from './seguridad.js';

// 3. Plugins y DX
export { mitaHmrPlugin } from './plugins/vite.js';

// Componentes movidos a proyectos de ejemplo
