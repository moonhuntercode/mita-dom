// @ts-check
import { Signal } from './signals.js';

/**
 * Crea un recurso reactivo a partir de una promesa o función asíncrona.
 * Ideal para el "Granular Fetching".
 * @param {() => Promise<any>} funcionFetch
 */
export function crearRecurso(funcionFetch) {
    const data = new Signal(null);
    const loading = new Signal(true);
    const error = new Signal(null);

    // Lanzamos la promesa y actualizamos los Signals correspondientes
    Promise.resolve(funcionFetch())
        .then(resultado => {
            data.value = resultado;
            error.value = null;
        })
        .catch(err => {
            error.value = err;
            data.value = null;
        })
        .finally(() => {
            loading.value = false;
        });

    return { data, loading, error };
}
