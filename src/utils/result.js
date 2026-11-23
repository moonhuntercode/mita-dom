// @ts-check

/**
 * Patrón "Result" (Inspirado en Rust y Go)
 * Evita el uso del destructivo `try/catch` que rompe el flujo léxico y obliga
 * al desarrollador a manejar los errores explícitamente en una sola línea.
 * 
 * @template T
 * @param {Promise<T> | (() => T)} operacion - Una promesa o una función síncrona.
 * @returns {Promise<[Error, null] | [null, T]> | [Error, null] | [null, T]} Retorna la tupla [error, data].
 */
export function mitaResult(operacion) {
  // Si es una promesa
  if (operacion instanceof Promise) {
    return operacion
      .then(data => /** @type {[null, T]} */ ([null, data]))
      .catch(err => /** @type {[Error, null]} */ ([err instanceof Error ? err : new Error(String(err)), null]));
  }

  // Si es una función síncrona
  if (typeof operacion === 'function') {
    try {
      const data = operacion();
      
      // Si la función retorna una promesa internamente
      if (data instanceof Promise) {
        return data
          .then(res => /** @type {[null, T]} */ ([null, res]))
          .catch(err => /** @type {[Error, null]} */ ([err instanceof Error ? err : new Error(String(err)), null]));
      }

      return /** @type {[null, T]} */ ([null, data]);
    } catch (err) {
      return /** @type {[Error, null]} */ ([err instanceof Error ? err : new Error(String(err)), null]);
    }
  }

  // Fallback si no es ni promesa ni función
  return /** @type {[Error, null]} */ ([new Error('mitaResult requiere una Promesa o una Función'), null]);
}
