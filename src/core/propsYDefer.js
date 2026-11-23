// @ts-check
/**
 * 🧩 Motor Opinionado de Props para Web Components (Estilo React.dev `Passing Props to a Component`)
 * + Vistas Diferidas (`@defer` de Angular.dev) + Formularios Reactivos con Signals (`Signal Forms` de Angular.dev).
 *
 * Prioriza la claridad absoluta, el tipado explícito y la protección de memoria tipo Rust.
 */
import {
  crearEstadoReactivoInmutable,
  leerEstadoInmutable,
  mutarEstadoConHistorial,
  congelarProfundamenteInmutable
} from './rustGuard.js';

/** @type {WeakMap<Element, Record<string, any>>} */
const propsPorElemento = new WeakMap();

/**
 * 👩‍🔬 Helper Oficial del Tutorial "Pasando Props a un Componente" (Inspirado en `react.dev/learn/passing-props-to-a-component`).
 * Construye la URL de imagen del científico a partir de `person.imageId` y `size` (`'s'` o `'b'`).
 *
 * @param {{ name?: string, nombre?: string, imageId: string }} person
 * @param {'s' | 'b' | string} [size='s']
 * @returns {string}
 */
export function obtenerUrlImagenCientifico(person, size = 's') {
  const imageId = String(person?.imageId || 'YfeOqp2').trim();
  const sufijo = size === 'b' || Number(size) > 90 ? 'b' : 's';
  return `https://react.dev/images/docs/scientists/${imageId}${sufijo}.jpg`;
}

/**
 * Catálogo oficial de científicos para demos y tests del tutorial de Props.
 */
export const CIENTIFICOS_DEMO = Object.freeze([
  Object.freeze({
    name: 'Katsuko Saruhashi',
    imageId: 'YfeOqp2',
    size: 100,
    profesion: 'Geoquímica japonesa',
    logro: 'Desarrolló el método para medir dióxido de carbono en agua de mar.'
  }),
  Object.freeze({
    name: 'Aklilu Lemma',
    imageId: 'OKS67lh',
    size: 80,
    profesion: 'Médico y patólogo etíope',
    logro: 'Descubrió un tratamiento natural contra la esquistosomiasis.'
  }),
  Object.freeze({
    name: 'Lin Lanying',
    imageId: '1bX5QH6',
    size: 50,
    profesion: 'Física e ingeniera china',
    logro: 'Pionera en materiales semiconductores aeroespaciales.'
  })
]);

/**
 * 📦 Pasa un objeto de Props rico (objetos anidados, números, booleanos, funciones) a un Web Component
 * en Light DOM y dispara su actualización reactiva si el componente define `render()`.
 *
 * Ejemplo equivalente a `<Avatar size={100} person={{ name: 'Katsuko Saruhashi', imageId: 'YfeOqp2' }} />`:
 * ```js
 * pasarPropsAElemento(avatarEl, {
 *   size: 100,
 *   person: { name: 'Katsuko Saruhashi', imageId: 'YfeOqp2' }
 * });
 * ```
 *
 * @param {Element | null} elemento
 * @param {Record<string, any>} nuevasProps
 */
export function pasarPropsAElemento(elemento, nuevasProps = {}) {
  if (!elemento) return {};
  const previas = propsPorElemento.get(elemento) || {};
  const fusionadas = congelarProfundamenteInmutable({
    ...previas,
    ...nuevasProps
  });
  propsPorElemento.set(elemento, fusionadas);

  // Sincronizar atributos primitivos para inspección limpia en el DOM
  Object.entries(nuevasProps).forEach(([clave, valor]) => {
    if (typeof valor === 'string' || typeof valor === 'number' || typeof valor === 'boolean') {
      elemento.setAttribute(clave, String(valor));
    }
  });

  // @ts-ignore
  if (typeof elemento.render === 'function' && elemento.isConnected) {
    // @ts-ignore
    elemento.render();
  }
  return fusionadas;
}

/**
 * 📖 Lee las props de un Web Component combinando:
 * 1) Valores por defecto (`valoresPorDefecto`),
 * 2) Atributos HTML declarativos (`size="100"`, `data-person='{"name":"..."}'`),
 * 3) Objetos pasados con `pasarPropsAElemento()`.
 *
 * @template {Record<string, any>} T
 * @param {Element | null} elemento
 * @param {T} [valoresPorDefecto]
 * @returns {Readonly<T>}
 */
export function leerPropsDeElemento(elemento, valoresPorDefecto = /** @type {any} */ ({})) {
  const resultado = { ...valoresPorDefecto };
  if (!elemento) return congelarProfundamenteInmutable(resultado);

  // 1. Leer atributos HTML si coinciden con las claves de valoresPorDefecto o `data-props`
  const jsonPropsAttr = elemento.getAttribute('data-props');
  if (jsonPropsAttr) {
    try {
      Object.assign(resultado, JSON.parse(jsonPropsAttr));
    } catch {
      // Ignorar JSON malformado en atributo
    }
  }

  Object.keys(valoresPorDefecto).forEach((clave) => {
    const attrVal =
      elemento.getAttribute(clave) ??
      elemento.getAttribute(clave.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase());
    if (attrVal !== null && attrVal !== undefined) {
      const tipoEsperado = typeof valoresPorDefecto[clave];
      if (tipoEsperado === 'number') {
        resultado[clave] = Number(attrVal) || valoresPorDefecto[clave];
      } else if (tipoEsperado === 'boolean') {
        resultado[clave] = attrVal !== 'false' && attrVal !== '0';
      } else if (tipoEsperado === 'object' && attrVal.trim().startsWith('{')) {
        try {
          resultado[clave] = JSON.parse(attrVal);
        } catch {
          // Mantener valor por defecto
        }
      } else {
        resultado[clave] = attrVal;
      }
    }
  });

  // 2. Fusionar con props pasadas por objeto JS (`pasarPropsAElemento`)
  const propsMemoria = propsPorElemento.get(elemento);
  if (propsMemoria) {
    Object.assign(resultado, propsMemoria);
  }

  return congelarProfundamenteInmutable(resultado);
}

// ============================================================================
// 2. VISTAS DIFERIDAS (`@defer` de Angular.dev adaptado a Mita-DOM Light DOM)
// ============================================================================

/**
 * ⏳ Renderiza una Vista Diferida (Inspirado en `Deferrable Views / @defer` de `angular.dev/tutorials/deferrable-views`).
 * Permite mostrar primero un `@placeholder` ligero, luego un estado `@loading` cuando se dispara
 * el evento (`'interaccion' | 'temporizador' | 'inmediato'`), y finalmente el contenido pesado o `@error`.
 *
 * @param {Object} config
 * @param {HTMLElement | null} config.contenedor Elemento donde se montará el bloque diferido
 * @param {'interaccion' | 'temporizador' | 'inmediato'} [config.disparador='interaccion'] Cuándo iniciar la carga
 * @param {number} [config.demoraMs=600] Tiempo para el disparador `'temporizador'`
 * @param {() => string} config.plantillaPlaceholder HTML inicial antes de disparar (`@placeholder`)
 * @param {() => string} [config.plantillaCargando] HTML mientras resuelve la promesa (`@loading`)
 * @param {() => Promise<string> | string} config.cargarContenidoDiferido Función que devuelve el HTML final
 * @param {(err: Error) => string} [config.plantillaError] HTML si ocurre un fallo (`@error`)
 */
export function renderizarVistaDiferida(config) {
  const contenedor = config.contenedor;
  if (!contenedor) {
    return {
      estado: null,
      dispararCargaAhora: async () => {},
      reiniciarAPlaceholder: () => {},
      limpiar: () => {}
    };
  }

  const estadoDiferido = crearEstadoReactivoInmutable('defer:vista_local', {
    fase: 'placeholder', // 'placeholder' | 'loading' | 'completado' | 'error'
    htmlFinal: '',
    mensajeError: null
  });

  const pintarFase = () => {
    const st = leerEstadoInmutable(estadoDiferido);
    if (st.fase === 'placeholder') {
      contenedor.innerHTML = config.plantillaPlaceholder
        ? config.plantillaPlaceholder()
        : '<section data-defer-phase="placeholder">Haz clic para cargar la vista diferida (@placeholder)</section>';
    } else if (st.fase === 'loading') {
      contenedor.innerHTML = config.plantillaCargando
        ? config.plantillaCargando()
        : '<section data-defer-phase="loading">⏳ Cargando módulo diferido (@loading)...</section>';
    } else if (st.fase === 'completado') {
      contenedor.innerHTML = st.htmlFinal;
    } else if (st.fase === 'error') {
      const errObj = new Error(st.mensajeError || 'Error en vista diferida');
      contenedor.innerHTML = config.plantillaError
        ? config.plantillaError(errObj)
        : `<section data-defer-phase="error">❌ Error al cargar vista diferida: ${errObj.message}</section>`;
    }
  };

  const desuscribir = estadoDiferido.suscribir(pintarFase);

  async function dispararCargaAhora() {
    const actual = leerEstadoInmutable(estadoDiferido);
    if (actual.fase === 'loading' || actual.fase === 'completado') return;

    mutarEstadoConHistorial(estadoDiferido, { fase: 'loading', mensajeError: null }, 'Iniciando @defer loading');
    try {
      const html = await config.cargarContenidoDiferido();
      mutarEstadoConHistorial(
        estadoDiferido,
        { fase: 'completado', htmlFinal: String(html || '') },
        'Vista diferida @defer completada'
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      mutarEstadoConHistorial(
        estadoDiferido,
        { fase: 'error', mensajeError: msg },
        `Error en @defer: ${msg}`
      );
    }
  }

  function reiniciarAPlaceholder() {
    mutarEstadoConHistorial(
      estadoDiferido,
      { fase: 'placeholder', htmlFinal: '', mensajeError: null },
      'Reinicio de vista diferida a @placeholder'
    );
  }

  let timerId = null;
  const onInteraccion = () => {
    if (leerEstadoInmutable(estadoDiferido).fase === 'placeholder') {
      dispararCargaAhora();
    }
  };

  if (config.disparador === 'inmediato') {
    dispararCargaAhora();
  } else if (config.disparador === 'temporizador') {
    timerId = setTimeout(() => dispararCargaAhora(), config.demoraMs ?? 600);
  } else {
    contenedor.addEventListener('click', onInteraccion);
  }

  return {
    estado: estadoDiferido,
    dispararCargaAhora,
    reiniciarAPlaceholder,
    limpiar() {
      if (timerId) clearTimeout(timerId);
      contenedor.removeEventListener('click', onInteraccion);
      desuscribir();
    }
  };
}

// ============================================================================
// 3. SIGNAL FORMS (`angular.dev/tutorials/signal-forms` adaptado a Mita-DOM)
// ============================================================================

/**
 * 📝 Crea un Formulario Reactivo Basado en Signals (Inspirado en `Signal Forms` de `angular.dev/tutorials/signal-forms`).
 * Cada campo mantiene su valor, estado `tocado`, mensaje de error y validez en tiempo real dentro de un Signal inmutable.
 *
 * @param {Record<string, {
 *   valorInicial?: any,
 *   requerido?: boolean,
 *   minLongitud?: number,
 *   patronRegex?: string,
 *   validadorPersonalizado?: (valor: any) => string | null
 * }>} definicionCampos
 * @param {string} [nombreEstado='form:signal_form_reactivo']
 */
export function crearFormularioReactivoConSignals(
  definicionCampos,
  nombreEstado = 'form:signal_form_reactivo'
) {
  function evaluarCampo(nombre, valor, reglas) {
    const str = String(valor ?? '').trim();
    if (reglas.requerido && !str) {
      return { esValido: false, error: `El campo "${nombre}" es obligatorio.` };
    }
    if (reglas.minLongitud && str.length < reglas.minLongitud) {
      return {
        esValido: false,
        error: `"${nombre}" requiere al menos ${reglas.minLongitud} caracteres (actual: ${str.length}).`
      };
    }
    if (reglas.patronRegex && !new RegExp(reglas.patronRegex).test(str)) {
      return { esValido: false, error: `Formato inválido en "${nombre}".` };
    }
    if (typeof reglas.validadorPersonalizado === 'function') {
      const msg = reglas.validadorPersonalizado(valor);
      if (msg) return { esValido: false, error: msg };
    }
    return { esValido: true, error: null };
  }

  function construirEstadoInicial() {
    /** @type {Record<string, { valor: any, tocado: boolean, esValido: boolean, error: string | null }>} */
    const campos = {};
    let todoValido = true;

    for (const [nombre, reglas] of Object.entries(definicionCampos || {})) {
      const val = reglas.valorInicial ?? '';
      const check = evaluarCampo(nombre, val, reglas);
      if (!check.esValido) todoValido = false;
      campos[nombre] = {
        valor: val,
        tocado: false,
        esValido: check.esValido,
        error: check.error
      };
    }

    return {
      campos,
      esFormularioValido: todoValido,
      enviosExitososCount: 0
    };
  }

  const estado = crearEstadoReactivoInmutable(nombreEstado, construirEstadoInicial());

  return {
    estado,

    /**
     * Actualiza el valor de un campo y recalcula instantáneamente la validez del campo y del formulario completo.
     * @param {string} nombreCampo
     * @param {any} nuevoValor
     */
    establecerValorCampo(nombreCampo, nuevoValor) {
      const reglas = definicionCampos[nombreCampo] || {};
      const check = evaluarCampo(nombreCampo, nuevoValor, reglas);

      return mutarEstadoConHistorial(
        estado,
        (actual) => {
          const nuevosCampos = {
            ...actual.campos,
            [nombreCampo]: {
              valor: nuevoValor,
              tocado: true,
              esValido: check.esValido,
              error: check.error
            }
          };
          const todoValido = Object.values(nuevosCampos).every((c) => c.esValido);
          return {
            ...actual,
            campos: nuevosCampos,
            esFormularioValido: todoValido
          };
        },
        `Signal Form: campo "${nombreCampo}" actualizado`
      );
    },

    /**
     * Devuelve un objeto plano inmutable con `{ [nombreCampo]: valor }`.
     */
    obtenerValoresInmutables() {
      const st = leerEstadoInmutable(estado);
      /** @type {Record<string, any>} */
      const plano = {};
      for (const [k, info] of Object.entries(st.campos || {})) {
        plano[k] = info.valor;
      }
      return congelarProfundamenteInmutable(plano);
    },

    /**
     * Intenta procesar el envío del Signal Form: si todo es válido incrementa `enviosExitososCount` y devuelve los datos.
     */
    procesarEnvio() {
      const st = leerEstadoInmutable(estado);
      if (!st.esFormularioValido) {
        const primerError = Object.values(st.campos || {}).find((c) => !c.esValido)?.error;
        return {
          ok: false,
          erroresPresentes: true,
          motivo: primerError || 'Completa los campos requeridos.'
        };
      }

      mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          enviosExitososCount: (actual.enviosExitososCount || 0) + 1
        }),
        'Signal Form enviado con éxito'
      );

      return {
        ok: true,
        valores: this.obtenerValoresInmutables()
      };
    },

    reiniciarFormulario() {
      return mutarEstadoConHistorial(
        estado,
        construirEstadoInicial(),
        'Signal Form reiniciado a valores iniciales'
      );
    }
  };
}
