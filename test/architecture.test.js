import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: "http://localhost" });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.performance = { now: () => Date.now() };

const { MitaElement } = await import('../src/index.js');
const { crearEstadoLocal } = await import('../src/core/signals.js');

test('Arquitectura Light DOM: Debe rechazar la creación de Shadow DOM (Tríada Perfecta)', (t) => {
    class ShadowBoton extends MitaElement {
        alMontar() {
            // Un dev rebelde intenta usar Shadow DOM
            this.attachShadow({ mode: 'open' });
        }
    }
    customElements.define('shadow-boton', ShadowBoton);

    const el = document.createElement('shadow-boton');
    
    // Suprimimos console.error temporalmente para el test
    const originalError = console.error;
    console.error = () => {};
    
    assert.throws(
        () => {
            el.attachShadow({ mode: 'open' }); // Probamos directamente el método
        },
        /MitaDOM prohíbe el Shadow DOM/
    );

    console.error = originalError;
});

test('Arquitectura Granular DOM: Mutaciones vía Signals no deben repintar el HTML completo', (t) => {
    class ContadorGranular extends MitaElement {
        alMontar() {
            this.innerHTML = `<div><span id="valor">0</span></div>`;
            this.contador = crearEstadoLocal(0);
            
            // Suscripción granular (Solo muta el TextNode, no el HTML)
            this.contador.suscribir((val) => {
                this.querySelector('#valor').textContent = val;
            });
        }
    }
    customElements.define('contador-granular', ContadorGranular);

    const el = document.createElement('contador-granular');
    document.body.appendChild(el);

    // Capturamos la referencia del nodo original
    const nodoSpan = el.querySelector('#valor');
    
    // Mutamos el signal (debería disparar la suscripción, NO un re-render global)
    el.contador.set(5);

    assert.strictEqual(el.querySelector('#valor').textContent, '5');
    
    // El nodo exacto en memoria debe ser EL MISMO, demostrando Granular DOM en lugar de Virtual DOM / Re-Render
    assert.strictEqual(el.querySelector('#valor'), nodoSpan);
});
