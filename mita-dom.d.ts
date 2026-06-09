/**
 * -----------------------------------------------------------------
 * MitaDOM - TypeScript Declarations
 * Proporciona autocompletado estricto sin compilar nada a JavaScript.
 * -----------------------------------------------------------------
 */

/**
 * El núcleo reactivo: Un gestor de estado granular basado en observables.
 */
export class Signal<T> {
    constructor(valorInicial: T);
    
    /** Obtiene el valor actual del Signal. */
    get value(): T;
    
    /** Actualiza el valor y notifica automáticamente a los suscriptores. */
    set value(nuevoValor: T);
    
    /** Registra una función que se ejecutará cada vez que el valor cambie. */
    suscribir(callback: (valor: T) => void): void;
    
    /** Elimina la suscripción para liberar memoria (Garbage Collection). */
    desuscribir(callback: (valor: T) => void): void;
    
    /** Fuerza la notificación a todos los suscriptores. */
    notificar(): void;
}

/** Instancia de demostración para el estado global */
export const estadoAppGlobal: Signal<number>;

/**
 * Router SPA reactivo impulsado por el estándar Navigation API.
 */
export const rutaActual: Signal<string>;

/**
 * Tupla reactiva para manejar flujos de datos asíncronos (Fetch).
 * Actualiza automáticamente los Signals durante el ciclo de vida de la promesa.
 */
export function crearRecurso<T>(
    promesaFunc: () => Promise<T>
): {
    data: Signal<T | null>;
    loading: Signal<boolean>;
    error: Signal<Error | null>;
};

/**
 * Utilidad de seguridad para prevenir ataques XSS usando APIs nativas.
 */
export function sanitizarTexto(htmlInseguro: string): string;

// Soporte de autocompletado para el DOM global (cuando se usen nuestros Custom Elements)
declare global {
    interface HTMLElementTagNameMap {
        'mita-tarjeta': HTMLElement;
        'mita-perfil': HTMLElement;
    }
}
