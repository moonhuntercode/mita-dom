// @ts-check

/**
 * 📡 Pila interna para auto-rastreo de dependencias en `crearEfecto(fn)`.
 * Permite que cualquier `signal.get()` ejecutado dentro de un efecto
 * se suscriba automáticamente sin necesidad de listar dependencias a mano.
 * @type {Array<{ ejecutar: Function, dependencias: Set<Signal<any>> }>}
 */
const pilaDeEfectos = [];

/**
 * 🗂️ Registro central de Estados Compartidos por nombre.
 * Permite compartir datos entre componentes desacoplados (hermanos, modales,
 * encabezados, paneles de administración) sin imports circulares.
 * @type {Map<string, { signal: Signal<any>, nombre: string, descripcion: string, persistKey: string | null, reglas: string }>}
 */
const registroEstadosCompartidos = new Map();

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
 * @template T
 */
export class Signal {
    #valor;
    #valorInicialOriginal;

    /**
     * @param {T} valorInicial 
     * @param {Object} options Opciones avanzadas de la arquitectura
     * @param {boolean} [options.immutable=false] Fuerza inmutabilidad con Object.freeze
     * @param {string} [options.persistKey=null] Key para persistir
     * @param {{ getItem: (key: string) => any, setItem: (key: string, val: string) => any, removeItem: (key: string) => any }} [options.storageAdapter=localStorage] Adaptador DB
     * @param {Function} [options.guard] (newValue: T, oldValue: T) => boolean. Control de Acceso/Autorización
     * @param {Function} [options.onMutate] (newValue: T, oldValue: T) => void Hook para Telemetría y Debug
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

        this.#valorInicialOriginal = valorInicial;
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
        this.#valor = this._procesarInmutabilidad(valorInicial);
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
     * Si se invoca dentro de `crearEfecto(fn)`, registra automáticamente la dependencia.
     * @returns {T} El valor reactivo actual
     */
    get() {
        const efectoActivo = pilaDeEfectos[pilaDeEfectos.length - 1];
        if (efectoActivo) {
            this.suscriptores.add(efectoActivo.ejecutar);
            efectoActivo.dependencias.add(this);
        }
        return this.#valor;
    }

    /**
     * UPDATE (Directo): Sobrescribe el estado con un nuevo valor.
     * @param {T} nuevoValor El nuevo valor a establecer
     * @returns {boolean} true si mutó, false si fue bloqueado por Auth (guard)
     */
    set(nuevoValor) {
        // 1. Autorización y Control de Acceso (Guard)
        if (this.options.guard && !this.options.guard(nuevoValor, this.#valor)) {
            console.warn(`[Signal Auth] Mutación rechazada por Guard. Acción no autorizada.`);
            return false;
        }

        if (this.#valor !== nuevoValor) {
            const oldValue = this.#valor;
            this.#valor = this._procesarInmutabilidad(nuevoValor);

            // 2. Persistencia automática vía Adapter
            if (this.options.persistKey) {
                const storage = this.options.storageAdapter || (typeof localStorage !== 'undefined' ? localStorage : null);
                if (storage) {
                    try {
                        storage.setItem(this.options.persistKey, JSON.stringify(this.#valor));
                    } catch (e) {}
                }
            }

            // 3. Telemetría / Debug
            if (this.options.onMutate) {
                this.options.onMutate(this.#valor, oldValue);
            }

            // 4. Reactividad
            this.notificar();
        }
        return true;
    }

    /**
     * UPDATE (Funcional): Ideal para contadores o arrays basado en estado anterior.
     * @param {(estadoAnterior: T) => T} updaterFn Función pura para mutar
     * @returns {boolean} true si mutó exitosamente
     */
    update(updaterFn) {
        // Le pasamos un clon si es inmutable, o la ref si es mutable
        const prev = this.options.immutable 
            ? (structuredClone ? structuredClone(this.#valor) : JSON.parse(JSON.stringify(this.#valor))) 
            : this.#valor;
            
        const nextValue = updaterFn(prev);
        return this.set(nextValue);
    }

    /**
     * UPDATE (Parcial): Aplica un parche a un objeto (Merge). Mejora la DX (Developer Experience).
     * @param {Partial<any>} partialValue Objeto con propiedades a sobrescribir
     * @returns {boolean} true si mutó
     */
    patch(partialValue) {
        if (this.#valor === null || typeof this.#valor !== 'object' || Array.isArray(this.#valor)) {
            console.warn('[Signal] .patch() solo puede usarse en estados que sean Objetos Puros.');
            return false;
        }
        return this.update(estado => ({ ...estado, ...partialValue }));
    }

    /**
     * DELETE / RESET: Devuelve el estado a su valor de nacimiento.
     */
    reset() {
        this.set(this.#valorInicialOriginal);
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
     * Retorna una función de limpieza (`desuscribir`) para liberar memoria fácilmente.
     * @param {(val: T) => void} callback Función ejecutada en cada cambio
     * @returns {() => void} Función para cancelar esta suscripción
     */
    suscribir(callback) {
        this.suscriptores.add(callback);
        // Ejecución inmediata inicial para sincronizar el DOM con el estado
        callback(this.#valor);
        return () => this.desuscribir(callback);
    }

    /**
     * Crea un SignalDerivado (solo lectura) a partir de este Signal.
     * @template R
     * @param {(val: T) => R} computeFn Función pura que transforma el valor
     * @returns {SignalDerivado} Nuevo signal derivado
     */
    derivar(computeFn) {
        return new SignalDerivado(this, computeFn);
    }

    /**
     * Elimina una suscripción.
     * @param {(val: T) => void} callback Función previamente suscrita
     */
    desuscribir(callback) {
        this.suscriptores.delete(callback);
    }

    /**
     * Notifica a todos los suscriptores sobre una copia estática del Set.
     * Evita bucles infinitos cuando un efecto re-suscribe dependencias durante el recorrido.
     */
    notificar() {
        const suscriptoresActivos = Array.from(this.suscriptores);
        suscriptoresActivos.forEach(callback => {
            try {
                callback(this.#valor);
            } catch (err) {
                console.error('🔥 [MitaDOM Signal] Error fatal en un suscriptor. Aislamiento activado para proteger el resto de la aplicación.', err);
            }
        });
    }
}

// Bloqueamos el prototipo para prevenir Prototype Pollution (Seguridad en Memoria)
Object.freeze(Signal.prototype);

/**
 * 🧠 SignalDerivado (Estado Derivado o Calculado)
 * Inspirado en Vue.js (computed) y SolidJS (createMemo).
 * Actúa como un caché matemático: solo recalcula su valor cuando el Signal Padre cambia.
 * Ahorra CPU evitando cálculos pesados en cada renderizado.
 */
export class SignalDerivado extends Signal {
/**
     * @template P, R
     * @param {Signal<P>} parentSignal El signal base que se va a escuchar
     * @param {(val: P) => R} computeFn Función pura que transforma el valor
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
 * Determina si los logs informativos de mutación deben imprimirse en consola.
 * Silencioso por defecto en entornos de testing (Vitest / node --test), CI y producción
 * para evitar desbordar el buffer de terminal; se puede activar con `{ debug: true }`
 * o `globalThis.__MITA_DEBUG__ = true`.
 * @param {Object} [options]
 * @returns {boolean}
 */
function debeImprimirLogSignal(options = {}) {
    if (options.debug === true || /** @type {any} */ (globalThis).__MITA_DEBUG__ === true) {
        return true;
    }
    if (options.debug === false) return false;
    if (typeof process !== 'undefined' && process.env) {
        if (
            process.env.VITEST ||
            process.env.NODE_TEST_CONTEXT ||
            process.env.CI ||
            process.env.NODE_ENV === 'test' ||
            process.env.NODE_ENV === 'production'
        ) {
            return false;
        }
    }
    return true;
}

/**
     * Crea un estado global.
     * Ideal para compartir datos entre múltiples componentes (ej. Sesión, Tema, Configuración).
     * Provee feedback visual en consola en desarrollo (silencioso en test/producción salvo `{ debug: true }`).
     * 
     * @template T
     * @param {T} valorInicial El valor inicial del estado (puede ser de cualquier tipo)
     * @param {Object} [options={}] Opciones de Signal (ej. persistKey, onMutate, debug)
     * @returns {Signal<T>} Instancia de Signal estricta
     */
export function crearEstadoGlobal(valorInicial, options = {}) {
    const opts = { ...options };
    const onMutateOriginal = opts.onMutate;
    
    opts.onMutate = (nuevo, viejo) => {
        if (debeImprimirLogSignal(opts)) {
            console.info(`🌍 [MitaDOM] Estado Global Mutado con éxito:`, nuevo);
        }
        if (onMutateOriginal) onMutateOriginal(nuevo, viejo);
    };
    
    return new Signal(valorInicial, opts);
}

/**
 * Crea un estado local.
 * Ideal para uso efímero dentro de un solo componente web (ej. contadores, formularios).
 * Provee feedback visual en consola en desarrollo (silencioso en test/producción salvo `{ debug: true }`).
 * 
 * @template T
 * @param {T} valorInicial El valor inicial del estado local
 * @param {Object} [options={}] Opciones de Signal
 * @returns {Signal<T>} Instancia de Signal local estricta
 */
export function crearEstadoLocal(valorInicial, options = {}) {
    const opts = { ...options };
    const onMutateOriginal = opts.onMutate;
    
    opts.onMutate = (nuevo, viejo) => {
        if (debeImprimirLogSignal(opts)) {
            console.info(`🏠 [MitaDOM] Estado Local Mutado con éxito:`, nuevo);
        }
        if (onMutateOriginal) onMutateOriginal(nuevo, viejo);
    };
    
    return new Signal(valorInicial, opts);
}

/**
 * ⚡ Crea un efecto reactivo con auto-rastreo de dependencias.
 * Cualquier Signal leído con `.get()` dentro de `fn` re-ejecutará automáticamente
 * este efecto cuando su valor cambie.
 *
 * @param {() => void} fn Función reactiva a ejecutar
 * @returns {() => void} Función `detener()` para limpiar todas las suscripciones (0 memory leaks)
 */
export function crearEfecto(fn) {
    if (typeof fn !== 'function') {
        throw new Error('[MitaDOM] crearEfecto requiere una función válida.');
    }

    let activo = true;
    /** @type {{ ejecutar: () => void, dependencias: Set<Signal<any>> }} */
    const nodoEfecto = {
        dependencias: new Set(),
        ejecutar: () => {
            if (!activo) return;
            // Limpiamos dependencias previas para re-calcular en ramas condicionales
            nodoEfecto.dependencias.forEach(dep => dep.desuscribir(nodoEfecto.ejecutar));
            nodoEfecto.dependencias.clear();

            pilaDeEfectos.push(nodoEfecto);
            try {
                fn();
            } catch (err) {
                console.error('🔥 [MitaDOM Efecto] Error ejecutando efecto reactivo:', err);
            } finally {
                pilaDeEfectos.pop();
            }
        }
    };

    nodoEfecto.ejecutar();

    return function detenerEfecto() {
        activo = false;
        nodoEfecto.dependencias.forEach(dep => dep.desuscribir(nodoEfecto.ejecutar));
        nodoEfecto.dependencias.clear();
    };
}

/**
 * 🙈 Ejecuta una función leyendo o mutando Signals SIN registrarlos como dependencias
 * del `crearEfecto()` activo (equivalente a `untrack()` en SolidJS).
 * Evita bucles infinitos al escribir en un Signal interno dentro de un efecto.
 *
 * @template T
 * @param {() => T} fn Función a ejecutar fuera del rastreo reactivo
 * @returns {T} Resultado de `fn`
 */
export function sinRastrear(fn) {
    // Empujamos null como barrera en la pila: Signal.get() ve efectoActivo === null y no suscribe
    // @ts-ignore
    pilaDeEfectos.push(null);
    try {
        return fn();
    } finally {
        pilaDeEfectos.pop();
    }
}

/**
 * 🤝 Crea o recupera un Estado Compartido con nombre explícito.
 * Pensado para máxima claridad y legibilidad al compartir datos entre múltiples
 * componentes (ej: Configuración de Empleos, Sesión Admin, Carrito).
 *
 * @template T
 * @param {string} nombreUnico Identificador único y legible del estado (ej. 'empleos:config')
 * @param {T} valorInicial Valor inicial si aún no existe en el registro
 * @param {Object} [opciones={}] Opciones claras de comportamiento
 * @param {boolean} [opciones.persistirLocal=false] Si es true, guarda automáticamente en localStorage
 * @param {string} [opciones.persistKey] Clave personalizada en localStorage (sobreescribe persistirLocal)
 * @param {string} [opciones.descripcion=''] Descripción legible para auditoría y panel Admin
 * @param {string} [opciones.reglas=''] Reglas de negocio documentadas sobre quién puede mutar este estado
 * @param {boolean} [opciones.immutable=false] Congela el estado con deepFreeze
 * @param {Function} [opciones.guard] Función (nuevo, anterior) => boolean para controlar permisos
 * @param {Function} [opciones.onMutate] Hook de telemetría al mutar
 * @param {any} [opciones.storageAdapter] Adaptador de almacenamiento personalizado
 * @returns {Signal<T>} Instancia compartida de Signal
 */
export function crearEstadoCompartido(nombreUnico, valorInicial, opciones = {}) {
    if (!nombreUnico || typeof nombreUnico !== 'string') {
        throw new Error('[MitaDOM] crearEstadoCompartido requiere un nombreUnico (string no vacío).');
    }

    const existente = registroEstadosCompartidos.get(nombreUnico);
    if (existente) {
        return existente.signal;
    }

    const persistKey = opciones.persistKey || (opciones.persistirLocal ? `mita_estado_${nombreUnico}` : null);
    const signal = crearEstadoGlobal(valorInicial, {
        immutable: opciones.immutable || false,
        persistKey,
        storageAdapter: opciones.storageAdapter || null,
        guard: opciones.guard || null,
        onMutate: opciones.onMutate || null
    });

    registroEstadosCompartidos.set(nombreUnico, {
        signal,
        nombre: nombreUnico,
        descripcion: opciones.descripcion || 'Estado compartido sin descripción',
        persistKey,
        reglas: opciones.reglas || 'Sin restricciones específicas'
    });

    return signal;
}

/**
 * 🔎 Recupera un Estado Compartido previamente registrado por su nombre.
 *
 * @param {string} nombreUnico Nombre con el que se creó el estado
 * @returns {Signal<any> | null} El Signal compartido o null si no existe
 */
export function obtenerEstadoCompartido(nombreUnico) {
    const entrada = registroEstadosCompartidos.get(nombreUnico);
    if (!entrada) {
        console.warn(`⚠️ [MitaDOM] No existe el estado compartido "${nombreUnico}". Créalo primero con crearEstadoCompartido().`);
        return null;
    }
    return entrada.signal;
}

/**
 * 📋 Lista todos los estados compartidos activos para inspección en Panel Admin / DevTools.
 *
 * @returns {Array<{ nombre: string, descripcion: string, reglas: string, persistKey: string | null, valorActual: any, suscriptores: number }>}
 */
export function listarEstadosCompartidos() {
    return Array.from(registroEstadosCompartidos.values()).map((entrada) => ({
        nombre: entrada.nombre,
        descripcion: entrada.descripcion,
        reglas: entrada.reglas,
        persistKey: entrada.persistKey,
        valorActual: entrada.signal.get(),
        suscriptores: entrada.signal.suscriptores.size
    }));
}

/**
 * 🧹 Elimina un Estado Compartido del registro y limpia sus suscriptores.
 * Útil en tests o al cerrar sesión administrativa.
 *
 * @param {string} nombreUnico Nombre del estado a eliminar
 */
export function eliminarEstadoCompartido(nombreUnico) {
    const entrada = registroEstadosCompartidos.get(nombreUnico);
    if (entrada) {
        entrada.signal.destroy();
        registroEstadosCompartidos.delete(nombreUnico);
    }
}
