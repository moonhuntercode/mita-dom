import { describe, it, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';
import { checkMitaDomVersion } from '../src/core/versionCheck.js';

describe('versionCheck.js', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  
  mock.timers.enable();

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    console.warn = mock.fn();
    console.info = mock.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalEnv;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    mock.restoreAll();
  });

  it('no debería lanzar errores si fetch falla (Fallo Silencioso)', async () => {
    globalThis.fetch = mock.fn(() => Promise.reject(new Error('Network Error')));

    // Debe resolverse sin lanzar error
    await checkMitaDomVersion();
    assert.ok(true);
  });

  it('debería abortar fetch si tarda más de 3 segundos', async () => {
    // Simulamos un fetch que nunca termina
    globalThis.fetch = mock.fn(() => new Promise(() => {}));

    const promise = checkMitaDomVersion();
    
    // Avanzamos el tiempo 3.1 segundos
    mock.timers.tick(3100);

    // Debe resolverse de forma segura por el catch interno del AbortError
    await promise;
    assert.ok(true);
  });
});
