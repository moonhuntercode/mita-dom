// @ts-check
/**
 * MitaDOM - Librería Principal
 */

// 1. Motor Lógico (Signals, Router, Resources)
export { Signal, estadoAppGlobal } from './core/signals.js';
export { rutaActual, navegarA } from './core/router.js';
export { crearRecurso } from './core/resource.js';

// 2. Utilidades de Seguridad
export { sanitizarTexto } from './seguridad.js';

// Componentes movidos a proyectos de ejemplo
