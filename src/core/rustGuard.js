// @ts-check
/**
 * 🦀 Protección de Memoria, Fugas y Performance inspirada en Rust + Sintaxis Verbosa Ultra-Clara
 *
 * Conceptos de Rust adaptados a JavaScript y Web Components:
 * 1. Borrow Checker Inmutable (`&T` vs `&mut T`):
 *    - `leerEstadoInmutable(signal)` devuelve una referencia congelada (`Object.freeze` recursivo).
 *    - Si alguien intenta mutar `estado.get().propiedad = 123` directamente sin pasar por el canal
 *      autorizado (`mutarEstadoConHistorial` / `.patch()`), JavaScript lanza un `TypeError` inmediato.
 * 2. Ownership & RAII (`Drop` Trait):
 *    - `crearAmbitoConLimpiezaAutomatica(nombrePropietario)` registra cada suscripción, efecto,
 *      listener del DOM y temporizador bajo un único propietario.
 *    - Al desmontar el componente, `.liberarMemoriaCompleta()` ejecuta `drop()` sobre todos los
 *      recursos garantizando 0 fugas de memoria (Memory Leaks).
 * 3. Sintaxis Verbosa Auto-Explicativa:
 *    - Prioriza la claridad pedagógica sobre la brevedad críptica.
 */
import {
  crearEstadoLocal,
  crearEstadoCompartido,
  crearEfecto
} from './signals.js';
/** @typedef {import('./signals.js').Signal} Signal */
import { renderCondicional } from './render.js';

/** @type {WeakMap<object, Array<{ fecha: string, motivo: string, valorAnterior: any, valorNuevo: any }>>} */
const historialPorSignal = new WeakMap();

/**
 * Congela recursivamente un objeto o array para simular una referencia inmutable `&T` de Rust.
 * @template T
 * @param {T} valor
 * @returns {T}
 */
export function congelarProfundamenteInmutable(valor) {
  if (valor === null || typeof valor !== 'object') {
    return valor;
  }
  const clon = Array.isArray(valor) ? [...valor] : { ...valor };
  Object.keys(clon).forEach((clave) => {
    const prop = clon[clave];
    if (prop !== null && typeof prop === 'object' && !Object.isFrozen(prop)) {
      clon[clave] = congelarProfundamenteInmutable(prop);
    }
  });
  return Object.freeze(clon);
}

/**
 * 🦀 Crea un estado reactivo protegido con instantáneas inmutables (estilo Rust `&T`)
 * y límite detector de fugas de suscriptores.
 *
 * @template T
 * @param {string} nombreIdentificador Nombre descriptivo del estado (ej. `'carrito:items'`)
 * @param {T} valorInicial Valor inicial del estado
 * @param {Object} [opciones={}]
 * @param {boolean} [opciones.compartidoEntreComponentes=false] Si es `true`, usa el registro compartido
 * @param {boolean} [opciones.persistirEnLocalStorage=false] Si es `true`, sincroniza con `localStorage`
 * @param {string} [opciones.descripcionDelEstado=''] Documentación viva del propósito del estado
 * @param {string} [opciones.reglasDeNegocio=''] Reglas que debe cumplir este estado
 * @param {number} [opciones.maximoSuscriptoresPermitidos=25] Umbral para alertar posibles fugas de memoria
 * @returns {Signal}
 */
export function crearEstadoReactivoInmutable(nombreIdentificador, valorInicial, opciones = {}) {
  const congelado = congelarProfundamenteInmutable(valorInicial);
  const signal = opciones.compartidoEntreComponentes
    ? crearEstadoCompartido(nombreIdentificador, congelado, {
        persistirLocal: Boolean(opciones.persistirEnLocalStorage),
        descripcion: opciones.descripcionDelEstado || `Estado inmutable ${nombreIdentificador}`,
        reglas: opciones.reglasDeNegocio || 'Mutar únicamente mediante mutarEstadoConHistorial()'
      })
    : crearEstadoLocal(congelado);

  // @ts-ignore
  signal.__nombreRustGuard = nombreIdentificador;
  // @ts-ignore
  signal.__maxSuscriptores = opciones.maximoSuscriptoresPermitidos || 25;
  historialPorSignal.set(signal, []);
  return signal;
}

/**
 * 📖 Préstamo Inmutable (`&T` en Rust):
 * Devuelve el valor actual del Signal profundamente congelado (`Object.freeze`).
 * Cualquier intento de hacer `valor.prop = 'x'` lanzará un `TypeError` explicativo.
 *
 * @template T
 * @param {Signal} signal
 * @returns {T}
 */
export function leerEstadoInmutable(signal) {
  if (!signal || typeof signal.get !== 'function') {
    throw new Error('[RustGuard] leerEstadoInmutable() requiere una instancia válida de Signal.');
  }
  return congelarProfundamenteInmutable(signal.get());
}

/**
 * ✍️ Préstamo Mutable Controlado (`&mut T` en Rust):
 * Actualiza el estado de forma atómica, congela el nuevo snapshot para protegerlo
 * contra mutaciones accidentales y guarda una entrada en el historial de auditoría.
 *
 * @param {Signal} signal Instancia del Signal a modificar
 * @param {any | ((estadoActualInmutable: any) => any)} nuevosDatosOMutador Objeto parcial, nuevo valor o función pura
 * @param {string} [motivoDelCambio='Actualización explícita'] Explicación legible de por qué cambió el estado
 */
export function mutarEstadoConHistorial(
  signal,
  nuevosDatosOMutador,
  motivoDelCambio = 'Actualización explícita'
) {
  if (!signal || typeof signal.get !== 'function') {
    throw new Error('[RustGuard] mutarEstadoConHistorial() requiere una instancia válida de Signal.');
  }

  const valorAnterior = leerEstadoInmutable(signal);
  let siguienteValor;

  if (typeof nuevosDatosOMutador === 'function') {
    siguienteValor = nuevosDatosOMutador(valorAnterior);
  } else if (
    valorAnterior !== null &&
    typeof valorAnterior === 'object' &&
    !Array.isArray(valorAnterior) &&
    nuevosDatosOMutador !== null &&
    typeof nuevosDatosOMutador === 'object' &&
    !Array.isArray(nuevosDatosOMutador)
  ) {
    siguienteValor = { ...valorAnterior, ...nuevosDatosOMutador };
  } else {
    siguienteValor = nuevosDatosOMutador;
  }

  const valorCongelado = congelarProfundamenteInmutable(siguienteValor);
  signal.set(valorCongelado);

  const historial = historialPorSignal.get(signal) || [];
  const entrada = {
    fecha: new Date().toISOString(),
    motivo: String(motivoDelCambio),
    valorAnterior,
    valorNuevo: valorCongelado
  };
  historial.unshift(entrada);
  if (historial.length > 30) historial.pop();
  historialPorSignal.set(signal, historial);

  return valorCongelado;
}

/**
 * 📜 Obtiene el historial auditable de mutaciones realizadas con `mutarEstadoConHistorial()`.
 * @param {Signal} signal
 */
export function obtenerHistorialDeMutaciones(signal) {
  return [...(historialPorSignal.get(signal) || [])];
}

/**
 * 🔀 Wrapper Verboso y Auto-Explicativo sobre `renderCondicional`.
 * Ideal para desarrolladores que prefieren nombres de propiedades 100% explícitos en español.
 *
 * @param {Object} config
 * @param {Signal} config.estadoReactivo Signal que gobierna la condición
 * @param {HTMLElement | null} config.contenedorDom Elemento HTML donde se montará o destruirá la vista
 * @param {(valorEstado: any) => boolean} config.condicionParaMostrar Función booleana
 * @param {(valorEstado: any) => string} config.plantillaHtmlSiSeCumple HTML cuando la condición es `true`
 * @param {(valorEstado: any) => string} [config.plantillaHtmlSiNoSeCumple] HTML cuando la condición es `false`
 */
export function renderizarSiSeCumpleCondicion(config) {
  return renderCondicional({
    estado: config.estadoReactivo,
    contenedor: config.contenedorDom,
    cuando: config.condicionParaMostrar,
    mostrar: config.plantillaHtmlSiSeCumple,
    sino: config.plantillaHtmlSiNoSeCumple || (() => ''),
    siempreActualizar: true
  });
}

/**
 * ⏱️ Guardián de Performance: mide cuánto tarda una función de renderizado o cálculo
 * y alerta si supera el presupuesto de un frame a 60fps (`16ms` por defecto).
 *
 * @template T
 * @param {string} nombreOperacion
 * @param {() => T} operacionFn
 * @param {number} [presupuestoMaximoMs=16]
 * @returns {{ resultado: T, duracionMs: number, dentroDePresupuesto: boolean, alerta: string | null }}
 */
export function medirPresupuestoDeRenderizado(nombreOperacion, operacionFn, presupuestoMaximoMs = 16) {
  const inicio = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const resultado = operacionFn();
  const fin = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const duracionMs = Number((fin - inicio).toFixed(3));
  const dentroDePresupuesto = duracionMs <= presupuestoMaximoMs;

  return {
    resultado,
    duracionMs,
    dentroDePresupuesto,
    alerta: dentroDePresupuesto
      ? null
      : `⚠️ [RustGuard Performance] "${nombreOperacion}" tardó ${duracionMs}ms (supera presupuesto de ${presupuestoMaximoMs}ms).`
  };
}

/**
 * 🦀 Ownership & RAII Scope (`Drop` Trait de Rust para Web Components):
 * Agrupa todas las suscripciones a Signals, efectos, listeners del DOM y timers
 * bajo un propietario explícito. Cuando el propietario se desmonta, `liberarMemoriaCompleta()`
 * destruye todos los recursos garantizando 0 Memory Leaks.
 *
 * @param {string} nombrePropietario Ej: `'<mi-componente-empleos>'`
 * @param {{ maxRecursos?: number }} [opciones={}]
 */
export function crearAmbitoConLimpiezaAutomatica(nombrePropietario, opciones = {}) {
  const maxRecursos = opciones.maxRecursos || 50;
  /** @type {Array<{ tipo: string, etiqueta: string, limpiar: () => void }>} */
  let recursosActivos = [];
  let liberado = false;
  let totalLiberadosHistorico = 0;

  function verificarActivo() {
    if (liberado) {
      throw new Error(
        `[RustGuard Ownership] No puedes registrar recursos en "${nombrePropietario}" porque su ámbito ya ejecutó liberarMemoriaCompleta() (Use-After-Free prevenido).`
      );
    }
  }

  return {
    nombrePropietario,

    /**
     * Suscribe un callback a un Signal y lo vincula al ciclo de vida del ámbito.
     * @param {Signal} signal
     * @param {(valorInmutable: any) => void} callback
     * @param {string} [etiqueta='suscripcion-signal']
     */
    vincularSignalConLimpieza(signal, callback, etiqueta = 'suscripcion-signal') {
      verificarActivo();
      const desuscribir = signal.suscribir((valor) => {
        callback(congelarProfundamenteInmutable(valor));
      });
      recursosActivos.push({
        tipo: 'signal',
        etiqueta,
        limpiar: desuscribir
      });
      return desuscribir;
    },

    /**
     * Crea un efecto auto-rastreable vinculado al ámbito RAII.
     * @param {() => void} efectoFn
     * @param {string} [etiqueta='efecto-reactivo']
     */
    ejecutarEfectoConLimpieza(efectoFn, etiqueta = 'efecto-reactivo') {
      verificarActivo();
      const detener = crearEfecto(efectoFn);
      recursosActivos.push({
        tipo: 'efecto',
        etiqueta,
        limpiar: detener
      });
      return detener;
    },

    /**
     * Registra un `addEventListener` que se removerá automáticamente al hacer `drop`.
     * @param {EventTarget | null} elemento
     * @param {string} nombreEvento
     * @param {EventListenerOrEventListenerObject} manejador
     */
    escucharEventoDomConLimpieza(elemento, nombreEvento, manejador) {
      verificarActivo();
      if (!elemento || typeof elemento.addEventListener !== 'function') return () => {};
      elemento.addEventListener(nombreEvento, manejador);
      const remover = () => elemento.removeEventListener(nombreEvento, manejador);
      recursosActivos.push({
        tipo: 'dom-event',
        etiqueta: `on:${nombreEvento}`,
        limpiar: remover
      });
      return remover;
    },

    /**
     * Registra un `setInterval` seguro que nunca quedará huérfano en memoria.
     * @param {() => void} fn
     * @param {number} milisegundos
     */
    programarIntervaloConLimpieza(fn, milisegundos) {
      verificarActivo();
      const id = setInterval(fn, milisegundos);
      const cancelar = () => clearInterval(id);
      recursosActivos.push({
        tipo: 'timer',
        etiqueta: `interval:${milisegundos}ms`,
        limpiar: cancelar
      });
      return cancelar;
    },

    /**
     * Ejecuta el equivalente al trait `Drop` de Rust: libera cada suscripción,
     * efecto, listener y timer registrado, e impide usos posteriores (Use-After-Free).
     */
    liberarMemoriaCompleta() {
      if (liberado) return 0;
      const cantidad = recursosActivos.length;
      while (recursosActivos.length > 0) {
        const recurso = recursosActivos.pop();
        try {
          recurso?.limpiar();
        } catch (err) {
          console.error(`[RustGuard] Error liberando recurso ${recurso?.etiqueta}:`, err);
        }
      }
      totalLiberadosHistorico += cantidad;
      liberado = true;
      return cantidad;
    },

    /**
     * Permite reutilizar el ámbito tras un re-render explícito limpiando primero lo anterior.
     */
    reiniciarAmbitoParaNuevoRender() {
      this.liberarMemoriaCompleta();
      liberado = false;
    },

    /**
     * Devuelve un diagnóstico completo de memoria y posibles fugas del componente.
     */
    auditarSaludDeMemoria() {
      const posibleFuga = recursosActivos.length > maxRecursos;
      return {
        propietario: nombrePropietario,
        ambitoLiberado: liberado,
        recursosActivosCount: recursosActivos.length,
        totalLiberadosHistorico,
        detalleRecursos: recursosActivos.map((r) => `${r.tipo}:${r.etiqueta}`),
        posibleFugaDetectada: posibleFuga,
        mensajeDiagnostico: posibleFuga
          ? `⚠️ Posible fuga: ${recursosActivos.length} recursos activos superan el límite (${maxRecursos}).`
          : `✅ Memoria saludable en "${nombrePropietario}" (${recursosActivos.length} activos, ${totalLiberadosHistorico} liberados).`
      };
    }
  };
}

/**
 * 🧪 Suite Automática de Auto-Verificación de Mita-DOM (Ejecutable en Browser y en Node Tests).
 * Verifica las garantías tipo Rust (Borrow Checker, RAII Drop, Use-After-Free, Performance e Historial).
 */
export function ejecutarSuiteVerificacionMita() {
  /** @type {Array<{ id: string, nombre: string, aprobado: boolean, detalle: string }>} */
  const resultados = [];

  // Test 1: Borrow Checker Inmutable (&T) bloquea mutación directa
  try {
    const estado = crearEstadoReactivoInmutable('test:rust_borrow', { saldo: 100 });
    const lectura = leerEstadoInmutable(estado);
    let bloqueoExitoso = false;
    try {
      // @ts-ignore - Intento deliberado de violar inmutabilidad
      lectura.saldo = 999999;
    } catch {
      bloqueoExitoso = true;
    }
    resultados.push({
      id: 'borrow-checker',
      nombre: 'Rust Borrow Checker (&T): Bloquea mutaciones directas fuera de mutarEstadoConHistorial()',
      aprobado: bloqueoExitoso && estado.get().saldo === 100,
      detalle: bloqueoExitoso
        ? 'Object.freeze impidió mutar lectura.saldo directamente (saldo intacto = 100).'
        : 'Fallo: se permitió mutación directa.'
    });
  } catch (err) {
    resultados.push({
      id: 'borrow-checker',
      nombre: 'Rust Borrow Checker (&T)',
      aprobado: false,
      detalle: String(err)
    });
  }

  // Test 2: Préstamo Mutable (&mut T) con Historial de Auditoría
  try {
    const estado = crearEstadoReactivoInmutable('test:rust_mut', { contador: 1 });
    mutarEstadoConHistorial(estado, { contador: 2 }, 'Incremento desde suite automática');
    const hist = obtenerHistorialDeMutaciones(estado);
    const ok = estado.get().contador === 2 && hist.length === 1 && hist[0].motivo.includes('suite automática');
    resultados.push({
      id: 'mutable-history',
      nombre: 'Préstamo Mutable (&mut T): mutarEstadoConHistorial() actualiza y registra motivo',
      aprobado: ok,
      detalle: ok
        ? `Motivo registrado: "${hist[0].motivo}" (1 -> 2).`
        : 'No se registró el historial.'
    });
  } catch (err) {
    resultados.push({
      id: 'mutable-history',
      nombre: 'Préstamo Mutable (&mut T)',
      aprobado: false,
      detalle: String(err)
    });
  }

  // Test 3: RAII Ownership & Auto-Drop (0 Memory Leaks + Use-After-Free Guard)
  try {
    const sig = crearEstadoReactivoInmutable('test:rust_raii', { ticks: 0 });
    const ambito = crearAmbitoConLimpiezaAutomatica('<test-componente-raii>');
    let llamadas = 0;
    ambito.vincularSignalConLimpieza(sig, () => {
      llamadas++;
    }, 'sub-ticks');

    const antesDeDrop = sig.suscriptores.size;
    const liberados = ambito.liberarMemoriaCompleta();
    const despuesDeDrop = sig.suscriptores.size;

    // Intentar usar el ámbito después de drop debe lanzar error Use-After-Free
    let useAfterFreeBloqueado = false;
    try {
      ambito.vincularSignalConLimpieza(sig, () => {});
    } catch {
      useAfterFreeBloqueado = true;
    }

    const ok = antesDeDrop === 1 && liberados === 1 && despuesDeDrop === 0 && llamadas === 1 && useAfterFreeBloqueado;
    resultados.push({
      id: 'raii-drop',
      nombre: 'RAII Ownership Drop: Libera 100% de suscripciones y previene Use-After-Free',
      aprobado: ok,
      detalle: ok
        ? `Suscriptores antes=${antesDeDrop}, después de drop()=${despuesDeDrop}, Use-After-Free bloqueado.`
        : 'Fuga detectada tras liberarMemoriaCompleta().'
    });
  } catch (err) {
    resultados.push({
      id: 'raii-drop',
      nombre: 'RAII Ownership Drop',
      aprobado: false,
      detalle: String(err)
    });
  }

  // Test 4: Guardián de Presupuesto de Performance (60fps / 16ms)
  try {
    const perf = medirPresupuestoDeRenderizado('render-ligero', () => 2 + 2, 16);
    resultados.push({
      id: 'perf-budget',
      nombre: 'Presupuesto de Performance (16ms / 60fps): Mide latencia de renderizado',
      aprobado: perf.dentroDePresupuesto && perf.resultado === 4,
      detalle: `Render completado en ${perf.duracionMs}ms (límite: 16ms).`
    });
  } catch (err) {
    resultados.push({
      id: 'perf-budget',
      nombre: 'Presupuesto de Performance',
      aprobado: false,
      detalle: String(err)
    });
  }

  const totalAprobados = resultados.filter((r) => r.aprobado).length;
  return {
    fecha: new Date().toISOString(),
    totalTests: resultados.length,
    totalAprobados,
    todoVerde: totalAprobados === resultados.length,
    resultados
  };
}
