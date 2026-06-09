import test from 'node:test';
import assert from 'node:assert';
import { Signal } from '../src/core/signals.js';

test('El Signal inicializa y devuelve su valor correctamente', (t) => {
    const estado = new Signal(10);
    assert.strictEqual(estado.value, 10);
});

test('La suscripción se ejecuta inmediatamente al registrarse', (t) => {
    const estado = new Signal('Hola');
    let valorObtenido = '';
    
    estado.suscribir(val => {
        valorObtenido = val;
    });

    assert.strictEqual(valorObtenido, 'Hola');
});

test('Al cambiar el valor, notifica a los suscriptores', (t) => {
    const estado = new Signal(0);
    let conteo = 0;

    estado.suscribir(val => {
        conteo = val;
    });

    estado.value = 5;
    assert.strictEqual(conteo, 5);
});

test('No permite suscripciones duplicadas (Set)', (t) => {
    const estado = new Signal(0);
    let vecesEjecutado = 0;

    const callback = () => {
        vecesEjecutado++;
    };

    estado.suscribir(callback); // Se ejecuta 1 vez aquí
    estado.suscribir(callback); // El Set lo ignora, pero internamente suscribir llama al callback inicialmente (aunque no se añade al Set)
    
    // Corregimos la prueba: la segunda llamada a suscribir(callback) lo ejecutará inmediatamente por diseño
    // Pero si cambiamos el valor, ¿cuántas veces se ejecuta? Solo 1 vez.
    vecesEjecutado = 0;
    
    estado.value = 10;
    
    // Como el Set evitó duplicados, al notificar solo debe iterar 1 vez
    assert.strictEqual(vecesEjecutado, 1);
});

test('Se puede desuscribir correctamente', (t) => {
    const estado = new Signal(0);
    let vecesEjecutado = 0;

    const callback = () => { vecesEjecutado++; };

    estado.suscribir(callback);
    vecesEjecutado = 0; // reset

    estado.desuscribir(callback);
    estado.value = 10;

    // No debió ejecutarse
    assert.strictEqual(vecesEjecutado, 0);
});
