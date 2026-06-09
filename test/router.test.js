import test from 'node:test';
import assert from 'node:assert';

// 1. Inyectar el Mock en el entorno global ANTES de importar el módulo
// @ts-ignore
global.window = {
    location: { href: 'http://localhost/', origin: 'http://localhost' },
    navigation: {
        currentEntry: { url: 'http://localhost/' },
        listeners: {},
        addEventListener(event, callback) {
            this.listeners[event] = callback;
        },
        // Utilidad interna del Mock para forzar la navegación en el test
        _simularNavegacion(url) {
            if (this.listeners['navigate']) {
                const event = {
                    destination: { url },
                    intercept: ({ handler }) => handler()
                };
                this.listeners['navigate'](event);
            }
        }
    }
};

// Importación dinámica para asegurar que el mock de window esté listo
const { rutaActual } = await import('../src/core/router.js');

test('El router inicializa con la ruta por defecto usando el Mock', (t) => {
    assert.strictEqual(rutaActual.value, '/');
});

test('El router actualiza el Signal granularmente al interceptar la navegación', (t) => {
    let rutaCapturada = '';
    
    rutaActual.suscribir(ruta => {
        rutaCapturada = ruta;
    });

    // Simulamos un cambio de ruta SPA (Navigation API nativa)
    // @ts-ignore
    global.window.navigation._simularNavegacion('http://localhost/nueva-ruta-mock');

    assert.strictEqual(rutaActual.value, '/nueva-ruta-mock');
    assert.strictEqual(rutaCapturada, '/nueva-ruta-mock');
});
