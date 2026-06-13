import test from 'node:test';
import assert from 'node:assert';
import { Signal, ComputedSignal } from '../src/core/signals.js';

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

// ==========================================
// NUEVAS PRUEBAS: ARQUITECTURA AVANZADA v2.1.6
// ==========================================

test('Signal.get() y Signal.set() funcionan como CRUD', (t) => {
    const s = new Signal(100);
    assert.strictEqual(s.get(), 100);
    s.set(200);
    assert.strictEqual(s.get(), 200);
});

test('Signal.update() realiza mutaciones funcionales', (t) => {
    const s = new Signal(10);
    s.update(val => val + 5);
    assert.strictEqual(s.get(), 15);
});

test('Signal.patch() fusiona objetos correctamente', (t) => {
    const s = new Signal({ a: 1, b: 2 });
    const muto = s.patch({ b: 3, c: 4 });
    assert.strictEqual(muto, true);
    assert.deepStrictEqual(s.get(), { a: 1, b: 3, c: 4 });
});

test('Signal con guard rechaza mutaciones no autorizadas', (t) => {
    const s = new Signal(10, {
        guard: (newVal) => newVal >= 0 // Solo permite positivos
    });
    
    // Mutación válida
    const mutoBien = s.set(5);
    assert.strictEqual(mutoBien, true);
    assert.strictEqual(s.get(), 5);

    // Mutación rechazada
    const mutoMal = s.set(-5);
    assert.strictEqual(mutoMal, false); // Fue rechazado
    assert.strictEqual(s.get(), 5); // El valor no cambió
});

test('Signal con inmutabilidad bloquea referencias directas', (t) => {
    const s = new Signal({ config: { activo: true } }, { immutable: true });
    
    const ref = s.get();
    try {
        ref.config.activo = false; 
    } catch (e) {
        // En "strict mode" lanzararía TypeError, pero aseguramos verificando que el valor no cambió:
    }
    // Como deepFreeze hace una copia antes de devolver, aunque no crashee en test runner suelto,
    // garantizamos que el estado real dentro del signal sigue siendo true.
    assert.strictEqual(s.get().config.activo, true);
});

test('Signal usa StorageAdapter para persistencia', (t) => {
    const mockStorage = {
        data: {},
        getItem(key) { return this.data[key]; },
        setItem(key, val) { this.data[key] = val; },
        removeItem(key) { delete this.data[key]; }
    };

    // 1. Debe escribir al crear si lo forzamos o al cambiar
    const s = new Signal(42, { persistKey: 'test_key', storageAdapter: mockStorage });
    s.set(99);
    assert.strictEqual(mockStorage.data['test_key'], '99');

    // 2. Debe leer al inicializar
    const s2 = new Signal(0, { persistKey: 'test_key', storageAdapter: mockStorage });
    assert.strictEqual(s2.get(), 99);

    // 3. Debe borrar en destroy
    s2.destroy();
    assert.strictEqual(mockStorage.data['test_key'], undefined);
});

// ==========================================
// TESTS PARA ComputedSignal (ROBADO DE VUE)
// ==========================================

test('ComputedSignal deriva y memoriza el estado correctamente', (t) => {
    const parent = new Signal(10);
    const doble = new ComputedSignal(parent, (val) => val * 2);
    
    assert.strictEqual(doble.get(), 20);

    // Al mutar el padre, el hijo se computa automáticamente
    parent.set(50);
    assert.strictEqual(doble.get(), 100);
});

test('ComputedSignal previene mutación directa', (t) => {
    const parent = new Signal(10);
    const doble = new ComputedSignal(parent, (val) => val * 2);

    const muto = doble.set(50);
    assert.strictEqual(muto, false); // Bloqueado
    assert.strictEqual(doble.get(), 20); // Mantuvo su valor derivado
});

test('ComputedSignal notifica a sus propios suscriptores', (t) => {
    const parent = new Signal(2);
    const cuadrado = new ComputedSignal(parent, (val) => val * val);

    let notificado = 0;
    cuadrado.suscribir((val) => {
        notificado = val;
    });

    // Suscripción inicial ejecuta sincrónicamente
    assert.strictEqual(notificado, 4);

    parent.set(5);
    // Notificación automática
    assert.strictEqual(notificado, 25);
});
