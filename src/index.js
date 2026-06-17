// @ts-check
/**
 * mita-dom - Librería Principal
 */

// 1. Motor Lógico (Signals, Router, Resources, Components)
export { Signal, SignalDerivado, crearEstadoGlobal, crearEstadoLocal } from './core/signals.js';
export { rutaActual, navegarA } from './core/router.js';
export { crearRecurso } from './core/resource.js';
export { MitaElement } from './core/mitaElement.js';
export { definirComponente } from './core/componentes.js';

// 2. Utilidades de Seguridad
export { sanitizarTexto } from './seguridad.js';

// 3. Plugins y DX
export { mitaHmrPlugin } from './plugins/vite.js';

// 4. Utilidades de DX y Telemetría
export { checkMitaDomVersion } from './core/versionCheck.js';

// Ejecutar silenciosamente la verificación al iniciar el DOM
import { checkMitaDomVersion } from './core/versionCheck.js';
if (typeof window !== 'undefined') {
  // Retrasamos unos segundos para no afectar el LCP (Time to Interactive)
  setTimeout(() => checkMitaDomVersion(), 3000);
}
