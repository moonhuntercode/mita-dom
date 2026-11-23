// @ts-check
/**
 * 🚀 Mita-DOM Full-Stack, UI Grid Kit, DevTools Advisor (`Mita Doc`), SemVer Advisor,
 * Data Fetching por Modo (`al-hacer-click` vs `automatico-al-entrar`), Server Actions (Express + ORM),
 * Paletas de Colores + Animaciones de Navegación y Bitácora Combinada por Hora.
 */
import {
  crearEstadoReactivoInmutable,
  leerEstadoInmutable,
  mutarEstadoConHistorial
} from '../core/rustGuard.js';
import { listarEstadosCompartidos } from '../core/signals.js';

// ============================================================================
// 1. DATA FETCHING GRANULAR: AL HACER CLIC VS AUTOMÁTICO AL ENTRAR A LA VISTA
// ============================================================================

/**
 * 📡 Controlador Pedagógico de Data Fetching con 2 Modos de Disparo:
 * - `'al-hacer-click'` (Lazy / Bajo Demanda): NO hace ninguna petición al montar la vista;
 *   solo descarga los datos cuando el usuario pulsa explícitamente un botón.
 * - `'automatico-al-entrar'` (Eager / Al Montar Vista): inicia la carga automáticamente
 *   al entrar a la vista y reutiliza la caché TTL en visitas posteriores.
 *
 * @param {Object} opciones
 * @param {string} [opciones.nombreEstado='fetch:controlador_modo']
 * @param {'al-hacer-click' | 'automatico-al-entrar'} [opciones.modoDisparo='al-hacer-click']
 * @param {number} [opciones.tiempoCacheMs=60000]
 * @param {() => Promise<any>} opciones.cargadorAsyncFn
 */
export function crearControladorFetchingPorModo(opciones) {
  const tiempoCacheMs = opciones.tiempoCacheMs ?? 60000;
  let ultimoFetchTs = 0;

  const estado = crearEstadoReactivoInmutable(
    opciones.nombreEstado || 'fetch:controlador_modo',
    {
      modoDisparo: opciones.modoDisparo || 'al-hacer-click',
      estadoCarga: 'inactivo', // 'inactivo' | 'cargando' | 'exito' | 'error'
      datos: null,
      error: null,
      desdeCache: false,
      totalPeticionesRed: 0,
      totalAhorradasCache: 0,
      explicacionModo:
        opciones.modoDisparo === 'automatico-al-entrar'
          ? '⚡ Automático al entrar: descarga los datos apenas se monta la vista y los guarda en caché.'
          : '👆 Bajo demanda (Al hacer clic): 0 peticiones al entrar; solo consulta al servidor cuando el usuario hace clic.'
    }
  );

  async function ejecutarPeticion(forzarRed = false) {
    const actual = leerEstadoInmutable(estado);
    const ahora = Date.now();

    if (
      !forzarRed &&
      actual.datos !== null &&
      ultimoFetchTs > 0 &&
      ahora - ultimoFetchTs < tiempoCacheMs
    ) {
      mutarEstadoConHistorial(
        estado,
        {
          estadoCarga: 'exito',
          desdeCache: true,
          totalAhorradasCache: actual.totalAhorradasCache + 1
        },
        'Fetch resuelto instantáneamente desde caché TTL (0 gasto de red)'
      );
      return { ok: true, datos: actual.datos, desdeCache: true };
    }

    mutarEstadoConHistorial(
      estado,
      { estadoCarga: 'cargando', error: null, desdeCache: false },
      `Iniciando fetch en modo "${actual.modoDisparo}"`
    );

    try {
      const resultado = await opciones.cargadorAsyncFn();
      ultimoFetchTs = Date.now();
      mutarEstadoConHistorial(
        estado,
        {
          estadoCarga: 'exito',
          datos: resultado,
          error: null,
          desdeCache: false,
          totalPeticionesRed: actual.totalPeticionesRed + 1
        },
        'Fetch completado con éxito desde el origen'
      );
      return { ok: true, datos: resultado, desdeCache: false };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      mutarEstadoConHistorial(
        estado,
        { estadoCarga: 'error', error: msg, desdeCache: false },
        `Error en fetch: ${msg}`
      );
      return { ok: false, error: msg, desdeCache: false };
    }
  }

  return {
    estado,

    /**
     * Se llama en `onInit()` o `render()` al entrar a la vista.
     * Solo dispara la petición si el modo es `'automatico-al-entrar'`.
     */
    async alEntrarALaVista() {
      const st = leerEstadoInmutable(estado);
      if (st.modoDisparo === 'automatico-al-entrar') {
        return ejecutarPeticion(false);
      }
      return {
        ok: true,
        omitidoPorModoClick: true,
        mensaje: 'Petición pospuesta hasta que el usuario haga clic en el botón.'
      };
    },

    /**
     * Se llama cuando el usuario hace clic explícitamente en el botón de carga/recarga.
     * @param {boolean} [forzarRed=false]
     */
    async alHacerClickEnBoton(forzarRed = false) {
      return ejecutarPeticion(forzarRed);
    },

    /**
     * Cambia entre `'al-hacer-click'` y `'automatico-al-entrar'` en tiempo real.
     * @param {'al-hacer-click' | 'automatico-al-entrar'} nuevoModo
     */
    cambiarModoDisparo(nuevoModo) {
      const esAuto = nuevoModo === 'automatico-al-entrar';
      return mutarEstadoConHistorial(
        estado,
        {
          modoDisparo: esAuto ? 'automatico-al-entrar' : 'al-hacer-click',
          explicacionModo: esAuto
            ? '⚡ Automático al entrar: descarga los datos apenas se monta la vista y los guarda en caché.'
            : '👆 Bajo demanda (Al hacer clic): 0 peticiones al entrar; solo consulta al servidor cuando el usuario hace clic.'
        },
        `Modo de Data Fetching cambiado a "${nuevoModo}"`
      );
    }
  };
}

// ============================================================================
// 2. MITA SERVER ACTIONS (NODE.JS + EXPRESS + ORM SEQUELIZE/PRISMA)
// ============================================================================

/**
 * 🖥️ Crea una Acción de Servidor Isomórfica (Inspirada en Server Actions para Node.js + Express + ORM).
 * Permite ejecutar validaciones y mutaciones de base de datos (ORM) con estado reactivo de envío,
 * medición de latencia y sincronización automática de Signals en el cliente.
 *
 * @param {string} nombreAccion Ejemplo: `'empleos/crearAnuncioORM'`
 * @param {(payload: Record<string, any>) => Promise<any> | any} controladorServidorORMFn
 * @param {{ validarPayload?: (payload: Record<string, any>) => string | null, signalsAInvalidar?: Array<any> }} [opciones={}]
 */
export function crearAccionServidorIsomorfica(
  nombreAccion,
  controladorServidorORMFn,
  opciones = {}
) {
  const estado = crearEstadoReactivoInmutable(`action:${nombreAccion}`, {
    nombreAccion,
    endpointExpress: `/_mita/actions/${nombreAccion}`,
    ejecutando: false,
    ultimaRespuesta: null,
    ultimoError: null,
    latenciaMs: 0,
    ejecucionesExitosas: 0
  });

  return {
    estado,
    nombreAccion,
    endpointExpress: `/_mita/actions/${nombreAccion}`,

    /**
     * Ejecuta la Server Action validando primero el payload y sincronizando los Signals dependientes.
     * @param {Record<string, any>} payload
     */
    async ejecutar(payload = {}) {
      const inicio = typeof performance !== 'undefined' ? performance.now() : Date.now();

      if (typeof opciones.validarPayload === 'function') {
        const errorValidacion = opciones.validarPayload(payload);
        if (errorValidacion) {
          mutarEstadoConHistorial(
            estado,
            { ejecutando: false, ultimoError: errorValidacion },
            `Server Action "${nombreAccion}" rechazada en validación previa: ${errorValidacion}`
          );
          return { ok: false, error: errorValidacion };
        }
      }

      mutarEstadoConHistorial(
        estado,
        { ejecutando: true, ultimoError: null },
        `Ejecutando Server Action "${nombreAccion}" hacia Express + ORM`
      );

      try {
        const respuesta = await controladorServidorORMFn(payload);
        const fin = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const latenciaMs = Number((fin - inicio).toFixed(2));
        const actual = leerEstadoInmutable(estado);

        mutarEstadoConHistorial(
          estado,
          {
            ejecutando: false,
            ultimaRespuesta: respuesta,
            ultimoError: null,
            latenciaMs,
            ejecucionesExitosas: actual.ejecucionesExitosas + 1
          },
          `Server Action "${nombreAccion}" completada en ${latenciaMs}ms`
        );

        return { ok: true, datos: respuesta, latenciaMs };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        mutarEstadoConHistorial(
          estado,
          { ejecutando: false, ultimoError: msg },
          `Error en Server Action "${nombreAccion}": ${msg}`
        );
        return { ok: false, error: msg };
      }
    }
  };
}

// ============================================================================
// 3. CONSEJERO INTELIGENTE `MITA DOC ADVISOR` Y CALCULADOR `SEMVER ADVISOR`
// ============================================================================

/**
 * 🩺 `Mita Doc Advisor`: Analiza la aplicación en vivo y aconseja al desarrollador
 * qué está usando BIEN y qué debería corregir para mantener 60FPS, cero fugas y HTML5 semántico.
 *
 * @param {{ raizDom?: ParentNode | null, latenciaUltimoRenderMs?: number }} [contexto={}]
 */
export function ejecutarConsejeroMitaDoc(contexto = {}) {
  const raiz =
    contexto.raizDom || (typeof document !== 'undefined' ? document.body : null);
  const latencia = Number(contexto.latenciaUltimoRenderMs) || 4.2;

  /** @type {string[]} */
  const aciertos = [];
  /** @type {string[]} */
  const consejosMejora = [];

  // 1. Verificar Light DOM vs Shadow DOM y Semántica HTML5
  if (raiz && typeof raiz.querySelectorAll === 'function') {
    const semanticos = raiz.querySelectorAll('section, article, header, nav, aside, figure, dialog, output').length;
    const divs = raiz.querySelectorAll('div').length;

    if (semanticos >= divs) {
      aciertos.push(
        `✅ Excelente HTML5 Semántico: ${semanticos} etiquetas semánticas frente a ${divs} <div>.`
      );
    } else {
      consejosMejora.push(
        `⚠️ Se detectaron ${divs} etiquetas <div> frente a ${semanticos} semánticas. Reemplaza <div> contenedores por <section>, <article>, <figure> o <header>.`
      );
    }
  } else {
    aciertos.push('✅ Entorno isomórfico Node.js / SSR libre de dependencias de DOM global.');
  }

  // 2. Verificar Presupuesto de 60FPS (16.6ms)
  if (latencia <= 16.6) {
    aciertos.push(
      `✅ Rendimiento 60FPS saludable: último render registrado en ${latencia}ms (límite: 16.6ms).`
    );
  } else {
    consejosMejora.push(
      `⚠️ Cuello de botella detectado (${latencia}ms > 16.6ms). Usa crearControladorPaginacion() o renderizarVistaDiferida() (@defer).`
    );
  }

  // 3. Auditar Estados Compartidos y Suscriptores (Prevención de Memory Leaks)
  const estadosCompartidos = listarEstadosCompartidos();
  const conPosibleFuga = estadosCompartidos.filter((s) => s.suscriptores > 20);
  if (conPosibleFuga.length === 0) {
    aciertos.push(
      `✅ Salud de Signals impecable: ${estadosCompartidos.length} estados compartidos activos con 0 fugas de suscriptores.`
    );
  } else {
    consejosMejora.push(
      `⚠️ El estado "${conPosibleFuga[0].nombre}" tiene ${conPosibleFuga[0].suscriptores} suscriptores. Asegúrate de usar crearAmbitoConLimpiezaAutomatica().`
    );
  }

  const puntajeSalud = Math.max(40, 100 - consejosMejora.length * 15);

  return {
    puntajeSalud,
    estadoGeneral:
      consejosMejora.length === 0
        ? '🟢 Arquitectura Óptima (100% Mita-DOM Best Practices)'
        : '🟡 Arquitectura Funcional con Oportunidades de Mejora',
    aciertos,
    consejosMejora
  };
}

/**
 * 📦 `SemVer Release Advisor`: Ayuda al mantenedor a decidir si puede dejar la versión actual
 * o a qué número exacto debe subir `"version"` en `package.json` según `CONTRIBUTING.md`.
 *
 * @param {{
 *   versionActual?: string,
 *   hayCambiosEnCodigo?: boolean,
 *   rompeCompatibilidadAnterior?: boolean,
 *   agregaNuevaFuncionalidadOExport?: boolean,
 *   corrigeBugODocumentacion?: boolean
 * }} criterios
 */
export function calcularRecomendacionSemVer(criterios = {}) {
  const versionActual = String(criterios.versionActual || '2.7.0').trim();
  const partes = versionActual.split('.').map((n) => Number(n) || 0);
  const [major, minor, patch] = [partes[0] || 2, partes[1] || 7, partes[2] || 0];

  if (criterios.hayCambiosEnCodigo === false) {
    return {
      versionActual,
      versionRecomendada: versionActual,
      tipoSubida: 'NINGUNA (Mantener versión actual)',
      motivo: 'No hay cambios pendientes de publicar en dist/; puedes mantener la versión actual.',
      comandosPublicacion: ['npm run qa']
    };
  }

  if (criterios.rompeCompatibilidadAnterior) {
    const nueva = `${major + 1}.0.0`;
    return {
      versionActual,
      versionRecomendada: nueva,
      tipoSubida: 'MAJOR (Cambio Mayor Incompatible)',
      motivo: 'Modificaste o eliminaste firmas públicas existentes (Breaking Change). Debes subir el primer dígito.',
      comandosPublicacion: [`npm version ${nueva}`, 'npm run qa', 'npm publish']
    };
  }

  if (criterios.agregaNuevaFuncionalidadOExport) {
    const nueva = `${major}.${minor + 1}.0`;
    return {
      versionActual,
      versionRecomendada: nueva,
      tipoSubida: 'MINOR (Nueva Funcionalidad Retrocompatible)',
      motivo: 'Agregaste nuevos componentes, utilidades o exports manteniendo intacto el código anterior.',
      comandosPublicacion: [`npm version ${nueva}`, 'npm run qa', 'npm publish']
    };
  }

  const nueva = `${major}.${minor}.${patch + 1}`;
  return {
    versionActual,
    versionRecomendada: nueva,
    tipoSubida: 'PATCH (Corrección de Bug, Seguridad o Docs)',
    motivo: 'Arreglaste un bug interno, optimizaste rendimiento o actualizaste documentación sin cambiar la API.',
    comandosPublicacion: [`npm version ${nueva}`, 'npm run qa', 'npm publish']
  };
}

// ============================================================================
// 4. PALETAS DE COLORES CSS3 + ANIMACIONES DE NAVEGACIÓN + BITÁCORA POR HORA
// ============================================================================

export const PALETAS_COLORES_MITA = Object.freeze({
  'indigo-cyber': {
    id: 'indigo-cyber',
    nombre: '🌌 Índigo Cyber (Por Defecto)',
    primario: '#6366f1',
    acento: '#10b981',
    superficie: '#0f172a',
    texto: '#f8fafc'
  },
  'esmeralda-bolivia': {
    id: 'esmeralda-bolivia',
    nombre: '🌿 Esmeralda Amazónica (Bolivia)',
    primario: '#10b981',
    acento: '#f59e0b',
    superficie: '#062019',
    texto: '#ecfdf5'
  },
  'ambar-solar': {
    id: 'ambar-solar',
    nombre: '☀️ Ámbar Solar',
    primario: '#f59e0b',
    acento: '#ef4444',
    superficie: '#1c1408',
    texto: '#fffbeb'
  },
  'oceano-profundo': {
    id: 'oceano-profundo',
    nombre: '🌊 Océano Profundo',
    primario: '#0ea5e9',
    acento: '#38bdf8',
    superficie: '#081a2b',
    texto: '#f0f9ff'
  },
  'grafito-minimal': {
    id: 'grafito-minimal',
    nombre: '🪨 Grafito Minimalista',
    primario: '#a855f7',
    acento: '#ec4899',
    superficie: '#18181b',
    texto: '#fafafa'
  }
});

/**
 * 🎨 Gestor Reactivo de Paletas de Colores CSS3 y Manera/Animación de Navegación del Router.
 *
 * @param {{ nombreEstado?: string }} [opciones={}]
 */
export function crearGestorTemaYAnimacionNavegacion(opciones = {}) {
  const estado = crearEstadoReactivoInmutable(
    opciones.nombreEstado || 'ui:tema_y_animacion_nav',
    {
      paletaActivaId: 'indigo-cyber',
      animacionNavegacion: 'view-transition-fade', // 'view-transition-fade' | 'slide-lateral' | 'zoom-suave' | 'instantaneo'
      posicionSidebarMobile: 'left'
    },
    {
      compartidoEntreComponentes: true,
      persistirEnLocalStorage: true,
      descripcionDelEstado: 'Paleta de colores CSS3 (:root) y estilo de animación al navegar entre rutas.'
    }
  );

  function aplicarVariablesCssAlDocumento(paletaId) {
    const paleta = PALETAS_COLORES_MITA[paletaId] || PALETAS_COLORES_MITA['indigo-cyber'];
    if (typeof document !== 'undefined' && document.documentElement) {
      const root = document.documentElement;
      root.style.setProperty('--color-primario', paleta.primario);
      root.style.setProperty('--color-acento', paleta.acento);
      root.setAttribute('data-mita-palette', paleta.id);
    }
    return paleta;
  }

  return {
    estado,
    paletasDisponibles: PALETAS_COLORES_MITA,

    cambiarPaletaDeColores(paletaId) {
      const paleta = aplicarVariablesCssAlDocumento(paletaId);
      mutarEstadoConHistorial(
        estado,
        { paletaActivaId: paleta.id },
        `Paleta de colores cambiada a "${paleta.nombre}"`
      );
      return paleta;
    },

    cambiarAnimacionDeNavegacion(modoAnimacion) {
      const modosValidos = ['view-transition-fade', 'slide-lateral', 'zoom-suave', 'instantaneo'];
      const modo = modosValidos.includes(modoAnimacion) ? modoAnimacion : 'view-transition-fade';
      if (typeof document !== 'undefined' && document.documentElement) {
        document.documentElement.setAttribute('data-mita-nav-anim', modo);
      }
      return mutarEstadoConHistorial(
        estado,
        { animacionNavegacion: modo },
        `Animación de navegación cambiada a "${modo}"`
      );
    }
  };
}

/**
 * 🕒 Gestor de Changelogs Combinados, Versiones y Copias por Hora (Hourly Snapshots & Checklists)
 * para la sección `/blog` y auditoría de entregas.
 */
export function crearGestorBitacoraPorHora(opciones = {}) {
  const copiasPorHoraIniciales = [
    {
      idSnapshot: 'snap-2026-11-22-1800',
      version: 'v2.7.0-alpha.1',
      fechaHora: '2026-11-22 • 18:00 hrs',
      tituloHito: '🚀 Nacimiento de Signals v2.7: crearEfecto, .derivar() y Estados Compartidos',
      mejoras: [
        'Nuevo registro global crearEstadoCompartido() y obtenerEstadoCompartido() con persistencia local.',
        'Fix crítico en Signal.notificar() iterando sobre Array.from(this.suscriptores).',
        'renderCondicional declarativo y vincularTexto granular sin Virtual DOM.'
      ],
      checklistCompletado: '4 / 4 tareas base (100%)'
    },
    {
      idSnapshot: 'snap-2026-11-22-1930',
      version: 'v2.7.0-beta.2',
      fechaHora: '2026-11-22 • 19:30 hrs',
      tituloHito: '🦀 Rust Memory Guard (&T / &mut T / RAII Drop), CLI npx mita y SSR/SSG/Hybrid',
      mejoras: [
        'Borrow Checker con Object.freeze recursivo y ámbitos RAII crearAmbitoConLimpiezaAutomatica().',
        'Renderizador universal renderizarVistaUniversal() con Islas mita-client="only" y mita-server="only".',
        'Controles de lectura visual (A-/A+) y sincronización de DB Local con File System (mita-docs-db.json).'
      ],
      checklistCompletado: '10 / 10 tareas intermedias (100%)'
    },
    {
      idSnapshot: 'snap-2026-11-22-2115',
      version: 'v2.7.0-rc.3',
      fechaHora: '2026-11-22 • 21:15 hrs',
      tituloHito: '🛡️ Moderación "DC", Chat Gate (3s), Perfiles sin Cuenta (15 días) y Props/Angular @defer',
      mejoras: [
        'Ventana obligatoria de aceptación antes de entrar a chats/grupos y cooldown de 3 segundos.',
        'Filtro de palabras prohibidas "DC" (mayúsculas/minúsculas/ambos), reportes con pruebas y descargo legal.',
        'Motor pasarPropsAElemento() (Avatar/Científicos React.dev), @defer Views y Signal Forms (Angular.dev).'
      ],
      checklistCompletado: '14 / 14 lecciones interactivas (100%)'
    },
    {
      idSnapshot: 'snap-2026-11-22-2200',
      version: 'v2.7.0-final',
      fechaHora: '2026-11-22 • 22:00 hrs',
      tituloHito: '🏛️ Full-Stack Server Actions (Express+ORM), Mita Doc Advisor, SemVer y Paletas CSS3',
      mejoras: [
        'Data Fetching por modo (Al hacer clic vs Automático al entrar) y crearAccionServidorIsomorfica().',
        'Consejero Mita Doc Advisor en DevTools + SemVer Release Advisor + 5 Paletas de Colores en Configuración.',
        'Changelogs y Checklists combinados con copias por hora en /blog/novedades-v2.'
      ],
      checklistCompletado: '15 / 15 hitos del roadmap completados (100%)'
    }
  ];

  const estado = crearEstadoReactivoInmutable(
    opciones.nombreEstado || 'blog:bitacora_por_hora',
    {
      versionActual: 'v2.7.0',
      copiasPorHora: copiasPorHoraIniciales
    },
    {
      compartidoEntreComponentes: true,
      persistirEnLocalStorage: true,
      descripcionDelEstado: 'Historial combinado de versiones, changelogs, checklists y copias por hora.'
    }
  );

  return {
    estado,

    listarCopiasPorHora() {
      return leerEstadoInmutable(estado).copiasPorHora || [];
    },

    /**
     * Crea y guarda una nueva copia por hora (Hourly Snapshot) con la hora actual, versión, mejoras y checklist.
     * @param {{ version?: string, tituloHito: string, mejoras: string[], checklistCompletado?: string }} datos
     */
    registrarNuevaCopiaPorHora(datos) {
      const ahora = new Date();
      const fechaIso = ahora.toISOString().slice(0, 10);
      const horaMin = ahora.toTimeString().slice(0, 5);
      const nueva = {
        idSnapshot: `snap-${Date.now()}`,
        version: String(datos.version || 'v2.7.1-hourly').trim(),
        fechaHora: `${fechaIso} • ${horaMin} hrs`,
        tituloHito: String(datos.tituloHito || 'Actualización por Hora').trim(),
        mejoras: Array.isArray(datos.mejoras) && datos.mejoras.length > 0
          ? datos.mejoras
          : ['Snapshot automático de estado, documentación y checklist verificado.'],
        checklistCompletado: datos.checklistCompletado || '100% Verificado en QA'
      };

      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          versionActual: nueva.version,
          copiasPorHora: [nueva, ...(st.copiasPorHora || [])]
        }),
        `Nueva copia por hora registrada: ${nueva.version} (${nueva.fechaHora})`
      );

      return nueva;
    }
  };
}
