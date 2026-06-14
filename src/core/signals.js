// @ts-check

/**
 * 🛠️ Utilidad para congelación profunda (Immutabilidad recursiva)
 */
function deepFreeze(object) {
    if (object === null || typeof object !== 'object') return object;
    const propNames = Object.getOwnPropertyNames(object);
    for (const name of propNames) {
        const value = object[name];
        if (value && typeof value === 'object') {
            deepFreeze(value);
        }
    }
    return Object.freeze(object);
}

/**
 * Motor Reactivo Granular Avanzado (Signals con CRUD, Auth y Telemetría)
 */
export class Signal {
    /**
     * @param {any} valorInicial 
     * @param {Object} options Opciones avanzadas de la arquitectura
     * @param {boolean} [options.immutable=false] Fuerza inmutabilidad con Object.freeze
     * @param {string} [options.persistKey=null] Key para persistir
     * @param {{ getItem: (key: string) => any, setItem: (key: string, val: string) => any, removeItem: (key: string) => any }} [options.storageAdapter=localStorage] Adaptador DB
     * @param {Function} [options.guard] (newValue, oldValue) => boolean. Control de Acceso/Autorización
     * @param {Function} [options.onMutate] Hook para Telemetría y Debug
     */
    constructor(valorInicial, options = {}) {
        this.options = {
            immutable: false,
            persistKey: null,
            storageAdapter: null, // Por defecto usará localStorage si hay persistKey
            guard: null,
            onMutate: null,
            ...options
        };

        this._valorInicialOriginal = valorInicial;
        this.suscriptores = new Set();

        // 1. Persistencia (Usando Adapter)
        if (this.options.persistKey) {
            const storage = this.options.storageAdapter || (typeof localStorage !== 'undefined' ? localStorage : null);
            if (storage) {
                try {
                    const stored = storage.getItem(this.options.persistKey);
                    if (stored) {
                        // Soporta Promesas para Storage Asíncrono (IndexedDB, Firebase)
                        if (stored instanceof Promise) {
                            stored.then(val => {
                                if (val) this.set(JSON.parse(val));
                            });
                        } else {
                            valorInicial = JSON.parse(stored);
                        }
                    }
                } catch (e) {
                    console.warn(`Error leyendo persistencia [${this.options.persistKey}]:`, e);
                }
            }
        }

        // 2. Inmutabilidad Inicial
        this._valor = this._procesarInmutabilidad(valorInicial);
    }

    /**
     * Utilidad privada para garantizar inmutabilidad
     */
    _procesarInmutabilidad(val) {
        if (!this.options.immutable) return val;
        // Creamos una copia profunda y la congelamos
        const copy = structuredClone ? structuredClone(val) : JSON.parse(JSON.stringify(val));
        return deepFreeze(copy);
    }

    /**
     * @deprecated Usa .get() en su lugar para mantener estándar CRUD.
     */
    get value() {
        return this.get();
    }

    /**
     * @deprecated Usa .set(val) en su lugar para mantener estándar CRUD.
     */
    set value(nuevoValor) {
        this.set(nuevoValor);
    }

    // ==========================================
    // 🗄️ C.R.U.D. CORE API
    // ==========================================

    /**
     * READ: Obtiene el valor actual. Si es inmutable, es seguro de leer.
     */
    get() {
        return this._valor;
    }

    /**
     * UPDATE (Directo): Sobrescribe el estado con un nuevo valor.
     * @param {any} nuevoValor 
     * @returns {boolean} true si mutó, false si fue bloqueado por Auth (guard)
     */
    set(nuevoValor) {
        // 1. Autorización y Control de Acceso (Guard)
        if (this.options.guard && !this.options.guard(nuevoValor, this._valor)) {
            console.warn(`[Signal Auth] Mutación rechazada por Guard. Acción no autorizada.`);
            return false;
        }

        if (this._valor !== nuevoValor) {
            const oldValue = this._valor;
            this._valor = this._procesarInmutabilidad(nuevoValor);

            // 2. Persistencia automática vía Adapter
            if (this.options.persistKey) {
                const storage = this.options.storageAdapter || (typeof localStorage !== 'undefined' ? localStorage : null);
                if (storage) {
                    try {
                        storage.setItem(this.options.persistKey, JSON.stringify(this._valor));
                    } catch (e) {}
                }
            }

            // 3. Telemetría / Debug
            if (this.options.onMutate) {
                this.options.onMutate(this._valor, oldValue);
            }

            // 4. Reactividad
            this.notificar();
        }
        return true;
    }

    /**
     * UPDATE (Funcional): Ideal para contadores o arrays basado en estado anterior.
     * @param {(estadoAnterior: any) => any} updaterFn 
     */
    update(updaterFn) {
        // Le pasamos un clon si es inmutable, o la ref si es mutable
        const prev = this.options.immutable 
            ? (structuredClone ? structuredClone(this._valor) : JSON.parse(JSON.stringify(this._valor))) 
            : this._valor;
            
        const nextValue = updaterFn(prev);
        return this.set(nextValue);
    }

    /**
     * UPDATE (Parcial): Aplica un parche a un objeto (Merge). Mejora la DX (Developer Experience).
     * @param {Partial<any>} partialValue Objeto con propiedades a sobrescribir
     * @returns {boolean} true si mutó
     */
    patch(partialValue) {
        if (this._valor === null || typeof this._valor !== 'object' || Array.isArray(this._valor)) {
            console.warn('[Signal] .patch() solo puede usarse en estados que sean Objetos Puros.');
            return false;
        }
        return this.update(estado => ({ ...estado, ...partialValue }));
    }

    /**
     * DELETE / RESET: Devuelve el estado a su valor de nacimiento.
     */
    reset() {
        this.set(this._valorInicialOriginal);
    }

    /**
     * DESTROY: Elimina todos los oyentes de memoria para evitar memory leaks graves.
     */
    destroy() {
        this.suscriptores.clear();
        if (this.options.persistKey) {
            const storage = this.options.storageAdapter || (typeof localStorage !== 'undefined' ? localStorage : null);
            if (storage) storage.removeItem(this.options.persistKey);
        }
    }

    // ==========================================
    // 🔌 REACTIVIDAD Y EVENTOS
    // ==========================================

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

    /**
     * Notifica a todos los suscriptores.
     */
    notificar() {
        this.suscriptores.forEach(callback => callback(this._valor));
    }
}

/**
 * 🧠 SignalDerivado (Estado Derivado o Calculado)
 * Inspirado en Vue.js (computed) y SolidJS (createMemo).
 * Actúa como un caché matemático: solo recalcula su valor cuando el Signal Padre cambia.
 * Ahorra CPU evitando cálculos pesados en cada renderizado.
 */
export class SignalDerivado extends Signal {
    /**
     * @param {Signal} parentSignal El signal base que se va a escuchar
     * @param {(val: any) => any} computeFn Función pura que transforma el valor
     */
    constructor(parentSignal, computeFn) {
        if (!(parentSignal instanceof Signal)) {
            throw new Error('[SignalDerivado] El primer argumento debe ser una instancia de Signal.');
        }
        if (typeof computeFn !== 'function') {
            throw new Error('[SignalDerivado] El segundo argumento debe ser una función pura.');
        }

        // Inicializamos con el valor calculado actual
        super(computeFn(parentSignal.get()));
        
        this.parentSignal = parentSignal;
        this.computeFn = computeFn;

        // Cada vez que el padre cambia, recalculamos y notificamos a nuestros suscriptores
        this._padreSuscripcion = (nuevoValorPadre) => {
            const nuevoCalculo = this.computeFn(nuevoValorPadre);
            // Usamos super.set() para bypassear nuestro propio bloqueo de solo-lectura
            super.set(nuevoCalculo); 
        };

        this.parentSignal.suscribir(this._padreSuscripcion);
    }

    /**
     * @override
     * Bloqueamos la mutación manual. Un Signal Derivado es de "Solo Lectura" (Read-Only).
     */
    set() {
        throw new Error('[SignalDerivado] Es de solo lectura. Su valor se deriva automáticamente del padre.');
    }

    /**
     * @override
     */
    update() {
        throw new Error('[SignalDerivado] Es de solo lectura. Su valor se deriva automáticamente del padre.');
    }

    /**
     * @override
     */
    patch() {
        throw new Error('[SignalDerivado] Es de solo lectura. Su valor se deriva automáticamente del padre.');
    }

    destroy() {
        this.parentSignal.desuscribir(this._padreSuscripcion);
        super.destroy();
    }
}

// ==========================================
// 🚀 DX API (Developer Experience)
// ==========================================

/**
 * Crea un estado global.
 * Ideal para compartir datos entre múltiples componentes (ej. Sesión, Tema, Configuración).
 * Provee feedback visual en consola para facilitar el debugging.
 * 
 * @param {any} valorInicial 
 * @param {Object} [options={}] Opciones de Signal (ej. persistKey, onMutate)
 * @returns {Signal}
 */
export function crearEstadoGlobal(valorInicial, options = {}) {
    const opts = { ...options };
    const onMutateOriginal = opts.onMutate;
    
    opts.onMutate = (nuevo, viejo) => {
        console.info(`🌍 [MitaDOM] Estado Global Mutado con éxito:`, nuevo);
        if (onMutateOriginal) onMutateOriginal(nuevo, viejo);
    };
    
    return new Signal(valorInicial, opts);
}

/**
 * Crea un estado local.
 * Ideal para uso efímero dentro de un solo componente web (ej. contadores, formularios).
 * Provee feedback visual en consola para facilitar el debugging.
 * 
 * @param {any} valorInicial 
 * @param {Object} [options={}] Opciones de Signal
 * @returns {Signal}
 */
export function crearEstadoLocal(valorInicial, options = {}) {
    const opts = { ...options };
    const onMutateOriginal = opts.onMutate;
    
    opts.onMutate = (nuevo, viejo) => {
        console.info(`🏠 [MitaDOM] Estado Local Mutado con éxito:`, nuevo);
        if (onMutateOriginal) onMutateOriginal(nuevo, viejo);
    };
    
    return new Signal(valorInicial, opts);
}
