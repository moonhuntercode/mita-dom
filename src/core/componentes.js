// @ts-check
import { MitaElement } from './mitaElement.js';

/**
 * Define un nuevo Web Component de forma funcional o basada en opciones (Options API).
 * Provee una excelente Experiencia de Desarrollador (DX) al encapsular la complejidad de las Clases y el Prototype.
 * 
 * @param {string} etiqueta - El nombre del tag HTML (debe incluir un guión, ej: 'mi-boton')
 * @param {Function | Object} setupOuOpciones - Función de setup (Composition API) o un Objeto de configuración (Options API)
 */
export function definirComponente(etiqueta, setupOuOpciones) {
  // Verificamos si la etiqueta ya está registrada para evitar errores
  if (customElements.get(etiqueta)) {
    console.warn(`[MitaDOM] El componente <${etiqueta}> ya está definido.`);
    return;
  }

  // Creamos la clase base dinámicamente
  class ComponenteFuncional extends MitaElement {
    constructor() {
      super();
      /** @type {boolean} Evita ejecuciones múltiples de setup */
      this._inicializado = false;
      /** @type {Object} Estado interno expuesto al template */
      this.estado = {};
    }

    connectedCallback() {
      if (!this._inicializado) {
        // --- 1. ESTILO COMPOSITION API (Función) ---
        // Al estilo "Hooks", pasamos el elemento actual (`this`) para que puedan interactuar con la instancia
        if (typeof setupOuOpciones === 'function') {
          const resultado = setupOuOpciones(this);
          
          if (typeof resultado === 'function') {
            // Si retorna una función, asumimos que es el método `render()`
            this.render = () => {
              this.innerHTML = resultado();
            };
          } else if (typeof resultado === 'object') {
            // Si retorna un objeto, lo exponemos al contexto (this) y renderizamos si existe render
            Object.assign(this, resultado);
          }
        } 
        
        // --- 2. ESTILO OPTIONS API (Objeto) ---
        else if (typeof setupOuOpciones === 'object') {
          const { estado, alMontar, alDesmontar, render } = setupOuOpciones;

          // Asignar estado reactivo si es una función que retorna objeto, o un objeto directo
          if (estado) {
            this.estado = typeof estado === 'function' ? estado() : estado;
          }

          // Asignar ciclo de vida (mapeado a español)
          if (typeof alMontar === 'function') {
            // @ts-ignore
            this.alMontar = alMontar.bind(this);
          }
          if (typeof alDesmontar === 'function') {
            // @ts-ignore
            this.alDesmontar = alDesmontar.bind(this);
          }

          // Asignar renderizador
          if (typeof render === 'function') {
            this.render = () => {
              this.innerHTML = render.call(this, this.estado, this);
            };
          }
        }
        
        this._inicializado = true;
      }
      
      // Llamamos a connectedCallback del padre (MitaElement) para que dispare render() y alMontar()
      super.connectedCallback();
    }
  }

  // Registramos nativamente el componente en el navegador
  customElements.define(etiqueta, ComponenteFuncional);
}
