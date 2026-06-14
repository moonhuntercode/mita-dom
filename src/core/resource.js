// @ts-check
import { crearEstadoLocal } from './signals.js';

/**
 * Crea un recurso reactivo a partir de una promesa o función asíncrona.
 * Ideal para el "Granular Fetching".
 * @param {() => Promise<any>} funcionFetch
 */
export function crearRecurso(funcionFetch) {
    const data = crearEstadoLocal(null);
    const loading = crearEstadoLocal(true);
    const error = crearEstadoLocal(null);

    // Lanzamos la promesa y actualizamos los Signals correspondientes
    Promise.resolve(funcionFetch())
        .then(resultado => {
            data.set(resultado);
            error.set(null);
        })
        .catch(err => {
            error.set(err);
            data.set(null);
        })
        .finally(() => {
            loading.set(false);
        });

    return { data, loading, error };
}
