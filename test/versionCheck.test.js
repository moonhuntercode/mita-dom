import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { checkMitaDomVersion } from '../src/core/versionCheck.js';

describe('versionCheck.js', () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.NODE_ENV;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;

  beforeEach(() => {
    vi.useFakeTimers();
    process.env.NODE_ENV = 'development';
    console.warn = vi.fn();
    console.info = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    process.env.NODE_ENV = originalEnv;
    console.warn = originalConsoleWarn;
    console.info = originalConsoleInfo;
    vi.restoreAllMocks();
  });

  it('no debería lanzar errores si fetch falla (Fallo Silencioso)', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network Error'));

    // Debe resolverse sin lanzar error
    await expect(checkMitaDomVersion()).resolves.toBeUndefined();
  });

  it('debería abortar fetch si tarda más de 3 segundos', async () => {
    // Simulamos un fetch que nunca termina
    globalThis.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    const promise = checkMitaDomVersion();
    
    // Avanzamos el tiempo 3.1 segundos
    vi.advanceTimersByTime(3100);

    // Debe resolverse de forma segura por el catch interno del AbortError
    await expect(promise).resolves.toBeUndefined();
  });
});
