// @ts-check
import { mitaResult } from '../utils/result.js';
import { telemetry } from './telemetry.js';
import { renderCondicional } from './render.js';

// Shim isomórfico para permitir importar MitaElement en Node.js (SSR / SSG) sin JSDOM
if (typeof HTMLElement === 'undefined') {
  // @ts-ignore
  globalThis.HTMLElement = class {};
}

/**
 * Clase base MitaElement para crear Web Components Nativos con superpoderes.
 * Proporciona Error Boundaries (try/catch automático en render) y 
 * Telemetría básica (registro de performance).
 * 
 * @extends HTMLElement
 * @property {() => void} [alMontar] Hook de ciclo de vida en español equivalente a connectedCallback
 * @property {() => void} [alDesmontar] Hook de ciclo de vida en español equivalente a disconnectedCallback
 * @property {() => void} [render] Método principal para pintar HTML, protegido por try/catch
 * @property {(error: Error) => string} [fallbackUI] Función que devuelve el HTML a mostrar si `render` falla
 */
export class MitaElement extends HTMLElement {
  constructor() {
    super();
    // DX Linter: Telemetría de renders
    this._renderCount = 0;
    this._lastRenderTime = 0;
    this._innerHTMLCount = 0;
    this._lastInnerHTMLTime = 0;
    /** @type {Array<() => void>} Lista de funciones de limpieza ejecutadas al desmontar */
    this._limpiezas = [];
  }

  /**
   * 🧹 Registra una función de limpieza (ej: desuscripción de Signal, SSE o Timer)
   * que se ejecutará automáticamente cuando el componente salga del DOM.
   * @param {() => void} limpiarFn
   */
  registrarLimpieza(limpiarFn) {
    if (typeof limpiarFn === 'function') {
      this._limpiezas.push(limpiarFn);
    }
  }

  /**
   * 👂 Escucha un Signal y auto-limpia la suscripción al desmontar el componente.
   * @template T
   * @param {{ suscribir: (cb: (val: T) => void) => () => void }} signal
   * @param {(val: T) => void} callback
   * @returns {() => void}
   */
  escucharEstado(signal, callback) {
    const detener = signal.suscribir(callback);
    this.registrarLimpieza(detener);
    return detener;
  }

  /**
   * 🔀 Atajo legible para `renderCondicional` con limpieza automática al desmontar.
   * @param {any} configuracion Objeto `{ estado, contenedor, cuando, mostrar, sino }`
   * @returns {() => void}
   */
  mostrarSi(configuracion) {
    const detener = renderCondicional(configuracion);
    this.registrarLimpieza(detener);
    return detener;
  }

  /**
   * 📡 Emisor estandarizado de eventos de MitaDOM.
   * Simplifica el CustomEvent.
   * @param {string} eventName Nombre del evento (ej: 'change')
   * @param {any} [detail] Payload de datos a transmitir
   */
  emit(eventName, detail = null) {
    this.dispatchEvent(
      new CustomEvent(eventName, {
        detail,
        bubbles: true,
        composed: true
      })
    );
  }

  /**
   * 🎁 Getter reactivo falso para los Props.
   * Permite leer los atributos del HTML (kebab-case a camelCase) 
   * emulando la experiencia de React/SolidJSX.
   * Ej: <mi-tag show-button="true"> -> this.props.showButton
   */
  get props() {
    if (!this._propsProxy) {
      this._propsProxy = new Proxy(this, {
        get(target, prop) {
          if (typeof prop !== 'string') return undefined;
          // camelCase to kebab-case
          const attrName = prop.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
          const val = target.getAttribute(attrName);
          
          // Type casting básico
          if (val === 'true' || val === '') return true;
          if (val === 'false') return false;
          if (!isNaN(Number(val)) && val !== null) return Number(val);
          
          return val;
        }
      });
    }
    return this._propsProxy;
  }

  /**
   * MitaDOM Architecture: Prohíbe el uso de Shadow DOM (Aislamiento Antipatrón).
   * Fuerzala adopción de la "Tríada Perfecta" con Light DOM + @scope.
   */
  attachShadow(_options) {
    console.error(`🚨 [MitaDOM Arquitectura] Has intentado inicializar Shadow DOM en <${this.tagName.toLowerCase()}>.`);
    throw new Error('MitaDOM prohíbe el Shadow DOM. Utiliza Light DOM con CSS @scope para aislar estilos sin romper la accesibilidad ni SEO.');
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
    // 🏝️ Island Architecture (SSR-Only): si fue renderizado solo para servidor, el cliente no lo re-hidrata
    if (typeof this.getAttribute === 'function' && this.getAttribute('mita-server') === 'only') {
      return;
    }

    // Telemetría simple
    const t0 = performance.now();

    // Renderizado seguro (Rust style result pattern)
    this._safeRender();

    // DX: Ciclo de vida en español
    // @ts-ignore
    if (typeof this.alMontar === 'function') {
      const result = mitaResult(() => this.alMontar());
      
      const handleErr = (err) => {
        if (err) {
          console.error(`[MitaDOM] Error en alMontar de <${this.tagName.toLowerCase()}>`, err);
          telemetry.capture({ type: 'COMPONENT_LIFECYCLE_ERROR', component: this.tagName.toLowerCase(), method: 'alMontar', message: err.message, stack: err.stack });
        }
      };

      if (result instanceof Promise) {
        result.then(([err]) => handleErr(err));
      } else {
        const [err] = result;
        handleErr(err);
      }
    }

    const t1 = performance.now();
    const loadTime = t1 - t0;
    
    // Registrar métrica en telemetría si es muy lento (>20ms)
    if (loadTime > 20) {
      telemetry.capture({
        type: 'SLOW_RENDER',
        component: this.tagName.toLowerCase(),
        latency: parseFloat(loadTime.toFixed(2))
      });
    }
  }

  /**
   * Ejecuta el método render() del componente usando el patrón Result (Rust/Go style).
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
          `💡 Solución: Usa el patrón "Granular Light DOM" suscribiéndote a un Signal y modificando solo el textContent o style específico.`
        );
      }
    } else {
      this._renderCount = 1; 
    }
    this._lastRenderTime = now;

    // 🚀 Patrón Result (Rust/Go) en lugar del letal try/catch
    // @ts-ignore
    const result = mitaResult(() => this.render());

    const handleErr = (err) => {
      if (!err) return;
      console.error(`[MitaDOM Error Boundary] Error al renderizar <${this.tagName.toLowerCase()}>:`, err);
      
      // Enviar al Profiler Local
      telemetry.capture({
        type: 'COMPONENT_CRASH',
        component: this.tagName.toLowerCase(),
        message: err.message,
        stack: err.stack
      });

      // Fallback UI
      // @ts-ignore
      if (typeof this.fallbackUI === 'function') {
        // @ts-ignore
        const fallbackRes = mitaResult(() => this.fallbackUI(err));
        
        const applyFallback = (fallbackErr, html) => {
          if (!fallbackErr) {
            this.innerHTML = html;
            return true; // manejado
          }
          return false;
        };

        if (fallbackRes instanceof Promise) {
          fallbackRes.then(([fallbackErr, html]) => {
            if (!applyFallback(fallbackErr, html)) renderDefaultFallback();
          });
          return;
        } else {
          const [fallbackErr, html] = fallbackRes;
          if (applyFallback(fallbackErr, html)) return;
        }
      } 
      
      renderDefaultFallback();
    };

    const renderDefaultFallback = () => {
      const err = result instanceof Promise ? new Error('Render falló de forma asíncrona (ver consola)') : result[0];
      const stackText = err?.stack || err?.message || 'Error desconocido';
      const id = 'err-' + Math.random().toString(36).substr(2, 9);
      this.innerHTML = `
        <div style="padding: 1.5rem; margin: 1rem 0; border: 1px solid #fecaca; background-color: #fef2f2; color: #991b1b; border-radius: 0.5rem; font-family: system-ui, sans-serif; text-align: left;">
          <h4 style="margin: 0 0 0.5rem 0; font-weight: bold; font-size: 1.1rem; display: flex; align-items: center; gap: 0.5rem;">
            <span>⚠️</span> Algo salió mal dibujando este componente
          </h4>
          <p style="margin: 0 0 1rem 0; font-size: 0.9rem; color: #7f1d1d;">
            MitaDOM aisló el error en <code>&lt;${this.tagName.toLowerCase()}&gt;</code> usando el patrón Result.
          </p>
          <details style="background: #fee2e2; padding: 0.75rem; border-radius: 0.375rem; border: 1px solid #fca5a5;">
            <summary style="cursor: pointer; font-size: 0.85rem; font-weight: 600; color: #991b1b; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
              <span>Ver Detalles Técnicos</span>
              <button onclick="navigator.clipboard.writeText(document.getElementById('${id}').innerText).then(()=>this.innerText='¡Copiado!').catch(()=>this.innerText='Error')" style="background: white; border: 1px solid #fca5a5; border-radius: 4px; padding: 2px 6px; font-size: 0.75rem; cursor: pointer; color: #991b1b;">📋 Copiar</button>
            </summary>
            <pre id="${id}" style="margin: 0; font-size: 0.75rem; overflow-x: auto; color: #7f1d1d; white-space: pre-wrap; word-break: break-all;">${stackText}</pre>
          </details>
        </div>
      `;
    };

    if (result instanceof Promise) {
      result.then(([err]) => handleErr(err));
    } else {
      const [err] = result;
      handleErr(err);
    }
  }

  /**
   * Ciclo de vida: Eliminación del DOM
   */
  disconnectedCallback() {
    // Limpieza automática de todas las suscripciones/efectos registrados
    if (Array.isArray(this._limpiezas) && this._limpiezas.length > 0) {
      this._limpiezas.forEach((limpiar) => {
        try {
          limpiar();
        } catch (err) {
          console.error(`[MitaDOM] Error limpiando suscripción en <${this.tagName.toLowerCase()}>:`, err);
        }
      });
      this._limpiezas = [];
    }

    // DX: Ciclo de vida en español
    // @ts-ignore
    if (typeof this.alDesmontar === 'function') {
      const result = mitaResult(() => this.alDesmontar());
      
      const handleErr = (err) => {
        if (err) {
          telemetry.capture({ type: 'COMPONENT_LIFECYCLE_ERROR', component: this.tagName.toLowerCase(), method: 'alDesmontar', message: err.message });
        }
      };

      if (result instanceof Promise) {
        result.then(([err]) => handleErr(err));
      } else {
        const [err] = result;
        handleErr(err);
      }
    }
  }

  /**
   * Ciclo de vida nativo de Web Components: Reacción a atributos observados
   * Se invoca cuando un atributo listado en 'static get observedAttributes()' cambia.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    
    // Si el componente define un hook en español 'alCambiarAtributo', lo usamos
    // @ts-ignore
    if (typeof this.alCambiarAtributo === 'function') {
      const result = mitaResult(() => this.alCambiarAtributo(name, oldValue, newValue));
      const handleErr = (err) => {
        if (err) {
          console.error(`[MitaDOM Error Boundary] Error en alCambiarAtributo de <${this.tagName.toLowerCase()}>:`, err);
        }
      };
      
      if (result instanceof Promise) {
        result.then(([err]) => handleErr(err));
      } else {
        const [err] = result;
        handleErr(err);
      }
    } else {
      // Comportamiento por defecto: si cambian las props y hay Signals que dependen de ellas, 
      // deberíamos notificar, pero en MitaDOM alentamos la mutación granular directa 
      // desde alCambiarAtributo.
    }
  }
}

