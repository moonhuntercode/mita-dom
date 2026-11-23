import { describe, it, expect } from 'vitest';
import { mitaResult } from './result.js';

describe('mitaResult (Rust/Go style)', () => {
  it('Debe capturar errores de funciones síncronas de forma segura', () => {
    const thrower = () => { throw new Error('Boom'); };
    const [err, data] = mitaResult(thrower);
    
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Boom');
    expect(data).toBeNull();
  });

  it('Debe retornar la tupla correcta para éxitos síncronos', () => {
    const worker = () => 'Success';
    const [err, data] = mitaResult(worker);
    
    expect(err).toBeNull();
    expect(data).toBe('Success');
  });

  it('Debe atrapar errores en Promesas', async () => {
    const failingPromise = Promise.reject(new Error('Async Boom'));
    const [err, data] = await mitaResult(failingPromise);
    
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Async Boom');
    expect(data).toBeNull();
  });

  it('Debe resolver Promesas correctamente', async () => {
    const successPromise = Promise.resolve('Async Success');
    const [err, data] = await mitaResult(successPromise);
    
    expect(err).toBeNull();
    expect(data).toBe('Async Success');
  });

  it('Debe manejar funciones que retornan promesas', async () => {
    const asyncFn = async () => {
      throw new Error('Inner Boom');
    };
    const [err, data] = await mitaResult(asyncFn);
    
    expect(err).toBeInstanceOf(Error);
    expect(err.message).toBe('Inner Boom');
    expect(data).toBeNull();
  });
});
