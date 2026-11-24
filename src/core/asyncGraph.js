// @ts-check
import { crearEstadoLocal, crearEfecto, sinRastrear } from './signals.js';

/**
 * ============================================================================
 * MitaDOM Async Graph + Live Server Functions + Agent Diagnostics (v2.7)
 * Inspirado en lo mejor y más estable de:
 * - SolidJS 2.0 (Async Graph, One Graph Two Machines, live() SSE, Long Hold, Diagnostics para Agentes)
 * - Angular 20 (linkedSignal, resource API y claridad por convención)
 * - React 19 (Server Actions y Optimistic UI con rollback automático)
 * - Vue 3.6 Vapor & Qwik City (Granular DOM sin VDOM + cambio de estrategia de render en 1 línea)
 * ============================================================================
 */

const RUTA_SKILL_AGENTE = 'node_modules/mita-dom/skills/reactivity-diagnostics/SKILL.md';

/**
 * Catálogo estable de códigos de diagnóstico diseñados para humanos y Agentes IA.
 */
export const CATALOGO_DIAGNOSTICOS_AGENTE = Object.freeze({
  MITA_LECTURA_SIN_RASTREO: {
    codigo: 'MITA_LECTURA_SIN_RASTREO',
    equivalenteSolid2: 'STRICT_READ_UNTRACKED',
    severidad: 'warning',
    mensaje: 'Leíste un Signal fuera de un ámbito reactivo (crearEfecto / crearMemoAsincrono / suscribir); la UI no se actualizará.',
    solucion: 'Mueve signal.get() dentro de crearEfecto(() => ...), this.vincularTexto(...) o crearMemoAsincrono(...).',
    guiaAgente: `${RUTA_SKILL_AGENTE}#mita_lectura_sin_rastreo`
  },
  MITA_ESPERA_PROLONGADA: {
    codigo: 'MITA_ESPERA_PROLONGADA',
    equivalenteSolid2: 'LONG_HOLD',
    severidad: 'warning',
    mensaje: 'Un cómputo asíncrono lleva demasiado tiempo en estado pendiente (Long Hold), reteniendo datos antiguos en pantalla.',
    solucion: 'Muestra un indicador visible cuando estaPendiente() sea true, revisa índices MySQL/API o habilita caché/prefetch.',
    guiaAgente: `${RUTA_SKILL_AGENTE}#mita_espera_prolongada`
  },
  MITA_CASCADA_ASINCRONA: {
    codigo: 'MITA_CASCADA_ASINCRONA',
    equivalenteSolid2: 'ASYNC_WATERFALL',
    severidad: 'warning',
    mensaje: 'Se detectaron múltiples peticiones asíncronas encadenadas secuencialmente (Waterfall).',
    solucion: 'Agrupa consultas independientes con Promise.all() o consolida la consulta en una sola Server Function en Express.',
    guiaAgente: `${RUTA_SKILL_AGENTE}#mita_cascada_asincrona`
  },
  MITA_BUCLE_EFECTO: {
    codigo: 'MITA_BUCLE_EFECTO',
    equivalenteSolid2: 'EFFECT_LOOP',
    severidad: 'error',
    mensaje: 'Un efecto está mutando el mismo Signal que lee, generando re-ejecuciones en bucle.',
    solucion: 'Reemplaza el efecto por un estado derivado (signal.derivar()) o por crearEstadoVinculado() (linkedSignal).',
    guiaAgente: `${RUTA_SKILL_AGENTE}#mita_bucle_efecto`
  },
  MITA_SIN_LIMPIEZA_DOM: {
    codigo: 'MITA_SIN_LIMPIEZA_DOM',
    equivalenteSolid2: 'MISSING_CLEANUP',
    severidad: 'warning',
    mensaje: 'Suscripción, intervalo o stream creado sin registrar limpieza en disconnectedCallback.',
    solucion: 'Usa this.escucharEstado(), this.vincularTexto(), this.registrarLimpieza() o crearAmbitoConLimpiezaAutomatica().',
    guiaAgente: `${RUTA_SKILL_AGENTE}#mita_sin_limpieza_dom`
  },
  MITA_RENDER_DUPLICADO: {
    codigo: 'MITA_RENDER_DUPLICADO',
    equivalenteSolid2: 'DUPLICATE_RENDER',
    severidad: 'warning',
    mensaje: 'Se invocó this.render() manualmente dentro de alMontar(), provocando un doble pintado innecesario.',
    solucion: 'Inicializa tu estado en alCrear() o alAntesDeRenderizar(); MitaElement ya invoca render() automáticamente antes de alMontar().',
    guiaAgente: `${RUTA_SKILL_AGENTE}#mita_render_duplicado`
  }
});

/** @type {Array<{ codigo: string, equivalenteSolid2: string, severidad: string, origen: string, detalle: string, mensaje: string, solucion: string, guiaAgente: string, timestamp: string }>} */
const registroDiagnosticosAgente = [];

/**
 * 🤖 Emite un diagnóstico estructurado legible tanto por desarrolladores como por Agentes IA.
 *
 * @param {keyof typeof CATALOGO_DIAGNOSTICOS_AGENTE} codigo
 * @param {{ origen?: string, detalle?: string, silencioso?: boolean }} [contexto]
 */
export function emitirDiagnosticoAgente(codigo, contexto = {}) {
  const plantilla = CATALOGO_DIAGNOSTICOS_AGENTE[codigo];
  if (!plantilla) {
    throw new Error(`[MitaDOM] Código de diagnóstico desconocido: "${String(codigo)}"`);
  }

  const entrada = {
    ...plantilla,
    origen: contexto.origen || 'MitaDOM Runtime',
    detalle: contexto.detalle || '',
    timestamp: new Date().toISOString()
  };

  registroDiagnosticosAgente.push(entrada);
  if (registroDiagnosticosAgente.length > 50) {
    registroDiagnosticosAgente.shift();
  }

  if (!contexto.silencioso) {
    const metodo = entrada.severidad === 'error' ? console.error : console.warn;
    metodo(
      `[${entrada.codigo}] ${entrada.mensaje}${entrada.detalle ? ` (${entrada.detalle})` : ''}\n` +
      `  en ${entrada.origen}\n` +
      `  solución: ${entrada.solucion}\n` +
      `  agent repair guide: ${entrada.guiaAgente}`
    );
  }

  return entrada;
}

/**
 * 📋 Devuelve una copia inmutable del historial de diagnósticos emitidos para humanos/Agentes IA.
 */
export function obtenerDiagnosticosAgente() {
  return registroDiagnosticosAgente.map((item) => ({ ...item }));
}

/**
 * 🧹 Limpia el historial de diagnósticos (útil en tests y DevTools).
 */
export function limpiarDiagnosticosAgente() {
  registroDiagnosticosAgente.length = 0;
}

/**
 * ⚡ Solid 2.0 Async Graph + Angular `resource()`:
 * Crea un cómputo asíncrono reactivo que:
 * - Rastrea automáticamente cualquier Signal leído antes del `await`.
 * - Cancela automáticamente race conditions (solo aplica la última respuesta).
 * - Preserva el valor anterior (UI *stale* sin parpadeo) mientras `estaPendiente()` es `true`.
 * - Dispara el diagnóstico `[MITA_ESPERA_PROLONGADA]` (`LONG_HOLD`) si excede el umbral.
 *
 * @template T
 * @param {(ctx: { signal: AbortSignal }) => Promise<T> | T} fnAsincrona
 * @param {{ valorInicial?: T | null, umbralEsperaProlongadaMs?: number, nombre?: string, silenciosoDiagnostico?: boolean }} [opciones]
 */
export function crearMemoAsincrono(fnAsincrona, opciones = {}) {
  const {
    valorInicial = null,
    umbralEsperaProlongadaMs = 2500,
    nombre = 'crearMemoAsincrono',
    silenciosoDiagnostico = true
  } = opciones;

  const estado = crearEstadoLocal({
    valor: /** @type {T | null} */ (valorInicial),
    pendiente: false,
    error: /** @type {string | null} */ (null),
    esperaProlongada: false,
    version: 0,
    latenciaMs: 0
  });

  let solicitudActivaId = 0;
  /** @type {AbortController | null} */
  let controladorActivo = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timerLongHold = null;
  let destruido = false;

  const limpiarTimer = () => {
    if (timerLongHold !== null) {
      clearTimeout(timerLongHold);
      timerLongHold = null;
    }
  };

  const ejecutarCalculo = () => {
    if (destruido) return;

    if (controladorActivo) {
      controladorActivo.abort();
    }
    limpiarTimer();

    solicitudActivaId += 1;
    const miSolicitudId = solicitudActivaId;
    controladorActivo = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const t0 = performance.now();

    let resultado;
    try {
      // Ejecutar síncronamente dentro de crearEfecto para que se rastreen los Signals leídos antes del primer await
      resultado = fnAsincrona({
        signal: /** @type {AbortSignal} */ (controladorActivo ? controladorActivo.signal : undefined)
      });
    } catch (errSync) {
      sinRastrear(() => {
        estado.patch({
          pendiente: false,
          esperaProlongada: false,
          error: errSync instanceof Error ? errSync.message : String(errSync)
        });
      });
      return;
    }

    if (!resultado || typeof /** @type {any} */ (resultado).then !== 'function') {
      sinRastrear(() => {
        estado.patch({
          valor: /** @type {T} */ (resultado),
          pendiente: false,
          esperaProlongada: false,
          error: null,
          version: estado.get().version + 1,
          latenciaMs: Number((performance.now() - t0).toFixed(2))
        });
      });
      return;
    }

    sinRastrear(() => {
      estado.patch({
        pendiente: true,
        esperaProlongada: false,
        error: null
      });
    });

    if (umbralEsperaProlongadaMs > 0) {
      timerLongHold = setTimeout(() => {
        if (destruido || miSolicitudId !== solicitudActivaId) return;
        sinRastrear(() => {
          estado.patch({ esperaProlongada: true });
        });
        emitirDiagnosticoAgente('MITA_ESPERA_PROLONGADA', {
          origen: nombre,
          detalle: `superó ${umbralEsperaProlongadaMs}ms esperando respuesta`,
          silencioso: silenciosoDiagnostico
        });
      }, umbralEsperaProlongadaMs);
    }

    Promise.resolve(resultado).then(
      (datos) => {
        if (destruido || miSolicitudId !== solicitudActivaId) return; // Cancelar race condition obsoleta
        limpiarTimer();
        sinRastrear(() => {
          estado.patch({
            valor: /** @type {T} */ (datos),
            pendiente: false,
            esperaProlongada: false,
            error: null,
            version: estado.get().version + 1,
            latenciaMs: Number((performance.now() - t0).toFixed(2))
          });
        });
      },
      (err) => {
        if (destruido || miSolicitudId !== solicitudActivaId) return;
        limpiarTimer();
        sinRastrear(() => {
          estado.patch({
            pendiente: false,
            esperaProlongada: false,
            error: err instanceof Error ? err.message : String(err),
            latenciaMs: Number((performance.now() - t0).toFixed(2))
          });
        });
      }
    );
  };

  const detenerEfecto = crearEfecto(() => {
    ejecutarCalculo();
  });

  return {
    estado,
    valor: () => estado.get().valor,
    estaPendiente: () => estado.get().pendiente,
    esperaProlongada: () => estado.get().esperaProlongada,
    error: () => estado.get().error,
    reintentar: () => ejecutarCalculo(),
    destruir: () => {
      destruido = true;
      limpiarTimer();
      if (controladorActivo) controladorActivo.abort();
      detenerEfecto();
      estado.destroy();
    }
  };
}

/**
 * 🔗 Angular 20 `linkedSignal` + Solid 2.0 Cascading Signal:
 * Crea un estado escribible cuyo valor se recalcula/resetea automáticamente cuando cambia su fuente padre.
 * Ideal para selects en cascada (ej. Departamento -> Ciudad seleccionada por defecto).
 *
 * @template TFuente
 * @template TValor
 * @param {() => TFuente} leerFuente Función que lee uno o más Signals padre
 * @param {(valorFuente: TFuente, valorAnterior: TValor | undefined) => TValor} calcularValor
 */
export function crearEstadoVinculado(leerFuente, calcularValor) {
  let inicializado = false;
  /** @type {TValor | undefined} */
  let ultimoValor;
  /** @type {any} */
  let estado = null;

  const detener = crearEfecto(() => {
    const fuente = leerFuente();
    // Leemos `ultimoValor` sin llamar `estado.get()` para evitar auto-rastrear el propio estado vinculado
    const calculado = calcularValor(fuente, ultimoValor);
    ultimoValor = calculado;
    if (!inicializado) {
      estado = crearEstadoLocal(calculado);
      inicializado = true;
    } else if (estado) {
      estado.set(calculado);
    }
  });

  return {
    estado,
    get: () => /** @type {TValor} */ (estado.get()),
    set: (nuevoValor) => {
      ultimoValor = nuevoValor;
      return estado.set(nuevoValor);
    },
    suscribir: (cb) => estado.suscribir(cb),
    destruir: () => {
      detener();
      if (estado) estado.destroy();
    }
  };
}

/**
 * 🛡️ Solid 2.0 Speculative State + React 19 `useOptimistic`:
 * Aplica un cambio inmediato en la UI y revierte automáticamente al último valor confirmado
 * por el servidor si la operación remota falla.
 *
 * @template T
 * @param {T} valorInicial
 */
export function crearEstadoOptimistaConRollback(valorInicial) {
  let ultimoValorConfirmado = valorInicial;

  const estado = crearEstadoLocal({
    valor: valorInicial,
    valorConfirmado: valorInicial,
    estaConfirmando: false,
    seHizoRollback: false,
    ultimoError: /** @type {string | null} */ (null)
  });

  return {
    estado,
    valor: () => estado.get().valor,
    /**
     * @param {T} valorOptimista Valor a mostrar de inmediato en pantalla
     * @param {() => Promise<T | void>} mutacionServidor Llamada al servidor (autoridad de verdad)
     */
    async aplicarConServidor(valorOptimista, mutacionServidor) {
      estado.patch({
        valor: valorOptimista,
        estaConfirmando: true,
        seHizoRollback: false,
        ultimoError: null
      });

      try {
        const respuestaServidor = await mutacionServidor();
        const valorFinal = respuestaServidor !== undefined ? /** @type {T} */ (respuestaServidor) : valorOptimista;
        ultimoValorConfirmado = valorFinal;
        estado.patch({
          valor: valorFinal,
          valorConfirmado: valorFinal,
          estaConfirmando: false,
          seHizoRollback: false,
          ultimoError: null
        });
        return { ok: true, valor: valorFinal, rollback: false };
      } catch (err) {
        const mensaje = err instanceof Error ? err.message : String(err);
        estado.patch({
          valor: ultimoValorConfirmado,
          valorConfirmado: ultimoValorConfirmado,
          estaConfirmando: false,
          seHizoRollback: true,
          ultimoError: mensaje
        });
        return { ok: false, valor: ultimoValorConfirmado, rollback: true, error: mensaje };
      }
    },
    destruir: () => estado.destroy()
  };
}

/**
 * 🌐 Solid 2.0 Server Function (RPC Isomórfico Request/Response):
 * Envuelve una función de servidor (Express/Node) con estado reactivo, validación y medición de latencia.
 *
 * @template TPayload
 * @template TResultado
 * @param {string} nombre Nombre único (ej. 'menu/crearPlato')
 * @param {(payload: TPayload) => Promise<TResultado> | TResultado} handlerServidor
 * @param {{ validar?: (payload: TPayload) => string | null, endpoint?: string }} [opciones]
 */
export function crearFuncionServidor(nombre, handlerServidor, opciones = {}) {
  const endpoint = opciones.endpoint || `/_mita/fn/${nombre}`;
  const estado = crearEstadoLocal({
    nombre,
    endpoint,
    pendiente: false,
    datos: /** @type {TResultado | null} */ (null),
    error: /** @type {string | null} */ (null),
    latenciaMs: 0,
    invocaciones: 0
  });

  return {
    nombre,
    endpoint,
    estado,
    /**
     * @param {TPayload} payload
     */
    async ejecutar(payload) {
      if (typeof opciones.validar === 'function') {
        const errVal = opciones.validar(payload);
        if (errVal) {
          estado.patch({ pendiente: false, error: errVal });
          return { ok: false, datos: null, error: errVal, latenciaMs: 0 };
        }
      }

      const t0 = performance.now();
      estado.patch({ pendiente: true, error: null });

      try {
        const datos = await handlerServidor(payload);
        const latenciaMs = Number((performance.now() - t0).toFixed(2));
        estado.patch({
          pendiente: false,
          datos,
          error: null,
          latenciaMs,
          invocaciones: estado.get().invocaciones + 1
        });
        return { ok: true, datos, error: null, latenciaMs };
      } catch (err) {
        const latenciaMs = Number((performance.now() - t0).toFixed(2));
        const mensaje = err instanceof Error ? err.message : String(err);
        estado.patch({ pendiente: false, error: mensaje, latenciaMs });
        return { ok: false, datos: null, error: mensaje, latenciaMs };
      }
    },
    destruir: () => estado.destroy()
  };
}

/**
 * 📡 Solid 2.0 `live(async function* ...)` — Server Function en Tiempo Real (SSE / Async Iterator):
 * Consume un generador asíncrono (`async function*`) y expone cada `yield` directamente en un Signal.
 *
 * @template T
 * @param {string} nombre Identificador del stream (ej. 'cocina/pedidosEnVivo')
 * @param {(...args: any[]) => AsyncGenerator<T, void, unknown>} generadorAsync
 */
export function crearFuncionServidorEnVivo(nombre, generadorAsync) {
  const estado = crearEstadoLocal({
    nombre,
    conectado: false,
    valor: /** @type {T | null} */ (null),
    ticks: 0,
    error: /** @type {string | null} */ (null)
  });

  let activo = false;
  /** @type {AsyncGenerator<T, void, unknown> | null} */
  let iteradorActual = null;

  const detener = async () => {
    activo = false;
    estado.patch({ conectado: false });
    if (iteradorActual && typeof iteradorActual.return === 'function') {
      try {
        await iteradorActual.return();
      } catch {
        // Ignorar cierre limpio del generador
      }
    }
    iteradorActual = null;
  };

  /**
   * @param {...any} args
   */
  const iniciar = async (...args) => {
    await detener();
    activo = true;
    estado.patch({ conectado: true, error: null });

    try {
      iteradorActual = generadorAsync(...args);
      for await (const dato of iteradorActual) {
        if (!activo) break;
        estado.patch({
          valor: dato,
          ticks: estado.get().ticks + 1,
          error: null
        });
      }
      if (activo) {
        activo = false;
        estado.patch({ conectado: false });
      }
    } catch (err) {
      activo = false;
      estado.patch({
        conectado: false,
        error: err instanceof Error ? err.message : String(err)
      });
    }
  };

  return {
    nombre,
    estado,
    ultimoValor: () => estado.get().valor,
    iniciar,
    detener,
    destruir: () => {
      detener();
      estado.destroy();
    }
  };
}

/**
 * 🌐 Catálogo claro de las 5 estrategias de renderizado soportadas por MitaDOM
 * (combinando SPA, SSR, SSG, Hybrid Islands y Qwik Resumability).
 */
export const ESTRATEGIAS_RENDER_MITA = Object.freeze({
  CSR: {
    codigo: 'CSR',
    titulo: 'Client-Side Rendering (SPA Pura)',
    servidorExpress: 'Sirve index.html ligero; el navegador descarga datos vía fetch/Signals.',
    hidratacion: 'Total en cliente',
    idealPara: 'Dashboards privados, editores, paneles Admin sin SEO.'
  },
  SSR: {
    codigo: 'SSR',
    titulo: 'Server-Side Rendering (HTML fresco por petición)',
    servidorExpress: 'Express ejecuta onInit() + render() en cada GET y devuelve HTML con SEO real.',
    hidratacion: 'Hidratación de eventos en cliente',
    idealPara: 'Anuncios de empleo, perfiles dinámicos, precios en tiempo real con SEO.'
  },
  SSG: {
    codigo: 'SSG',
    titulo: 'Static Site Generation (Pre-render en Build)',
    servidorExpress: 'Se genera HTML estático al compilar (npm run build:ssg) servido desde CDN/disco a ~1ms.',
    hidratacion: 'Mínima o cero',
    idealPara: 'Documentación, blogs, landings, políticas legales.'
  },
  HYBRID: {
    codigo: 'HYBRID',
    titulo: 'Hybrid + Islas (SSR/SSG + mita-client="only" / mita-server="only")',
    servidorExpress: 'HTML estático/SSR para el 90% de la página; solo las islas interactivas corren JS.',
    hidratacion: 'Selectiva por isla',
    idealPara: 'E-commerce, restaurantes (menú estático + carrito interactivo), portales de docs.'
  },
  RESUMABLE: {
    codigo: 'RESUMABLE',
    titulo: 'Resumable / Diferido (Estilo Qwik + @defer)',
    servidorExpress: 'Serializa estado mínimo en HTML y solo importa JS cuando el usuario interactúa o hace scroll.',
    hidratacion: 'Bajo demanda (0 KB iniciales en interacción diferida)',
    idealPara: 'Sitios móviles en redes lentas (3G/Bolivia) con máxima velocidad TTI.'
  }
});

/** @type {Map<string, { ruta: string, estrategia: keyof typeof ESTRATEGIAS_RENDER_MITA, cacheSegundos: number, descripcion: string }>} */
const mapaEstrategiasRutas = new Map();

/**
 * 🧭 Define o cambia en 1 línea la estrategia de renderizado para una ruta específica.
 *
 * @param {string} ruta Ej. '/empleos', '/docs', '/admin'
 * @param {keyof typeof ESTRATEGIAS_RENDER_MITA} estrategia
 * @param {{ cacheSegundos?: number }} [opciones]
 */
export function definirEstrategiaRenderRuta(ruta, estrategia, opciones = {}) {
  const clave = /** @type {keyof typeof ESTRATEGIAS_RENDER_MITA} */ (String(estrategia).toUpperCase());
  const info = ESTRATEGIAS_RENDER_MITA[clave];
  if (!info) {
    throw new Error(
      `[MitaDOM] Estrategia desconocida "${estrategia}". Usa una de: ${Object.keys(ESTRATEGIAS_RENDER_MITA).join(', ')}`
    );
  }

  const entrada = {
    ruta,
    estrategia: clave,
    cacheSegundos: opciones.cacheSegundos ?? (clave === 'SSG' ? 86400 : clave === 'SSR' ? 0 : 60),
    descripcion: info.titulo
  };
  mapaEstrategiasRutas.set(ruta, entrada);
  return { ...entrada, detalles: info };
}

/**
 * 🔄 Alias explícito y ultra-legible para cambiar la estrategia de una ruta existente.
 * @param {string} ruta
 * @param {keyof typeof ESTRATEGIAS_RENDER_MITA} nuevaEstrategia
 * @param {{ cacheSegundos?: number }} [opciones]
 */
export function cambiarEstrategiaRender(ruta, nuevaEstrategia, opciones = {}) {
  return definirEstrategiaRenderRuta(ruta, nuevaEstrategia, opciones);
}

/**
 * 📋 Lista todas las rutas configuradas con su estrategia de render activa.
 */
export function obtenerMapaEstrategiasRender() {
  return Array.from(mapaEstrategiasRutas.values()).map((item) => ({
    ...item,
    detalles: ESTRATEGIAS_RENDER_MITA[item.estrategia]
  }));
}
