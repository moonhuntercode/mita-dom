// @ts-check

/**
 * Motor Reactivo Granular (Signals)
 * Implementado usando Clases y un `Set` para prevenir suscripciones duplicadas.
 */
export class Signal {
    /**
     * @param {any} valorInicial 
     */
    constructor(valorInicial) {
        this._valor = valorInicial;
        /** 
         * Usamos Set para evitar que el mismo componente registre 
         * el mismo callback múltiples veces accidentalmente.
         * @type {Set<Function>} 
         */
        this.suscriptores = new Set();
    }

    get value() {
        return this._valor;
    }

    set value(nuevoValor) {
        if (this._valor !== nuevoValor) {
            this._valor = nuevoValor;
            this.notificar();
        }
    }

    /**
     * Suscribe una función para reaccionar a los cambios.
     * @param {Function} callback 
     */
    suscribir(callback) {
        this.suscriptores.add(callback);
        // Ejecución inmediata inicial para sincronizar el DOM con el estado
        callback(this._valor);
    }

    /**
     * Elimina una suscripción.
     * @param {Function} callback 
     */
    desuscribir(callback) {
        this.suscriptores.delete(callback);
    }

    notificar() {
        // Iteramos el Set de forma segura
        for (const callback of this.suscriptores) {
            callback(this._valor);
        }
    }
}

// Exportamos un estado global de ejemplo para las demostraciones de componentes
export const estadoAppGlobal = new Signal(0);
