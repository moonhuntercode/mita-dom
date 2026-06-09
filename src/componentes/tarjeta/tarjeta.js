// @ts-check
import { Signal, estadoAppGlobal } from '../../core/signals.js';

// Usamos vite ?raw import para que el HTML y CSS sean minificados en producción y tratados como strings.
import templateHTML from './tarjeta.html?raw';
import templateCSS from './tarjeta.css?raw';

export class MitaTarjeta extends HTMLElement {
    constructor() {
        super();
        // Estado Local: Nace y muere con esta instancia del componente
        this.estadoLocal = new Signal(0);
    }

    connectedCallback() {
        // 1. Inyección de vistas en Light DOM
        this.innerHTML = `
            <style>${templateCSS}</style>
            ${templateHTML}
        `;

        // 2. Control granular: capturamos referencias una sola vez
        this.$valorGlobal = this.querySelector('#valor-global');
        this.$valorLocal = this.querySelector('#valor-local');
        this.$btnLocal = this.querySelector('#btn-local');
        this.$btnGlobal = this.querySelector('#btn-global');

        // Guardamos la referencia de la función para poder desuscribirnos luego
        this._callbackGlobal = (/** @type {any} */ valor) => {
            if (this.$valorGlobal) this.$valorGlobal.textContent = valor.toString();
        };

        // 3. Suscripciones a los Signals
        estadoAppGlobal.suscribir(this._callbackGlobal);

        this.estadoLocal.suscribir((/** @type {any} */ valor) => {
            if (this.$valorLocal) this.$valorLocal.textContent = valor.toString();
        });

        // 4. Interacciones
        this.$btnLocal?.addEventListener('click', () => {
            this.estadoLocal.value += 1;
        });

        this.$btnGlobal?.addEventListener('click', () => {
            estadoAppGlobal.value += 1;
        });
    }

    // Keyword: disconnectedCallback
    // Justificación: Ciclo de vida nativo de Web Components. Se ejecuta cuando el nodo es eliminado del DOM. 
    // Es crítico para prevenir fugas de memoria (Memory Leaks).
    disconnectedCallback() {
        if (this._callbackGlobal) {
            estadoAppGlobal.desuscribir(this._callbackGlobal);
        }
        // Nota: No es estrictamente necesario desuscribir estadoLocal porque el 
        // estadoLocal es una propiedad de 'this' y será destruido por el Garbage Collector
        // junto con todo el componente cuando no queden referencias.
    }
}

// Registrar en el catálogo del navegador
if (!customElements.get('mita-tarjeta')) {
    customElements.define('mita-tarjeta', MitaTarjeta);
}
