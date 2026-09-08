/**
 * MitaAnim - Envoltura pragmática sobre la Web Animations API (WAAPI).
 * Permite ejecutar transiciones sobre el Light/Shadow DOM a 60FPS
 * sin sobrecargar el hilo principal (compositor thread).
 */

export class MitaAnim {
  /**
   * Ejecuta una transición opaca genérica
   * @param {HTMLElement} element - El nodo MitaDOM a animar
   * @param {number} duration - Duración en milisegundos (ms)
   * @param {string} easing - Curva CSS (ej: 'ease-in-out')
   * @returns {Animation} Instancia WAAPI
   */
  static fadeIn(element, duration = 300, easing = 'ease-out') {
    return element.animate([
      { opacity: 0 },
      { opacity: 1 }
    ], {
      duration,
      easing,
      fill: 'forwards'
    });
  }

  static fadeOut(element, duration = 300, easing = 'ease-in') {
    return element.animate([
      { opacity: 1 },
      { opacity: 0 }
    ], {
      duration,
      easing,
      fill: 'forwards'
    });
  }

  static slideInY(element, offset = 50, duration = 400, easing = 'cubic-bezier(0.175, 0.885, 0.32, 1.275)') { // EaseOutBack CSS
    return element.animate([
      { opacity: 0, transform: `translateY(${offset}px)` },
      { opacity: 1, transform: 'translateY(0)' }
    ], {
      duration,
      easing,
      fill: 'forwards'
    });
  }

  static pulse(element, scale = 1.05, duration = 500) {
    return element.animate([
      { transform: 'scale(1)' },
      { transform: `scale(${scale})`, offset: 0.5 },
      { transform: 'scale(1)' }
    ], {
      duration,
      easing: 'ease-in-out',
      iterations: Infinity
    });
  }
}
