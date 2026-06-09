import test from 'node:test';
import assert from 'node:assert';
import { crearRecurso } from '../src/core/resource.js';

test('crearRecurso maneja el flujo de éxito (loading -> data)', async (t) => {
    const fetchExitoso = () => Promise.resolve('Datos listos');
    const recurso = crearRecurso(fetchExitoso);

    // Estado inicial síncrono
    assert.strictEqual(recurso.loading.value, true, 'Debe iniciar cargando');
    assert.strictEqual(recurso.data.value, null);
    assert.strictEqual(recurso.error.value, null);

    // Esperamos la resolución de la microtarea de la promesa
    await new Promise(resolve => setTimeout(resolve, 0));

    // Estado final
    assert.strictEqual(recurso.loading.value, false, 'Ya no debe estar cargando');
    assert.strictEqual(recurso.data.value, 'Datos listos');
    assert.strictEqual(recurso.error.value, null);
});

test('crearRecurso maneja el flujo de error (loading -> error)', async (t) => {
    const errorSimulado = new Error('Fallo de red');
    const fetchFallido = () => Promise.reject(errorSimulado);
    const recurso = crearRecurso(fetchFallido);

    await new Promise(resolve => setTimeout(resolve, 0));

    assert.strictEqual(recurso.loading.value, false);
    assert.strictEqual(recurso.data.value, null);
    assert.strictEqual(recurso.error.value, errorSimulado);
});
