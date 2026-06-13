// @ts-check
import { Signal } from './signals.js';

/**
 * Motor de Enrutamiento moderno basado en `window.navigation`
 * Al ser modular, el cliente decide si importarlo o no.
 */

// Signal global que contiene la ruta actual de la aplicación
export const rutaActual = new Signal('/');

// Si estamos en un entorno de navegador (no Node.js durante los tests)
if (typeof window !== 'undefined' && window.navigation) {
    // Inicializamos el Signal con la ruta actual al cargar la página
    rutaActual.set(new URL(window.navigation.currentEntry?.url || window.location.href).pathname);

    // Escuchamos el evento nativo 'navigate' de la Navigation API
    window.navigation.addEventListener('navigate', (event) => {
        // Obtenemos la ruta destino
        const urlDestino = new URL(event.destination.url);

        // Si es una navegación hacia el mismo dominio (SPA)
        if (urlDestino.origin === window.location.origin) {
            // Prevenimos la recarga completa del navegador
            event.intercept({
                handler() {
                    // Actualizamos el Signal. Todos los componentes suscritos reaccionarán.
                    rutaActual.set(urlDestino.pathname);
                }
            });
        }
    });
} else if (typeof window !== 'undefined') {
    // Si estamos en un entorno de test (JSDOM), no mostramos el warning para no ensuciar la consola
    const isTestEnv = window.navigator && window.navigator.userAgent && window.navigator.userAgent.includes('jsdom');
    if (!isTestEnv) {
        console.warn('mita-dom: Tu navegador no soporta la Navigation API. El enrutamiento SPA no está disponible.');
    }
}

/**
 * Función helper para navegar programáticamente
 * @param {string} ruta 
 */
export function navegarA(ruta) {
    if (typeof window !== 'undefined' && window.navigation) {
        window.navigation.navigate(ruta);
    }
}
