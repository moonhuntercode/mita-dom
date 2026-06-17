// @ts-check

/**
 * Clase base MitaElement para crear Web Components Nativos con superpoderes.
 * Proporciona Error Boundaries (try/catch automático en render) y 
 * Telemetría básica (registro de performance).
 */
export class MitaElement extends HTMLElement {
  constructor() {
    super();
    // DX Linter: Telemetría de renders
    this._renderCount = 0;
    this._lastRenderTime = 0;
    this._innerHTMLCount = 0;
    this._lastInnerHTMLTime = 0;
  }

  /**
   * DX Linter: Interceptamos innerHTML para evitar el anti-patrón de re-render masivo.
   * Permite el Conditional Render (re-renders ocasionales) pero advierte de abusos (animaciones/loops).
   */
  get innerHTML() {
    return super.innerHTML;
  }

  set innerHTML(value) {
    const now = performance.now();
    if (this._lastInnerHTMLTime > 0 && (now - this._lastInnerHTMLTime) < 100) {
      this._innerHTMLCount++;
      if (this._innerHTMLCount > 2) {
        console.warn(
          `⚠️ [MitaDOM DX Linter] Estás abusando de 'this.innerHTML' en <${this.tagName.toLowerCase()}>.\n` +
          `👉 Diagnóstico: Estás re-escribiendo el DOM completo múltiples veces por segundo. Esto rompe la Accesibilidad, pausa los Gifs y fríe el CPU.\n` +
          `💡 Solución: Usa el "Granular Light DOM". Identifica qué parte del texto cambia y muta solo ese TextNode (ej: $elemento.textContent = valor) suscribiéndote a un Signal.`
        );
      }
    } else {
      this._innerHTMLCount = 1;
    }
    this._lastInnerHTMLTime = now;

    // Llamamos al comportamiento nativo original para no romper nada (Retro-compatibilidad pura)
    super.innerHTML = value;
  }

  /**
   * Ciclo de vida: Inserción en el DOM
   */
  connectedCallback() {
    // Telemetría simple
    const t0 = performance.now();

    // Renderizado seguro
    this._safeRender();

    // DX: Ciclo de vida en español
    // @ts-ignore
    if (typeof this.alMontar === 'function') {
      // @ts-ignore
      this.alMontar();
    }

    const t1 = performance.now();
    const loadTime = t1 - t0;
    
    // Registrar métrica en consola de desarrollo si es muy lento
    if (loadTime > 50) {
        console.warn(`[MitaDOM Telemetry] El componente <${this.tagName.toLowerCase()}> tardó ${loadTime.toFixed(2)}ms en renderizar.`);
    }
  }

  /**
   * Ejecuta el método render() del componente envuelto en un Error Boundary (try/catch).
   * @private
   */
  _safeRender() {
    // @ts-ignore
    if (typeof this.render !== 'function') return;

    // DX Linter: Detección de Anti-Patrones (Re-renders excesivos)
    const now = performance.now();
    if (this._lastRenderTime > 0 && (now - this._lastRenderTime) < 50) {
      this._renderCount++;
      if (this._renderCount > 3) {
        console.warn(
          `⚠️ [MitaDOM DX Linter] El componente <${this.tagName.toLowerCase()}> se está re-renderizando demasiado rápido (Múltiples veces en menos de 50ms).\n` +
          `👉 Diagnóstico: Esto freirá el CPU y causará parpadeos. Si estás haciendo animaciones o cambiando datos frecuentes, NO uses this.render() ni this.innerHTML.\n` +
          `💡 Solución: Usa el patrón "Granular Light DOM" suscribiéndote a un Signal y modificando solo el textContent o style específico.`
        );
      }
    } else {
      // Reset si pasó tiempo
      this._renderCount = 1; 
    }
    this._lastRenderTime = now;

    try {
      // @ts-ignore
      this.render();
    } catch (error) {
      console.error(`[MitaDOM Error Boundary] Error al renderizar <${this.tagName.toLowerCase()}>:`, error);
      
      // Fallback UI
      // @ts-ignore
      if (typeof this.fallbackUI === 'function') {
        // @ts-ignore
        this.innerHTML = this.fallbackUI(error);
      } else {
        // UI por defecto para el error
        this.innerHTML = `
          <div style="padding: 1rem; margin: 1rem 0; border: 1px solid #fca5a5; background-color: #fef2f2; color: #991b1b; border-radius: 0.5rem; font-family: system-ui, sans-serif;">
            <h4 style="margin: 0 0 0.5rem 0; font-weight: bold;">⚠️ Error en Componente</h4>
            <p style="margin: 0; font-size: 0.875rem;">${error.message}</p>
          </div>
        `;
      }
    }
  }

  /**
   * Ciclo de vida: Eliminación del DOM
   */
  disconnectedCallback() {
    // DX: Ciclo de vida en español
    // @ts-ignore
    if (typeof this.alDesmontar === 'function') {
      // @ts-ignore
      this.alDesmontar();
    }
  }
}

