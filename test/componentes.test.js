import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

// 1. Configurar JSDOM globalmente antes de importar los módulos de MitaDOM
const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: "http://localhost" });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;

// 2. Importar de forma dinámica después de inyectar el DOM
const { definirComponente, MitaElement } = await import('../src/index.js');
const { crearEstadoLocal } = await import('../src/core/signals.js');

test('API POO: MitaElement nativo se monta y renderiza correctamente', (t) => {
    class MiBotonPoo extends MitaElement {
        alMontar() {
            this.innerHTML = '<button>POO</button>';
        }
    }
    customElements.define('mi-boton-poo', MiBotonPoo);

    const el = document.createElement('mi-boton-poo');
    document.body.appendChild(el);

    assert.strictEqual(el.innerHTML, '<button>POO</button>');
});

test('Options API: definirComponente maneja ciclo de vida y estado reactivo falso', (t) => {
    definirComponente('mi-boton-options', {
        estado: { count: 0 },
        alMontar() {
            this.estado.count++; // Mutamos el estado al montar
        },
        render(estado) {
            return `<button>${estado.count}</button>`;
        }
    });

    const el = document.createElement('mi-boton-options');
    document.body.appendChild(el);

    // En el primer render, el estado era 0. alMontar se ejecuta DESPUÉS del render.
    assert.strictEqual(el.innerHTML, '<button>0</button>');
    assert.strictEqual(el.estado.count, 1); // Pero el estado ya mutó a 1 en memoria
});

test('Composition API: definirComponente maneja signals puros correctamente', (t) => {
    definirComponente('mi-boton-composition', (_elemento) => {
        const contador = crearEstadoLocal(5);
        return () => `<button>${contador.get()}</button>`;
    });

    const el = document.createElement('mi-boton-composition');
    document.body.appendChild(el);

    assert.strictEqual(el.innerHTML, '<button>5</button>');
});

test('Error Boundary: MitaElement atrapa errores en render y muestra UI de fallback', (t) => {
    class BotonRoto extends MitaElement {
        render() {
            throw new Error("Simulated Crash");
        }
    }
    customElements.define('mi-boton-roto', BotonRoto);

    const el = document.createElement('mi-boton-roto');
    
    // Suprimimos temporalmente el console.error para no ensuciar el log del test
    const originalError = console.error;
    console.error = () => {};
    
    document.body.appendChild(el); // dispara el render
    
    console.error = originalError;

    // Comprobamos que el error fue atrapado y se inyectó el HTML del Error Boundary
    assert.ok(el.innerHTML.includes('Algo salió mal dibujando este componente'));
    assert.ok(el.innerHTML.includes('Simulated Crash'));
});

test('Async Render: MitaElement maneja renders asíncronos sin crashear', async (t) => {
    class BotonAsync extends MitaElement {
        async render() {
            // Simulamos una tarea asíncrona
            await new Promise(r => setTimeout(r, 10));
            this.innerHTML = '<button>Async</button>';
        }
    }
    customElements.define('mi-boton-async', BotonAsync);

    const el = document.createElement('mi-boton-async');
    document.body.appendChild(el);
    
    // Esperamos a que la promesa se resuelva
    await new Promise(r => setTimeout(r, 20));
    
    assert.strictEqual(el.innerHTML, '<button>Async</button>');
});
