// @ts-check
/**
 * 🛡️ Librería UI (Paginación + Data Fetching con Caché), Perfiles sin Cuenta con Huella Local
 * de Dispositivo (Cooldown de 15 días), Chat/Grupos con Ventana Obligatoria de Aceptación (Cooldown 3s)
 * y Moderación Integral de Anuncios (Filtro "DC" mayúsculas/minúsculas/ambos, CRUD obligatorio de
 * Categorías, Badge "No Verificado", Descargo Legal, Reportes con Pruebas y Borrado por Usuario/Empresa).
 */
import {
  crearEstadoReactivoInmutable,
  leerEstadoInmutable,
  mutarEstadoConHistorial
} from '../core/rustGuard.js';

/**
 * Genera o recupera una huella determinista del dispositivo en la DB Local (`localStorage`)
 * para reconocer si es el mismo cliente aunque intente cambiar su nombre público.
 */
export function obtenerHuellaDispositivoLocal() {
  const STORAGE_KEY = 'mita_device_fingerprint_v27';
  try {
    if (typeof localStorage !== 'undefined') {
      const existente = localStorage.getItem(STORAGE_KEY);
      if (existente) return existente;
    }
  } catch {
    // Continuar con generación determinista
  }

  const nav = typeof navigator !== 'undefined' ? navigator : { userAgent: 'node-ssr', language: 'es-BO' };
  const scr = typeof screen !== 'undefined' ? screen : { width: 1920, height: 1080 };
  const semilla = `${nav.userAgent}|${nav.language}|${scr.width}x${scr.height}`;
  let hash = 5381;
  for (let i = 0; i < semilla.length; i++) {
    hash = (hash * 33) ^ semilla.charCodeAt(i);
  }
  const huella = `dev-${(hash >>> 0).toString(16)}-${Date.now().toString(36).slice(-4)}`;

  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, huella);
    }
  } catch {
    // Ignorar en entornos sin storage
  }
  return huella;
}

// ============================================================================
// 1. LIBRERÍA UI: PAGINACIÓN REACTIVA Y DATA FETCHING CON CACHÉ (AHORRO DE RECURSOS)
// ============================================================================

/**
 * 📄 Controlador Reactivo de Paginación UI (Ahorra nodos en el DOM y memoria RAM).
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='ui:paginacion_activa']
 * @param {number} [opciones.tamanoPaginaInicial=4]
 */
export function crearControladorPaginacion(opciones = {}) {
  const estado = crearEstadoReactivoInmutable(
    opciones.nombreEstado || 'ui:paginacion_activa',
    {
      paginaActual: 1,
      tamanoPagina: Math.max(1, Number(opciones.tamanoPaginaInicial) || 4)
    },
    {
      compartidoEntreComponentes: false,
      descripcionDelEstado: 'Estado UI de paginación para tablas, listas de anuncios y catálogos.'
    }
  );

  return {
    estado,

    calcularMetadatos(totalElementos) {
      const st = leerEstadoInmutable(estado);
      const total = Math.max(0, Number(totalElementos) || 0);
      const totalPaginas = Math.max(1, Math.ceil(total / st.tamanoPagina));
      const paginaSegura = Math.min(totalPaginas, Math.max(1, st.paginaActual));
      const indiceInicio = (paginaSegura - 1) * st.tamanoPagina;
      const indiceFin = Math.min(total, indiceInicio + st.tamanoPagina);

      return {
        paginaActual: paginaSegura,
        tamanoPagina: st.tamanoPagina,
        totalElementos: total,
        totalPaginas,
        indiceInicio,
        indiceFin,
        tieneAnterior: paginaSegura > 1,
        tieneSiguiente: paginaSegura < totalPaginas
      };
    },

    obtenerItemsDePagina(coleccionCompleta = []) {
      const lista = Array.isArray(coleccionCompleta) ? coleccionCompleta : [];
      const meta = this.calcularMetadatos(lista.length);
      return {
        itemsPagina: lista.slice(meta.indiceInicio, meta.indiceFin),
        ...meta
      };
    },

    irAPagina(numeroPagina, totalElementos = 9999) {
      const meta = this.calcularMetadatos(totalElementos);
      const destino = Math.min(meta.totalPaginas, Math.max(1, Number(numeroPagina) || 1));
      return mutarEstadoConHistorial(
        estado,
        { paginaActual: destino },
        `Navegación a página ${destino}`
      );
    },

    paginaSiguiente(totalElementos) {
      const meta = this.calcularMetadatos(totalElementos);
      if (meta.tieneSiguiente) {
        this.irAPagina(meta.paginaActual + 1, totalElementos);
      }
      return this.calcularMetadatos(totalElementos);
    },

    paginaAnterior(totalElementos) {
      const meta = this.calcularMetadatos(totalElementos);
      if (meta.tieneAnterior) {
        this.irAPagina(meta.paginaActual - 1, totalElementos);
      }
      return this.calcularMetadatos(totalElementos);
    },

    cambiarTamanoPagina(nuevoTamano) {
      const tamano = Math.max(1, Number(nuevoTamano) || 4);
      return mutarEstadoConHistorial(
        estado,
        { paginaActual: 1, tamanoPagina: tamano },
        `Tamaño de página ajustado a ${tamano}`
      );
    },

    renderizarControlesHtml(totalElementos) {
      const meta = this.calcularMetadatos(totalElementos);
      return `
        <nav class="mita-pagination-nav" aria-label="Paginación de resultados">
          <button type="button" class="demo-btn demo-btn-ghost" data-page-action="prev" ${!meta.tieneAnterior ? 'disabled' : ''}>
            ◀ Anterior
          </button>
          <output class="demo-tag">
            Página ${meta.paginaActual} de ${meta.totalPaginas} (${meta.totalElementos} registros)
          </output>
          <button type="button" class="demo-btn demo-btn-ghost" data-page-action="next" ${!meta.tieneSiguiente ? 'disabled' : ''}>
            Siguiente ▶
          </button>
        </nav>
      `;
    }
  };
}

/**
 * 📡 Controlador de Data Fetching con Caché TTL y Ahorro de Recursos.
 * Evita golpear la base de datos o red innecesariamente si los datos siguen frescos en caché.
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='ui:data_fetcher']
 * @param {number} [opciones.tiempoCacheMs=60000]
 */
export function crearFetcherConCacheYEstados(opciones = {}) {
  const tiempoCacheMs = opciones.tiempoCacheMs ?? 60000;
  /** @type {Map<string, { datos: any, timestamp: number }>} */
  const cacheMemoria = new Map();

  const estado = crearEstadoReactivoInmutable(
    opciones.nombreEstado || 'ui:data_fetcher',
    {
      cargando: false,
      datos: null,
      error: null,
      desdeCache: false,
      claveActual: '',
      ahorroRequestsCount: 0
    },
    {
      compartidoEntreComponentes: false,
      descripcionDelEstado: 'Estado reactivo de carga asíncrona con caché en memoria para ahorrar red y BD.'
    }
  );

  return {
    estado,

    /**
     * Ejecuta el cargador asíncrono o devuelve instantáneamente desde la caché si no expiró el TTL.
     * @param {string} claveRecurso
     * @param {() => Promise<any>} cargadorAsyncFn
     * @param {{ forzarRecarga?: boolean }} [cfg={}]
     */
    async cargarRecurso(claveRecurso, cargadorAsyncFn, cfg = {}) {
      const ahora = Date.now();
      const enCache = cacheMemoria.get(claveRecurso);

      if (!cfg.forzarRecarga && enCache && ahora - enCache.timestamp < tiempoCacheMs) {
        const ahorro = (leerEstadoInmutable(estado).ahorroRequestsCount || 0) + 1;
        mutarEstadoConHistorial(
          estado,
          {
            cargando: false,
            datos: enCache.datos,
            error: null,
            desdeCache: true,
            claveActual: claveRecurso,
            ahorroRequestsCount: ahorro
          },
          `Respuesta instantánea desde caché para "${claveRecurso}" (Ahorro #${ahorro})`
        );
        return { ok: true, datos: enCache.datos, desdeCache: true };
      }

      mutarEstadoConHistorial(
        estado,
        { cargando: true, error: null, desdeCache: false, claveActual: claveRecurso },
        `Iniciando petición para "${claveRecurso}"`
      );

      try {
        const datos = await cargadorAsyncFn();
        cacheMemoria.set(claveRecurso, { datos, timestamp: Date.now() });
        mutarEstadoConHistorial(
          estado,
          { cargando: false, datos, error: null, desdeCache: false, claveActual: claveRecurso },
          `Datos recibidos y cacheados para "${claveRecurso}"`
        );
        return { ok: true, datos, desdeCache: false };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        mutarEstadoConHistorial(
          estado,
          { cargando: false, error: msg, desdeCache: false, claveActual: claveRecurso },
          `Error cargando "${claveRecurso}": ${msg}`
        );
        return { ok: false, error: msg, desdeCache: false };
      }
    },

    invalidarCache(claveEspecifica) {
      if (claveEspecifica) {
        cacheMemoria.delete(claveEspecifica);
      } else {
        cacheMemoria.clear();
      }
    }
  };
}

// ============================================================================
// 2. PERFILES SIN CUENTA (GUEST), HUELLA DE DISPOSITIVO LOCAL Y COOLDOWN 15 DÍAS
// ============================================================================

/**
 * 👤 Gestor de Perfiles Rápidos (sin obligar a registrar cuenta), Detección de Dispositivo
 * en DB Local, Regla de 15 Días para cambio de nombre, Bloqueo por Dispositivo/Usuario y Exportación JSON.
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='comunidad:perfiles_y_dispositivos']
 */
export function crearGestorPerfilesYDispositivo(opciones = {}) {
  const huellaActual = obtenerHuellaDispositivoLocal();
  const QUINCE_DIAS_MS = 15 * 24 * 60 * 60 * 1000;

  const estado = crearEstadoReactivoInmutable(
    opciones.nombreEstado || 'comunidad:perfiles_y_dispositivos',
    {
      configAdmin: {
        aceptarRegistrosDeCuenta: false, // Por defecto NO acepta registros formales de cuenta, solo perfiles rápidos sin cuenta
        restringirCambioNombreQuinceDias: true,
        diasBloqueoCambioNombre: 15
      },
      perfilActivo: {
        idUsuario: `usr-${huellaActual}`,
        huellaDispositivoId: huellaActual,
        nombre: 'Invitado Anónimo',
        empresa: '',
        colorTema: 'indigo',
        bio: 'Publicador invitado sin cuenta registrada',
        verificado: false,
        badge: '⚠️ No Verificado',
        ultimoCambioNombreTs: 0
      },
      perfilesRegistrados: [],
      listaNegraDispositivosYUsuarios: []
    },
    {
      compartidoEntreComponentes: true,
      persistirEnLocalStorage: true,
      descripcionDelEstado: 'Perfiles sin cuenta, huella local de dispositivo, regla de 15 días de nombre y lista negra.'
    }
  );

  return {
    estado,
    huellaActual,

    /**
     * Configura opciones de Admin: activar/desactivar la regla de no cambiar nombre en 15 días
     * o activar/desactivar registros de cuenta.
     * @param {{ aceptarRegistrosDeCuenta?: boolean, restringirCambioNombreQuinceDias?: boolean, diasBloqueoCambioNombre?: number }} nuevaCfg
     */
    configurarReglasAdminPerfiles(nuevaCfg = {}) {
      return mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          configAdmin: {
            ...actual.configAdmin,
            ...nuevaCfg
          }
        }),
        'Reglas de perfiles actualizadas por Administración'
      );
    },

    /**
     * Crea o actualiza el perfil rápido del usuario (sin registrar cuenta) validando:
     * 1) Si su huella de dispositivo está bloqueada.
     * 2) Si intenta cambiar el nombre antes de que pasen los 15 días configurados por Admin.
     *
     * @param {{ nombre: string, empresa?: string, bio?: string, colorTema?: string, ahoraTs?: number }} datosPerfil
     */
    crearOActualizarPerfilSinCuenta(datosPerfil) {
      const actual = leerEstadoInmutable(estado);
      const nuevoNombre = String(datosPerfil?.nombre || '').trim();
      if (!nuevoNombre || nuevoNombre.length < 2) {
        return { ok: false, motivo: 'El nombre debe tener al menos 2 caracteres.' };
      }

      const ahora = datosPerfil?.ahoraTs ?? Date.now();
      const perfilPrevio = actual.perfilActivo;
      const cambiaNombre =
        perfilPrevio.ultimoCambioNombreTs > 0 &&
        perfilPrevio.nombre.toLowerCase() !== nuevoNombre.toLowerCase();

      if (cambiaNombre && actual.configAdmin.restringirCambioNombreQuinceDias) {
        const diasCfg = actual.configAdmin.diasBloqueoCambioNombre || 15;
        const msRequeridos = diasCfg * 24 * 60 * 60 * 1000 || QUINCE_DIAS_MS;
        const transcurrido = ahora - perfilPrevio.ultimoCambioNombreTs;

        if (transcurrido < msRequeridos) {
          const diasRestantes = Math.ceil((msRequeridos - transcurrido) / (24 * 60 * 60 * 1000));
          return {
            ok: false,
            motivo: `⏳ Restricción activa: no puedes cambiar tu nombre durante ${diasCfg} días (faltan ${diasRestantes} días). Mismo dispositivo detectado (${huellaActual}).`
          };
        }
      }

      const actualizado = {
        ...perfilPrevio,
        huellaDispositivoId: huellaActual,
        nombre: nuevoNombre,
        empresa: String(datosPerfil?.empresa ?? perfilPrevio.empresa).trim(),
        bio: String(datosPerfil?.bio ?? perfilPrevio.bio).trim(),
        colorTema: String(datosPerfil?.colorTema ?? perfilPrevio.colorTema),
        verificado: false,
        badge: '⚠️ No Verificado',
        ultimoCambioNombreTs:
          perfilPrevio.ultimoCambioNombreTs === 0 || cambiaNombre
            ? ahora
            : perfilPrevio.ultimoCambioNombreTs
      };

      mutarEstadoConHistorial(
        estado,
        (st) => {
          const otros = (st.perfilesRegistrados || []).filter(
            (p) => p.huellaDispositivoId !== huellaActual
          );
          return {
            ...st,
            perfilActivo: actualizado,
            perfilesRegistrados: [actualizado, ...otros]
          };
        },
        `Perfil sin cuenta actualizado para "${actualizado.nombre}" (Dispositivo: ${huellaActual})`
      );

      return { ok: true, perfil: actualizado };
    },

    /**
     * 🚫 Permite al Admin prohibir que un usuario, nombre o dispositivo específico publique anuncios o use el chat.
     * @param {string} criterioIdNombreOHuella
     * @param {string} [motivo='Incumplimiento de normas']
     */
    prohibirUsuarioODispositivo(criterioIdNombreOHuella, motivo = 'Incumplimiento de normas') {
      const limpio = String(criterioIdNombreOHuella || '').trim();
      if (!limpio) return false;

      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          listaNegraDispositivosYUsuarios: [
            {
              criterio: limpio,
              motivo,
              fecha: new Date().toISOString().split('T')[0]
            },
            ...(st.listaNegraDispositivosYUsuarios || []).filter(
              (item) => item.criterio.toLowerCase() !== limpio.toLowerCase()
            )
          ]
        }),
        `Bloqueado usuario/dispositivo "${limpio}": ${motivo}`
      );
      return true;
    },

    desbloquearUsuarioODispositivo(criterioIdNombreOHuella) {
      const limpio = String(criterioIdNombreOHuella || '').trim().toLowerCase();
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          listaNegraDispositivosYUsuarios: (st.listaNegraDispositivosYUsuarios || []).filter(
            (item) => item.criterio.toLowerCase() !== limpio
          )
        }),
        `Desbloqueado usuario/dispositivo "${criterioIdNombreOHuella}"`
      );
    },

    /**
     * Verifica si el perfil actual o un nombre/huella específico está bloqueado en la DB Local.
     * @param {{ nombre?: string, huellaDispositivoId?: string, idUsuario?: string }} [sujeto]
     */
    estaBloqueadoParaPublicar(sujeto) {
      const st = leerEstadoInmutable(estado);
      const target = sujeto || st.perfilActivo;
      const listaNegra = st.listaNegraDispositivosYUsuarios || [];

      const coincidencia = listaNegra.find((b) => {
        const c = b.criterio.toLowerCase();
        return (
          c === String(target.huellaDispositivoId || '').toLowerCase() ||
          c === String(target.nombre || '').toLowerCase() ||
          c === String(target.idUsuario || '').toLowerCase()
        );
      });

      return {
        bloqueado: Boolean(coincidencia),
        motivo: coincidencia ? coincidencia.motivo : null
      };
    },

    /**
     * 📤 Exporta todos los datos del perfil y huella del dispositivo para backup o sincronización.
     */
    exportarDatosUsuarioJson() {
      const st = leerEstadoInmutable(estado);
      return {
        exportadoEn: new Date().toISOString(),
        huellaDispositivoId: huellaActual,
        perfilActivo: st.perfilActivo,
        configAdmin: st.configAdmin
      };
    },

    importarDatosUsuarioJson(payload) {
      if (!payload || !payload.perfilActivo) return false;
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          perfilActivo: {
            ...st.perfilActivo,
            ...payload.perfilActivo,
            huellaDispositivoId: huellaActual
          }
        }),
        'Datos de perfil sincronizados desde JSON externo'
      );
      return true;
    }
  };
}

// ============================================================================
// 3. CHAT Y GRUPOS CON VENTANA OBLIGATORIA DE ACEPTACIÓN Y COOLDOWN CONFIGURABLE (3s)
// ============================================================================

/**
 * 💬 Controlador de Salas de Chat y Grupos con:
 * - Ventana modal obligatoria de aceptación de reglas antes de dejar entrar al chat o grupo.
 * - Cooldown configurable entre mensajes (por defecto `3 segundos` = `3000ms`).
 * - Permisos granulares por grupo y usuario.
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='comunidad:chat_grupos_gatekeeper']
 * @param {number} [opciones.intervaloSegundosInicial=3]
 */
export function crearControladorSalaChatYGrupos(opciones = {}) {
  const segInicial = Number(opciones.intervaloSegundosInicial) || 3;

  const estado = crearEstadoReactivoInmutable(
    opciones.nombreEstado || 'comunidad:chat_grupos_gatekeeper',
    {
      chatGlobalHabilitado: true,
      intervaloEnvioSegundos: segInicial,
      textoReglasEntradaChat:
        'Para entrar a las salas de chat y grupos debes aceptar: 1) Respetar el intervalo anti-spam entre mensajes, 2) No publicar enlaces ni palabras prohibidas como "DC", 3) La plataforma no se responsabiliza por opiniones de usuarios no verificados.',
      salasAceptadasPorUsuario: {}, // { 'sala-general': true }
      mostrarVentanaAceptacionParaSala: null,
      salaActivaId: null,
      ultimoMensajePorUsuarioTs: {},
      gruposDisponibles: [
        { id: 'sala-general', nombre: '💬 Chat General Mita-DOM', requiereAceptacion: true },
        { id: 'grupo-empleos', nombre: '💼 Grupo Ofertas y Avisos', requiereAceptacion: true },
        { id: 'grupo-soporte', nombre: '🛠️ Grupo Soporte Técnico', requiereAceptacion: true }
      ],
      mensajes: [
        {
          id: 'msg-1',
          salaId: 'sala-general',
          autor: 'Sistema Mita-DOM',
          badge: '🛡️ Oficial',
          texto: 'Bienvenido. Recuerda que debes aceptar las reglas en la ventana emergente para entrar a cada grupo.',
          hora: '12:00'
        }
      ]
    },
    {
      compartidoEntreComponentes: true,
      persistirEnLocalStorage: true,
      descripcionDelEstado: 'Control de acceso a salas de chat/grupos con ventana obligatoria y cooldown de 3s.'
    }
  );

  return {
    estado,

    /**
     * 🪟 Intenta entrar a una sala de chat o grupo.
     * Si el usuario aún no aceptó las condiciones de esa sala, NO lo deja entrar y abre la ventana de aceptación.
     * @param {string} salaId
     */
    intentarEntrarASalaOChat(salaId) {
      const st = leerEstadoInmutable(estado);
      if (!st.chatGlobalHabilitado) {
        return {
          accesoPermitido: false,
          requiereAceptarVentana: false,
          motivo: '🔴 El chat está desactivado globalmente por Administración.'
        };
      }

      const yaAcepto = Boolean(st.salasAceptadasPorUsuario?.[salaId]);
      if (!yaAcepto) {
        mutarEstadoConHistorial(
          estado,
          { mostrarVentanaAceptacionParaSala: salaId, salaActivaId: null },
          `Ventana de aceptación requerida antes de entrar a "${salaId}"`
        );
        return {
          accesoPermitido: false,
          requiereAceptarVentana: true,
          salaPendiente: salaId,
          textoReglas: st.textoReglasEntradaChat,
          motivo: '🪟 Debes aceptar las reglas en la ventana emergente para entrar a este chat o grupo.'
        };
      }

      mutarEstadoConHistorial(
        estado,
        { salaActivaId: salaId, mostrarVentanaAceptacionParaSala: null },
        `Acceso concedido a sala "${salaId}"`
      );
      return {
        accesoPermitido: true,
        requiereAceptarVentana: false,
        salaActivaId: salaId
      };
    },

    /**
     * ✅ Cuando el usuario pulsa "Aceptar y Entrar" en la ventana emergente del chat/grupo.
     * @param {string} salaId
     */
    aceptarReglasYEntrarASala(salaId) {
      const clave = String(salaId || 'sala-general');
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          salasAceptadasPorUsuario: {
            ...(st.salasAceptadasPorUsuario || {}),
            [clave]: true
          },
          salaActivaId: clave,
          mostrarVentanaAceptacionParaSala: null
        }),
        `Usuario aceptó reglas y entró al grupo "${clave}"`
      );
      return { accesoPermitido: true, salaActivaId: clave };
    },

    /**
     * ❌ Cuando el usuario rechaza la ventana de condiciones: se cierra la ventana y NO entra al chat.
     */
    rechazarReglasDeEntrada() {
      mutarEstadoConHistorial(
        estado,
        { mostrarVentanaAceptacionParaSala: null, salaActivaId: null },
        'Usuario rechazó las reglas: entrada al chat/grupo bloqueada'
      );
      return { accesoPermitido: false, motivo: 'No aceptaste las condiciones del grupo.' };
    },

    /**
     * ⏱️ Configura cada cuántos segundos se permite enviar un mensaje (por defecto 3 segundos).
     * @param {number} segundos
     */
    configurarIntervaloMensajesSegundos(segundos) {
      const seg = Math.max(0.5, Number(segundos) || 3);
      return mutarEstadoConHistorial(
        estado,
        { intervaloEnvioSegundos: seg },
        `Cooldown de chat configurado a ${seg} segundos`
      );
    },

    activarODesactivarChatGlobal(habilitado) {
      return mutarEstadoConHistorial(
        estado,
        { chatGlobalHabilitado: Boolean(habilitado) },
        `Chat global ${habilitado ? 'ACTIVADO' : 'DESACTIVADO'} por Admin`
      );
    },

    /**
     * Envía un mensaje a la sala activa verificando:
     * 1) Que haya aceptado la ventana de reglas de esa sala.
     * 2) Que se cumpla el tiempo configurado (por defecto 3 segundos) desde su último mensaje.
     *
     * @param {{ salaId: string, autor: string, texto: string, badge?: string, ahoraTs?: number }} payload
     */
    enviarMensajeConCooldown(payload) {
      const st = leerEstadoInmutable(estado);
      const salaId = payload.salaId || st.salaActivaId;
      if (!st.chatGlobalHabilitado) {
        return { ok: false, motivo: 'El chat está desactivado por Administración.' };
      }
      if (!salaId || !st.salasAceptadasPorUsuario?.[salaId]) {
        return {
          ok: false,
          motivo: '🚫 Acceso denegado: primero debes aceptar la ventana de reglas para entrar al chat.'
        };
      }

      const texto = String(payload.texto || '').trim();
      if (!texto) {
        return { ok: false, motivo: 'El mensaje no puede estar vacío.' };
      }

      const autor = String(payload.autor || 'Invitado').trim();
      const ahora = payload.ahoraTs ?? Date.now();
      const ultimoTs = st.ultimoMensajePorUsuarioTs?.[autor] || 0;
      const cooldownMs = (st.intervaloEnvioSegundos || 3) * 1000;

      if (ultimoTs > 0 && ahora - ultimoTs < cooldownMs) {
        const restanteSeg = ((cooldownMs - (ahora - ultimoTs)) / 1000).toFixed(1);
        return {
          ok: false,
          esperaSegundos: Number(restanteSeg),
          motivo: `⏱️ Espera ${restanteSeg}s antes de enviar otro mensaje (intervalo configurado: ${st.intervaloEnvioSegundos}s).`
        };
      }

      const nuevoMsg = {
        id: `msg-${ahora}-${Math.random().toString(36).slice(2, 5)}`,
        salaId,
        autor,
        badge: payload.badge || '⚠️ No Verificado',
        texto,
        hora: new Date(ahora).toTimeString().slice(0, 5)
      };

      mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          ultimoMensajePorUsuarioTs: {
            ...(actual.ultimoMensajePorUsuarioTs || {}),
            [autor]: ahora
          },
          mensajes: [nuevoMsg, ...(actual.mensajes || [])]
        }),
        `Mensaje enviado por "${autor}" en "${salaId}"`
      );

      return { ok: true, mensaje: nuevoMsg };
    }
  };
}

// ============================================================================
// 4. MODERACIÓN INTEGRAL DE ANUNCIOS ("DC", CRUD CATEGORÍAS, DESCARGO LEGAL, REPORTES, PURGA ADMIN)
// ============================================================================

/**
 * 📢 Sistema Integral de Anuncios con:
 * - Descargo de Responsabilidad Legal editable y visible.
 * - Badge `"⚠️ No Verificado"` por defecto en cada autor.
 * - CRUD obligatorio de Categorías (ningún anuncio se publica sin categoría válida).
 * - Bloqueo de palabras prohibidas como `"DC"` configurable en `'minusculas'`, `'mayusculas'` o `'ambos'`.
 * - Fecha, hora y duración predeterminada configurable.
 * - Cola de revisión previa activable/desactivable (`requiereRevisionPrevia`) con botones `Permitir`, `Permitir Todos`, `Eliminar`.
 * - Reportes de anuncios con justificación + pruebas/evidencia y notificación inmediata al Admin.
 * - Botones exclusivos para Admin: borrar todo o borrar todas las publicaciones de un usuario o empresa específica.
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='comunidad:moderacion_anuncios']
 * @param {any} [opciones.gestorPerfiles]
 */
export function crearSistemaModeracionAnuncios(opciones = {}) {
  const gestorPerfiles = opciones.gestorPerfiles || null;

  const categoriasIniciales = [
    { id: 'empleos', nombre: '💼 Empleos y Oficios', activa: true },
    { id: 'servicios', nombre: '🛠️ Servicios Profesionales', activa: true },
    { id: 'compraventa', nombre: '📦 Compra y Venta', activa: true },
    { id: 'alquileres', nombre: '🏠 Alquileres e Inmuebles', activa: true }
  ];

  const estado = crearEstadoReactivoInmutable(
    opciones.nombreEstado || 'comunidad:moderacion_anuncios',
    {
      descargoLegalResponsabilidad:
        '⚖️ DESCARGO DE RESPONSABILIDAD LEGAL: Este sitio web opera únicamente como un tablón tecnológico abierto. La plataforma NO tiene culpa ni asume responsabilidad civil, penal o laboral si terceros publican contenidos ilegales, inexactos o fraudulentos. Por seguridad, todo publicador lleva por defecto el sello "⚠️ No Verificado".',
      configModeracion: {
        requiereRevisionPreviaAdmin: false,
        duracionPredeterminadaHoras: 48,
        palabrasProhibidas: [
          { palabra: 'DC', modoSensibilidad: 'ambos' }, // 'ambos' | 'mayusculas' | 'minusculas'
          { palabra: 'estafa', modoSensibilidad: 'ambos' },
          { palabra: 'ilicito', modoSensibilidad: 'ambos' }
        ]
      },
      categorias: categoriasIniciales,
      anuncios: [
        {
          id: 'ad-1',
          titulo: 'Maestro Panadero Turno Mañana',
          descripcion: 'Se busca panadero con experiencia en hornos industriales.',
          categoria: 'empleos',
          autorNombre: 'Panadería El Sol',
          empresa: 'Grupo El Sol SRL',
          huellaDispositivoId: 'dev-seed-1',
          badgeVerificacion: '⚠️ No Verificado',
          estadoRevision: 'publicado', // 'publicado' | 'pendiente_revision'
          creadoEnFechaHora: '2026-11-22 08:30',
          creadoEnTs: 1795350000000,
          duracionHoras: 48,
          reportesCount: 0
        }
      ],
      reportesYNotificacionesAdmin: []
    },
    {
      compartidoEntreComponentes: true,
      persistirEnLocalStorage: true,
      descripcionDelEstado: 'Moderación de anuncios, CRUD obligatorio de categorías, filtro DC, reportes con pruebas y descargo legal.'
    }
  );

  /**
   * Evalúa si el texto contiene alguna palabra prohibida respetando su modo:
   * - `'mayusculas'`: bloquea solo si aparece exactamente en MAYÚSCULAS (ej. `"DC"`).
   * - `'minusculas'`: bloquea solo si aparece exactamente en minúsculas (ej. `"dc"`).
   * - `'ambos'`: bloquea sin importar mayúsculas o minúsculas (`"DC"`, `"dc"`, `"Dc"`, `"dC"`).
   */
  function detectarPalabraProhibida(textoCompleto, listaReglas) {
    const texto = String(textoCompleto || '');
    for (const regla of listaReglas || []) {
      const kw = String(regla.palabra || '').trim();
      if (!kw) continue;
      const escapada = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const modo = regla.modoSensibilidad || 'ambos';

      if (modo === 'mayusculas') {
        const rgx = new RegExp(`\\b${escapada.toUpperCase()}\\b`, 'g');
        if (rgx.test(texto)) {
          return { bloqueado: true, palabra: kw.toUpperCase(), modo };
        }
      } else if (modo === 'minusculas') {
        const rgx = new RegExp(`\\b${escapada.toLowerCase()}\\b`, 'g');
        if (rgx.test(texto)) {
          return { bloqueado: true, palabra: kw.toLowerCase(), modo };
        }
      } else {
        const rgx = new RegExp(`\\b${escapada}\\b`, 'gi');
        if (rgx.test(texto)) {
          return { bloqueado: true, palabra: kw, modo: 'ambos' };
        }
      }
    }
    return { bloqueado: false, palabra: null, modo: null };
  }

  return {
    estado,

    // ------------------------------------------------------------------------
    // A. CRUD OBLIGATORIO DE CATEGORÍAS
    // ------------------------------------------------------------------------
    crearCategoria({ id, nombre }) {
      const slug = String(id || nombre || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '_');
      const etiqueta = String(nombre || slug).trim();
      if (!slug || !etiqueta) {
        throw new Error('[Categorías CRUD] ID y nombre de categoría son obligatorios.');
      }

      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          categorias: [
            ...(st.categorias || []).filter((c) => c.id !== slug),
            { id: slug, nombre: etiqueta, activa: true }
          ]
        }),
        `Categoría "${etiqueta}" (${slug}) creada/actualizada en CRUD`
      );
      return { id: slug, nombre: etiqueta, activa: true };
    },

    eliminarCategoria(idCategoria) {
      const slug = String(idCategoria || '').trim().toLowerCase();
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          categorias: (st.categorias || []).filter((c) => c.id !== slug)
        }),
        `Categoría "${slug}" eliminada del CRUD`
      );
    },

    listarCategoriasActivas() {
      return (leerEstadoInmutable(estado).categorias || []).filter((c) => c.activa);
    },

    // ------------------------------------------------------------------------
    // B. CONFIGURACIÓN DE PALABRAS PROHIBIDAS ("DC"), DURACIÓN Y REVISIÓN ADMIN
    // ------------------------------------------------------------------------
    agregarPalabraProhibida(palabra, modoSensibilidad = 'ambos') {
      const limpia = String(palabra || '').trim();
      if (!limpia) return false;
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          configModeracion: {
            ...st.configModeracion,
            palabrasProhibidas: [
              { palabra: limpia, modoSensibilidad },
              ...(st.configModeracion.palabrasProhibidas || []).filter(
                (p) => p.palabra.toLowerCase() !== limpia.toLowerCase()
              )
            ]
          }
        }),
        `Palabra prohibida "${limpia}" agregada en modo "${modoSensibilidad}"`
      );
      return true;
    },

    configurarOpcionesGlobalesModeracion({
      requiereRevisionPreviaAdmin,
      duracionPredeterminadaHoras,
      descargoLegalResponsabilidad
    }) {
      return mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          descargoLegalResponsabilidad:
            descargoLegalResponsabilidad ?? st.descargoLegalResponsabilidad,
          configModeracion: {
            ...st.configModeracion,
            requiereRevisionPreviaAdmin:
              requiereRevisionPreviaAdmin ?? st.configModeracion.requiereRevisionPreviaAdmin,
            duracionPredeterminadaHoras:
              Number(duracionPredeterminadaHoras) || st.configModeracion.duracionPredeterminadaHoras
          }
        }),
        'Opciones globales de moderación y duración actualizadas por Admin'
      );
    },

    // ------------------------------------------------------------------------
    // C. PUBLICACIÓN DE ANUNCIOS CON VALIDACIÓN ESTRICTA
    // ------------------------------------------------------------------------
    publicarAnuncio(datosAnuncio) {
      const st = leerEstadoInmutable(estado);
      const titulo = String(datosAnuncio?.titulo || '').trim();
      const descripcion = String(datosAnuncio?.descripcion || '').trim();
      const categoria = String(datosAnuncio?.categoria || '').trim().toLowerCase();
      const autorNombre = String(datosAnuncio?.autorNombre || 'Invitado').trim();
      const empresa = String(datosAnuncio?.empresa || '').trim();
      const huella = datosAnuncio?.huellaDispositivoId || obtenerHuellaDispositivoLocal();

      if (!titulo || !descripcion) {
        return { ok: false, motivo: 'El título y la descripción son obligatorios.' };
      }

      // 1. Verificar categoría obligatoria en el CRUD de Categorías
      const catValida = (st.categorias || []).find((c) => c.id === categoria && c.activa);
      if (!catValida) {
        return {
          ok: false,
          motivo: `🚫 Categoría obligatoria inválida ("${categoria}"). Debes elegir una categoría existente en el CRUD de Categorías.`
        };
      }

      // 2. Verificar si el usuario o dispositivo está bloqueado
      if (gestorPerfiles && typeof gestorPerfiles.estaBloqueadoParaPublicar === 'function') {
        const checkBloqueo = gestorPerfiles.estaBloqueadoParaPublicar({
          nombre: autorNombre,
          huellaDispositivoId: huella
        });
        if (checkBloqueo.bloqueado) {
          return {
            ok: false,
            motivo: `🚫 Usuario o dispositivo bloqueado para publicar: ${checkBloqueo.motivo}`
          };
        }
      }

      // 3. Verificar palabras clave prohibidas (como "DC" en mayúsculas, minúsculas o ambos)
      const checkPalabra = detectarPalabraProhibida(
        `${titulo} ${descripcion} ${autorNombre} ${empresa}`,
        st.configModeracion.palabrasProhibidas
      );
      if (checkPalabra.bloqueado) {
        return {
          ok: false,
          motivo: `🚫 Anuncio rechazado: contiene la palabra clave prohibida "${checkPalabra.palabra}" (filtro activo: ${checkPalabra.modo}).`
        };
      }

      const ahoraTs = datosAnuncio?.ahoraTs ?? Date.now();
      const fechaIso = new Date(ahoraTs).toISOString();
      const fechaHoraLegible = `${fechaIso.slice(0, 10)} ${fechaIso.slice(11, 16)}`;
      const duracionHoras =
        Number(datosAnuncio?.duracionHoras) || st.configModeracion.duracionPredeterminadaHoras || 48;

      const estadoRevision = st.configModeracion.requiereRevisionPreviaAdmin
        ? 'pendiente_revision'
        : 'publicado';

      const nuevoAnuncio = {
        id: `ad-${ahoraTs}-${Math.random().toString(36).slice(2, 6)}`,
        titulo,
        descripcion,
        categoria,
        autorNombre,
        empresa,
        huellaDispositivoId: huella,
        badgeVerificacion: '⚠️ No Verificado',
        estadoRevision,
        creadoEnFechaHora: fechaHoraLegible,
        creadoEnTs: ahoraTs,
        duracionHoras,
        reportesCount: 0
      };

      mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          anuncios: [nuevoAnuncio, ...(actual.anuncios || [])]
        }),
        `Anuncio "${titulo}" creado con estado "${estadoRevision}"`
      );

      return {
        ok: true,
        anuncio: nuevoAnuncio,
        requirioRevision: estadoRevision === 'pendiente_revision'
      };
    },

    // ------------------------------------------------------------------------
    // D. BÚSQUEDA EN TODO EL ANUNCIO + FILTRADO POR CATEGORÍA, FECHA/HORA Y ESTADO
    // ------------------------------------------------------------------------
    buscarYFiltrarAnuncios(filtros = {}) {
      const st = leerEstadoInmutable(estado);
      const q = String(filtros.textoBusqueda || '').trim().toLowerCase();
      const cat = String(filtros.categoria || 'todos').toLowerCase();
      const incluirPendientes = Boolean(filtros.incluirPendientesAdmin);
      const fechaHoraFiltro = String(filtros.fechaHoraContiene || '').trim().toLowerCase();

      return (st.anuncios || []).filter((ad) => {
        if (!incluirPendientes && ad.estadoRevision !== 'publicado') return false;
        if (cat !== 'todos' && ad.categoria !== cat) return false;
        if (fechaHoraFiltro && !String(ad.creadoEnFechaHora).toLowerCase().includes(fechaHoraFiltro)) {
          return false;
        }
        if (!q) return true;
        const bolsaTexto = [
          ad.titulo,
          ad.descripcion,
          ad.autorNombre,
          ad.empresa,
          ad.categoria,
          ad.creadoEnFechaHora,
          ad.badgeVerificacion
        ]
          .join(' ')
          .toLowerCase();
        return bolsaTexto.includes(q);
      });
    },

    // ------------------------------------------------------------------------
    // E. REPORTAR ANUNCIOS CON JUSTIFICACIÓN + PRUEBAS Y NOTIFICAR AL ADMIN
    // ------------------------------------------------------------------------
    reportarAnuncioConPruebas({ idAnuncio, reportadoPor, justificacion, pruebasEvidencia }) {
      const motivo = String(justificacion || '').trim();
      const pruebas = String(pruebasEvidencia || '').trim();
      if (!motivo || motivo.length < 4 || !pruebas) {
        return {
          ok: false,
          motivo: 'Para reportar un anuncio es obligatorio incluir justificación y pruebas/evidencia.'
        };
      }

      const reporte = {
        idReporte: `rep-${Date.now()}`,
        idAnuncio,
        reportadoPor: String(reportadoPor || 'Usuario Anónimo').trim(),
        justificacion: motivo,
        pruebasEvidencia: pruebas,
        fechaHora: new Date().toISOString().replace('T', ' ').slice(0, 16),
        atendidoPorAdmin: false
      };

      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          anuncios: (st.anuncios || []).map((ad) =>
            ad.id === idAnuncio ? { ...ad, reportesCount: (ad.reportesCount || 0) + 1 } : ad
          ),
          reportesYNotificacionesAdmin: [reporte, ...(st.reportesYNotificacionesAdmin || [])]
        }),
        `🔔 Nuevo reporte con pruebas sobre anuncio "${idAnuncio}"`
      );

      return { ok: true, reporte };
    },

    // ------------------------------------------------------------------------
    // F. CONTROLES EXCLUSIVOS PARA ADMIN (PERMITIR, PERMITIR TODOS, BORRAR TODO O POR USUARIO/EMPRESA)
    // ------------------------------------------------------------------------
    permitirAnuncioPorAdmin(idAnuncio) {
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          anuncios: (st.anuncios || []).map((ad) =>
            ad.id === idAnuncio ? { ...ad, estadoRevision: 'publicado' } : ad
          )
        }),
        `Admin aprobó y publicó el anuncio "${idAnuncio}"`
      );
    },

    permitirTodosLosAnunciosPendientes() {
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          anuncios: (st.anuncios || []).map((ad) => ({ ...ad, estadoRevision: 'publicado' }))
        }),
        'Admin aprobó todos los anuncios pendientes en cola'
      );
    },

    eliminarAnuncioIndividualPorAdmin(idAnuncio) {
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          anuncios: (st.anuncios || []).filter((ad) => ad.id !== idAnuncio)
        }),
        `Admin eliminó el anuncio "${idAnuncio}"`
      );
    },

    /**
     * 🧹 Botón exclusivo Admin: Borra granularmente TODAS las publicaciones de un usuario, empresa o huella de dispositivo.
     * @param {string} nombreUsuarioEmpresaOHuella
     */
    borrarPublicacionesPorUsuarioOEmpresa(nombreUsuarioEmpresaOHuella) {
      const criterio = String(nombreUsuarioEmpresaOHuella || '').trim().toLowerCase();
      if (!criterio) return 0;

      const antes = (leerEstadoInmutable(estado).anuncios || []).length;
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          anuncios: (st.anuncios || []).filter((ad) => {
            const coincideAutor = String(ad.autorNombre || '').toLowerCase() === criterio;
            const coincideEmpresa = String(ad.empresa || '').toLowerCase() === criterio;
            const coincideHuella = String(ad.huellaDispositivoId || '').toLowerCase() === criterio;
            return !coincideAutor && !coincideEmpresa && !coincideHuella;
          })
        }),
        `Admin borró todas las publicaciones de "${nombreUsuarioEmpresaOHuella}"`
      );
      const despues = (leerEstadoInmutable(estado).anuncios || []).length;
      return antes - despues;
    },

    /**
     * 🧨 Botón exclusivo Admin: Borra TODOS los anuncios del tablón.
     */
    borrarTodosLosAnunciosPorAdmin() {
      const total = (leerEstadoInmutable(estado).anuncios || []).length;
      mutarEstadoConHistorial(
        estado,
        (st) => ({
          ...st,
          anuncios: []
        }),
        `Admin vació todos los anuncios del tablón (${total} eliminados)`
      );
      return total;
    }
  };
}
