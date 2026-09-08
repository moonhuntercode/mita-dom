import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MitaTween, Easings } from '../src/core/mitaTween.js';

describe('MitaTween Animation Core', () => {
  it('Debe inicializarse correctamente sin fallos de dependencias externas', () => {
    const tween = new MitaTween({
      from: 0,
      to: 100,
      duration: 500,
      easing: Easings.Linear
    });
    
    assert.strictEqual(tween.from, 0);
    assert.strictEqual(tween.to, 100);
    assert.strictEqual(tween.duration, 500);
    assert.strictEqual(tween.isPaused, false);
  });

  it('Easings Linear debe devolver el mismo valor (t=t)', () => {
    assert.strictEqual(Easings.Linear(0.5), 0.5);
    assert.strictEqual(Easings.Linear(1), 1);
  });
  
  it('Easings Quad inyecta suavidad exponencial', () => {
    assert.strictEqual(Easings.EaseInQuad(0.5), 0.25);
  });
});
