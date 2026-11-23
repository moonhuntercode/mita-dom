import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><body></body></html>`, { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.localStorage = dom.window.localStorage;
global.performance = { now: () => Date.now() };

const {
    MitaElement,
    crearEstadoLocal,
    crearEfecto,
    crearEstadoCompartido,
    obtenerEstadoCompartido,
    listarEstadosCompartidos,
    eliminarEstadoCompartido,
    renderCondicional,
    vincularTexto
} = await import('../src/index.js');

test('crearEfecto: auto-rastrea Signals leídos con .get() y limpia con detener()', () => {
    const precio = crearEstadoLocal(100);
    const cantidad = crearEstadoLocal(2);
    const historial = [];

    const detener = crearEfecto(() => {
        historial.push(precio.get() * cantidad.get());
    });

    assert.deepStrictEqual(historial, [200]);

    cantidad.set(3);
    assert.deepStrictEqual(historial, [200, 300]);

    precio.set(50);
    assert.deepStrictEqual(historial, [200, 300, 150]);

    // Al detener el efecto, no debe volver a ejecutarse
    detener();
    precio.set(999);
    assert.deepStrictEqual(historial, [200, 300, 150]);
});

test('Signal.derivar(): crea estado derivado de solo lectura sincronizado con el padre', () => {
    const carrito = crearEstadoLocal([10, 20, 30]);
    const total = carrito.derivar((items) => items.reduce((acc, n) => acc + n, 0));

    assert.strictEqual(total.get(), 60);

    carrito.set([15, 25]);
    assert.strictEqual(total.get(), 40);

    assert.throws(() => total.set(999), /solo lectura/);
    total.destroy();
});

test('Estados Compartidos: crearEstadoCompartido, obtenerEstadoCompartido y listarEstadosCompartidos con persistirLocal', () => {
    localStorage.clear();

    const configA = crearEstadoCompartido(
        'empleos:config_test',
        { habilitado: true, requiereLogin: false },
        {
            persistirLocal: true,
            descripcion: 'Configuración del módulo de anuncios de empleo',
            reglas: 'Solo el administrador puede desactivar el módulo'
        }
    );

    // Otro componente recupera exactamente la misma instancia por nombre
    const configB = obtenerEstadoCompartido('empleos:config_test');
    assert.strictEqual(configA, configB);

    configB.patch({ habilitado: false });
    assert.strictEqual(configA.get().habilitado, false);

    // Verificamos persistencia en localStorage
    const guardado = JSON.parse(localStorage.getItem('mita_estado_empleos:config_test'));
    assert.strictEqual(guardado.habilitado, false);

    // Verificamos auditoría para Panel Admin
    const lista = listarEstadosCompartidos();
    const entrada = lista.find((item) => item.nombre === 'empleos:config_test');
    assert.ok(entrada);
    assert.strictEqual(entrada.persistKey, 'mita_estado_empleos:config_test');
    assert.strictEqual(entrada.reglas, 'Solo el administrador puede desactivar el módulo');

    eliminarEstadoCompartido('empleos:config_test');
});

test('renderCondicional declarativo y vincularTexto: actualizan DOM granularmente y soportan cleanup', () => {
    const estadoModulo = crearEstadoLocal({ activo: true, titulo: 'Bolsa de Empleo' });
    const contenedor = document.createElement('div');
    const nodoTitulo = document.createElement('span');

    const detenerRender = renderCondicional({
        estado: estadoModulo,
        contenedor,
        cuando: (estado) => estado.activo === true,
        mostrar: (estado) => `<section class="activo">${estado.titulo}</section>`,
        sino: () => `<p class="pausado">Módulo desactivado por Admin</p>`
    });

    const detenerTexto = vincularTexto(estadoModulo, nodoTitulo, (e) => `Estado: ${e.activo ? 'ON' : 'OFF'}`);

    assert.ok(contenedor.innerHTML.includes('Bolsa de Empleo'));
    assert.strictEqual(nodoTitulo.textContent, 'Estado: ON');

    estadoModulo.patch({ activo: false });
    assert.ok(contenedor.innerHTML.includes('Módulo desactivado por Admin'));
    assert.strictEqual(nodoTitulo.textContent, 'Estado: OFF');

    detenerRender();
    detenerTexto();

    // Tras limpiar, mutaciones nuevas no deben tocar el DOM
    estadoModulo.patch({ activo: true });
    assert.ok(contenedor.innerHTML.includes('Módulo desactivado por Admin'));
});

test('MitaElement.mostrarSi y escucharEstado limpian suscripciones al desmontar el componente', () => {
    const estadoCompartido = crearEstadoLocal({ abierto: false });

    class PanelAutoLimpio extends MitaElement {
        alMontar() {
            this.innerHTML = `<div id="zona"></div>`;
            this.mostrarSi({
                estado: estadoCompartido,
                contenedor: this.querySelector('#zona'),
                cuando: (e) => e.abierto,
                mostrar: () => `<span>Abierto</span>`,
                sino: () => `<span>Cerrado</span>`
            });
        }
    }
    customElements.define('panel-auto-limpio', PanelAutoLimpio);

    const el = document.createElement('panel-auto-limpio');
    document.body.appendChild(el);

    assert.strictEqual(estadoCompartido.suscriptores.size, 1);
    assert.ok(el.querySelector('#zona').innerHTML.includes('Cerrado'));

    estadoCompartido.patch({ abierto: true });
    assert.ok(el.querySelector('#zona').innerHTML.includes('Abierto'));

    // Al remover del DOM, disconnectedCallback debe liberar la suscripción
    document.body.removeChild(el);
    assert.strictEqual(estadoCompartido.suscriptores.size, 0);
});
