// @ts-check
import { mitaResult } from '../utils/result.js';
import { telemetry } from './telemetry.js';
import { renderCondicional, vincularTexto } from './render.js';

// Shim isomórfico para permitir importar MitaElement en Node.js (SSR / SSG) sin JSDOM
if (typeof HTMLElement === 'undefined') {
  // @ts-ignore
  globalThis.HTMLElement = class {};
}

/**
 * Clase base MitaElement para crear Web Components Nativos con ciclo de vida completo y legible.
 *
 * Orden garantizado del ciclo de vida:
 * 1. `alCrear()` — Constructor (inicializar `crearEstadoLocal`, sin depender aún del DOM).
 * 2. `alAntesDeRenderizar()` — Justo antes del primer `render()` al conectar al DOM.
 * 3. `render()` — Pinta el Light DOM una vez, protegido con Error Boundary (`fallbackUI` / `alError`).
 * 4. `alMontar()` — DOM ya montado (`this.querySelector` garantizado): enlazar `vincularTexto`, `escucharEstado`, `mostrarSi` y eventos.
 * 5. `alCambiarAtributo(nombre, antes, ahora)` / `alCambiarProp(propCamel, antes, ahora)` — Cambios en `observedAttributes`.
 * 6. `alActualizar(motivo)` — Tras `this.solicitarActualizacion(motivo)`.
 * 7. Auto-limpieza de `this._limpiezas` + `alDesmontar()` — Al salir del DOM (0 fugas de memoria).
 *
 * @extends HTMLElement
 * @property {() => void} [alCrear] Hook inicial ejecutado en el constructor
 * @property {() => void} [alAntesDeRenderizar] Hook ejecutado justo antes del primer render()
 * @property {() => void | string | Promise<void | string>} [render] Método principal para pintar HTML, protegido por Error Boundary
 * @property {() => void | Promise<void>} [alMontar] Hook de ciclo de vida en español equivalente a connectedCallback post-render
 * @property {(nombre: string, valorAnterior: string | null, valorNuevo: string | null) => void} [alCambiarAtributo] Hook nativo cuando cambia un atributo observado
 * @property {(nombreProp: string, valorAnterior: string | null, valorNuevo: string | null) => void} [alCambiarProp] Hook ergonómico en camelCase cuando cambia un atributo observado
 * @property {(motivo: string) => void} [alActualizar] Hook ejecutado tras `solicitarActualizacion(motivo)`
 * @property {() => void | Promise<void>} [alDesmontar] Hook de ciclo de vida en español equivalente a disconnectedCallback
 * @property {(error: Error, fase: string) => void} [alError] Hook opcional para capturar errores de cualquier fase
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
    /** @type {'creado' | 'renderizando' | 'montado' | 'actualizado' | 'desmontado' | 'error'} */
    this._faseCiclo = 'creado';
    this._estaMontado = false;

    // 1. Fase alCrear() (segura en constructor)
    // @ts-ignore
    if (typeof this.alCrear === 'function') {
      const [err] = /** @type {[Error | null, any]} */ (mitaResult(() => this.alCrear()));
      if (err) {
        this._reportarErrorFase('alCrear', err);
      }
    }
  }

  /**
   * Reporta un error de ciclo de vida a telemetría y al hook opcional `alError(error, fase)`.
   * @private
   * @param {string} fase
   * @param {Error} err
   */
  _reportarErrorFase(fase, err) {
    this._faseCiclo = 'error';
    const tag = (this.tagName || 'mita-element').toLowerCase();
    console.error(`[MitaDOM] Error en ${fase} de <${tag}>:`, err);
    telemetry.capture({
      type: 'COMPONENT_LIFECYCLE_ERROR',
      component: tag,
      method: fase,
      message: err.message,
      stack: err.stack
    });
    // @ts-ignore
    if (typeof this.alError === 'function') {
      mitaResult(() => this.alError(err, fase));
    }
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
   * 🎯 Vincula un Signal directamente al `textContent` de un selector CSS o nodo DOM
   * (Granular Light DOM estilo Vue Vapor / Solid) y lo limpia automáticamente al desmontar.
   * @template T
   * @param {any} signal Signal reactivo
   * @param {string | HTMLElement | null} selectorONodo Selector CSS dentro del componente o nodo DOM
   * @param {(valor: T) => string} [formateador] Formateador opcional
   * @returns {() => void}
   */
  vincularTexto(signal, selectorONodo, formateador) {
    const nodo =
      typeof selectorONodo === 'string' && typeof this.querySelector === 'function'
        ? /** @type {HTMLElement | null} */ (this.querySelector(selectorONodo))
        : /** @type {HTMLElement | null} */ (selectorONodo);
    const detener = vincularTexto(signal, nodo, formateador);
    this.registrarLimpieza(detener);
    return detener;
  }

  /**
   * 🔄 Re-ejecuta `render()` bajo Error Boundary y dispara `alActualizar(motivo)`.
   * Usar solo para cambios estructurales; para texto/clases prefiere `vincularTexto()` o `escucharEstado()`.
   * @param {string} [motivo='manual']
   */
  solicitarActualizacion(motivo = 'manual') {
    this._safeRender();
    this._faseCiclo = 'actualizado';
    // @ts-ignore
    if (typeof this.alActualizar === 'function') {
      const result = mitaResult(() => this.alActualizar(motivo));
      if (result instanceof Promise) {
        result.then(([err]) => {
          if (err) this._reportarErrorFase('alActualizar', err);
        });
      } else {
        const [err] = result;
        if (err) this._reportarErrorFase('alActualizar', err);
      }
    }
  }

  /**
   * 🩺 Devuelve un snapshot legible del estado actual del ciclo de vida del componente.
   * @returns {{ componente: string, faseActual: string, montado: boolean, renders: number, limpiezasPendientes: number }}
   */
  obtenerCicloDeVida() {
    return {
      componente: (this.tagName || 'mita-element').toLowerCase(),
      faseActual: this._faseCiclo,
      montado: this._estaMontado,
      renders: this._renderCount,
      limpiezasPendientes: this._limpiezas.length
    };
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

    // 2. Fase alAntesDeRenderizar() (prepara datos síncronos antes del primer render)
    // @ts-ignore
    if (typeof this.alAntesDeRenderizar === 'function') {
      const [errAntes] = /** @type {[Error | null, any]} */ (mitaResult(() => this.alAntesDeRenderizar()));
      if (errAntes) {
        this._reportarErrorFase('alAntesDeRenderizar', errAntes);
      }
    }

    // 3. Renderizado seguro (Rust style result pattern)
    this._faseCiclo = 'renderizando';
    this._safeRender();
    this._estaMontado = true;
    this._faseCiclo = 'montado';

    // 4. DX: Ciclo de vida en español post-render (DOM ya disponible)
    // @ts-ignore
    if (typeof this.alMontar === 'function') {
      const result = mitaResult(() => this.alMontar());

      const handleErr = (err) => {
        if (err) {
          this._reportarErrorFase('alMontar', err);
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
    this._estaMontado = false;
    this._faseCiclo = 'desmontado';

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
          this._reportarErrorFase('alDesmontar', err);
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
   * Ciclo de vida nativo de Web Components: Reacción a atributos observados.
   * Invoca `alCambiarAtributo(name, oldValue, newValue)` y `alCambiarProp(propCamelCase, oldValue, newValue)`.
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;

    const invocarHook = (metodo, nombreArg) => {
      // @ts-ignore
      if (typeof this[metodo] !== 'function') return;
      // @ts-ignore
      const result = mitaResult(() => this[metodo](nombreArg, oldValue, newValue));
      const handleErr = (err) => {
        if (err) this._reportarErrorFase(metodo, err);
      };
      if (result instanceof Promise) {
        result.then(([err]) => handleErr(err));
      } else {
        const [err] = result;
        handleErr(err);
      }
    };

    invocarHook('alCambiarAtributo', name);

    const nombreCamel = String(name).replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
    invocarHook('alCambiarProp', nombreCamel);
  }
}

