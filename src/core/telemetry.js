// @ts-check

/**
 * Módulo de Telemetría y Profiler Local (MitaDOM)
 * Enfocado en Resiliencia, Batching Local y 0% impacto FPS.
 */

const MITA_TELEMETRY_KEY = 'mitadom_telemetry';
const MAX_QUEUE = 20;

class MitaTelemetry {
  constructor() {
    this.queue = this._loadLocal();
    this.isTracking = false;
  }

  _loadLocal() {
    if (typeof localStorage === 'undefined') return [];
    try {
      return JSON.parse(localStorage.getItem(MITA_TELEMETRY_KEY) || '[]');
    } catch {
      return [];
    }
  }

  _saveLocal() {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(MITA_TELEMETRY_KEY, JSON.stringify(this.queue));
    } catch (e) {
      console.warn('MitaTelemetry: Fallo al guardar localmente', e);
    }
  }

  /**
   * Inicia el registro automático de errores huérfanos y eventos lentos
   */
  init() {
    if (this.isTracking || typeof window === 'undefined') return;
    this.isTracking = true;

    // 1. Errores No Capturados (Catastróficos)
    window.onerror = (message, source, lineno, colno, error) => {
      this.capture({
        type: 'CRITICAL_ERROR',
        message: String(message),
        source,
        lineno,
        stack: error ? error.stack : undefined
      });
      return false; // Permitir que el navegador lo muestre de todas formas (fiel a JS)
    };

    // 2. Promesas Huérfanas
    window.addEventListener('unhandledrejection', (event) => {
      this.capture({
        type: 'PROMISE_REJECTION',
        message: event.reason ? String(event.reason) : 'Unknown Promise Rejection',
        stack: event.reason?.stack
      });
    });

    // 3. Profiler: Event Delegation Global para latencia de Clicks
    // Solo medimos si el botón tiene un data-action o estamos en modo Dev
    document.addEventListener('click', (e) => {
      // @ts-ignore
      const target = e.target.closest('button, a, [data-action]');
      if (!target) return;

      const actionName = target.getAttribute('data-action') || target.tagName.toLowerCase();
      const start = performance.now();

      // Dejamos que el Event Loop procese los handlers adjuntos al elemento
      // (Microtasks / Macrotasks) y cronometramos
      requestAnimationFrame(() => {
        setTimeout(() => {
          const latency = performance.now() - start;
          // Si el botón tardó más de 50ms en procesarse, es un "Slow Event"
          if (latency > 50) {
            this.capture({
              type: 'SLOW_INTERACTION',
              action: actionName,
              latency: parseFloat(latency.toFixed(2)),
              tag: target.tagName,
              id: target.id,
              classes: target.className
            });
          }
        }, 0);
      });
    }, { capture: true, passive: true });
  }

  /**
   * @param {Object} data
   */
  capture(data) {
    const payload = {
      ...data,
      timestamp: new Date().toISOString(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown'
    };

    this.queue.push(payload);
    
    // Batching: No desbordar la memoria
    if (this.queue.length > MAX_QUEUE) {
      this.queue.shift(); // FIFO (eliminamos el más antiguo)
    }

    this._saveLocal();
  }

  /**
   * Imprime una tabla hermosa en consola con los errores y cuellos de botella.
   */
  profile() {
    if (this.queue.length === 0) {
      console.log('✅ [Mita Profiler] Excelente estado. 0 errores o interacciones lentas.');
      return;
    }

    console.group('📊 [Mita Profiler] Reporte de Telemetría Local');
    
    // Filtrar por tipos
    const errors = this.queue.filter(q => q.type.includes('ERROR') || q.type === 'PROMISE_REJECTION' || q.type === 'COMPONENT_CRASH');
    const slowEvents = this.queue.filter(q => q.type === 'SLOW_INTERACTION');
    const slowRenders = this.queue.filter(q => q.type === 'SLOW_RENDER');

    if (errors.length > 0) {
      console.log('%c💥 Errores Críticos & Crasheos', 'color: #ef4444; font-weight: bold; font-size: 1.1em;');
      console.table(errors, ['type', 'component', 'message', 'timestamp']);
    }

    if (slowEvents.length > 0) {
      console.log('%c🐢 Interacciones de Usuario Lentas (>50ms)', 'color: #f59e0b; font-weight: bold; font-size: 1.1em;');
      console.table(slowEvents, ['action', 'latency', 'tag', 'timestamp']);
    }

    if (slowRenders.length > 0) {
      console.log('%c🖼️ Renderizados de Componentes Lentos (>20ms)', 'color: #f59e0b; font-weight: bold; font-size: 1.1em;');
      console.table(slowRenders, ['component', 'latency', 'timestamp']);
    }

    console.log('%c💡 Pro Tip: Copia un registro en formato JSON usando: JSON.stringify(mita.raw()) y envíaselo a tu IA.', 'color: #3b82f6;');
    console.groupEnd();
  }

  raw() {
    return this.queue;
  }

  clear() {
    this.queue = [];
    this._saveLocal();
    console.log('🧹 [Mita Profiler] Telemetría limpia.');
  }
}

export const telemetry = new MitaTelemetry();

export function enableAIDevMode() {
  telemetry.init();
  if (typeof window !== 'undefined') {
    // @ts-ignore
    window.mita = {
      profile: () => telemetry.profile(),
      diagnose: () => telemetry.profile(),
      clear: () => telemetry.clear(),
      raw: () => telemetry.raw()
    };
  }
}
