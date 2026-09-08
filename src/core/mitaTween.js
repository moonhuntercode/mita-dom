/**
 * MitaTween - Micro motor de interpolación (Zero-Dependencies)
 * Diseñado para entornos gráficos intensivos (Canvas 2D / 3D) o Signals Reactivas.
 */

// Funciones de Easing (Inspirado en estándares de la industria)
export const Easings = {
  Linear: (t) => t,
  EaseInQuad: (t) => t * t,
  EaseOutQuad: (t) => t * (2 - t),
  EaseInOutQuad: (t) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
  EaseOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }
};

export class MitaTween {
  /**
   * Crea una animación de interpolación pura entre dos valores.
   * @param {Object} config - { from: number, to: number, duration: number, easing: Function, onUpdate: Function, onComplete: Function }
   */
  constructor({ from = 0, to = 1, duration = 1000, easing = Easings.Linear, onUpdate, onComplete }) {
    this.from = from;
    this.to = to;
    this.duration = duration;
    this.easing = easing;
    this.onUpdate = onUpdate;
    this.onComplete = onComplete;
    
    this.startTime = null;
    this.rafId = null;
    this.isPaused = false;
    this.pauseTime = 0;
  }

  start() {
    this.startTime = performance.now();
    this.isPaused = false;
    this.rafId = requestAnimationFrame((time) => this._tick(time));
    return this;
  }

  pause() {
    this.isPaused = true;
    cancelAnimationFrame(this.rafId);
    this.pauseTime = performance.now();
    return this;
  }

  resume() {
    if (!this.isPaused) return this;
    const offset = performance.now() - this.pauseTime;
    this.startTime += offset;
    this.isPaused = false;
    this.rafId = requestAnimationFrame((time) => this._tick(time));
    return this;
  }

  stop() {
    cancelAnimationFrame(this.rafId);
    return this;
  }

  _tick(currentTime) {
    if (this.isPaused) return;

    let elapsed = currentTime - this.startTime;
    let progress = Math.min(elapsed / this.duration, 1);
    
    // Aplicar curva de easing
    const easedProgress = this.easing(progress);
    const currentValue = this.from + (this.to - this.from) * easedProgress;

    if (this.onUpdate) {
      this.onUpdate(currentValue, progress);
    }

    if (progress < 1) {
      this.rafId = requestAnimationFrame((time) => this._tick(time));
    } else {
      if (this.onComplete) this.onComplete();
    }
  }
}
