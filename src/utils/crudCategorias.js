// @ts-check
/**
 * 🗂️ Controlador CRUD Multi-Categoría + Control Granular de Estrategias de Render por Vista
 * + Gamificación de Lectura, Resaltado de Texto y Analíticas de Precisión.
 *
 * Diseñado con sintaxis verbosa y auto-explicativa en español y protección de memoria tipo Rust.
 */
import {
  crearEstadoReactivoInmutable,
  leerEstadoInmutable,
  mutarEstadoConHistorial,
  obtenerHistorialDeMutaciones
} from '../core/rustGuard.js';
import { filtrarColeccion } from './chatGuard.js';
import { renderizarVistaUniversal } from '../core/ssr.js';

/**
 * 1. 📦 CRUD Completo Multi-Categoría con Filtración, Búsqueda y Auditoría
 * Ideal para administrar Empleos, Productos, Cursos, Documentos o Servicios con un solo motor.
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='crud:catalogo_multicategoria']
 * @param {boolean} [opciones.persistirEnLocalStorage=true]
 * @param {Array<Record<string, any>>} [opciones.registrosIniciales]
 * @param {string[]} [opciones.categoriasPermitidas]
 */
export function crearControladorCrudCategorias(opciones = {}) {
  const nombreEstado = opciones.nombreEstado || 'crud:catalogo_multicategoria';
  const categoriasPermitidas = opciones.categoriasPermitidas || [
    'empleos',
    'productos',
    'cursos',
    'documentos',
    'servicios'
  ];

  const registrosPorDefecto = opciones.registrosIniciales || [
    {
      id: 'item-1',
      titulo: 'Arquitecto Frontend Mita-DOM',
      categoria: 'empleos',
      descripcion: 'Desarrollo de Web Components Light DOM y Signals granulares.',
      valorNumerico: 8500,
      destacado: true,
      creadoEn: '2026-11-22'
    },
    {
      id: 'item-2',
      titulo: 'Licencia Enterprise Mita-DOM Cloud',
      categoria: 'productos',
      descripcion: 'Soporte SSR/SSG/Hybrid e Islas con sincronización File System.',
      valorNumerico: 450,
      destacado: true,
      creadoEn: '2026-11-22'
    },
    {
      id: 'item-3',
      titulo: 'Curso Intensivo: Signals y Rust Memory Guard',
      categoria: 'cursos',
      descripcion: 'Aprende Borrow Checker (&T / &mut T) y RAII Drop en JavaScript.',
      valorNumerico: 180,
      destacado: false,
      creadoEn: '2026-11-22'
    }
  ];

  const estado = crearEstadoReactivoInmutable(
    nombreEstado,
    {
      categorias: categoriasPermitidas,
      registros: registrosPorDefecto,
      filtrosActivos: {
        textoBusqueda: '',
        categoriaActiva: 'todos',
        soloDestacados: false
      }
    },
    {
      compartidoEntreComponentes: true,
      persistirEnLocalStorage: opciones.persistirEnLocalStorage ?? true,
      descripcionDelEstado: 'Catálogo CRUD Multi-Categoría con búsqueda, filtrado y auditoría.',
      reglasDeNegocio: 'Todo registro requiere título y una categoría válida.'
    }
  );

  return {
    estado,

    leerEstadoInmutable() {
      return leerEstadoInmutable(estado);
    },

    /**
     * Actualiza los criterios de búsqueda y filtrado en vivo.
     * @param {{ textoBusqueda?: string, categoriaActiva?: string, soloDestacados?: boolean }} nuevosFiltros
     */
    aplicarFiltrosDeBusqueda(nuevosFiltros = {}) {
      return mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          filtrosActivos: {
            ...actual.filtrosActivos,
            ...nuevosFiltros
          }
        }),
        `Filtro actualizado: busqueda="${nuevosFiltros.textoBusqueda ?? ''}", categoria="${nuevosFiltros.categoriaActiva ?? ''}"`
      );
    },

    /**
     * Devuelve la lista de registros filtrada según los filtros activos o los pasados por argumento.
     * @param {{ textoBusqueda?: string, categoriaActiva?: string, soloDestacados?: boolean }} [filtrosOverride]
     */
    listarRegistrosFiltrados(filtrosOverride) {
      const actual = leerEstadoInmutable(estado);
      const f = { ...actual.filtrosActivos, ...(filtrosOverride || {}) };

      let lista = filtrarColeccion(actual.registros || [], {
        busqueda: f.textoBusqueda || '',
        categoria: f.categoriaActiva || 'todos',
        campoCategoria: 'categoria',
        camposTexto: ['titulo', 'descripcion', 'categoria']
      });

      if (f.soloDestacados) {
        lista = lista.filter((item) => Boolean(item.destacado));
      }
      return lista;
    },

    /**
     * ➕ CREATE: Crea un nuevo registro validando título y categoría.
     * @param {{ titulo: string, categoria: string, descripcion?: string, valorNumerico?: number, destacado?: boolean }} datos
     */
    crearNuevoRegistro(datos) {
      const titulo = String(datos?.titulo || '').trim();
      const categoria = String(datos?.categoria || 'empleos').trim().toLowerCase();
      if (!titulo) {
        throw new Error('[CRUD] El título del registro es obligatorio.');
      }

      const nuevo = {
        id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        titulo,
        categoria,
        descripcion: String(datos?.descripcion || 'Sin descripción adicional.').trim(),
        valorNumerico: Number(datos?.valorNumerico) || 0,
        destacado: Boolean(datos?.destacado),
        creadoEn: new Date().toISOString().split('T')[0]
      };

      mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          registros: [nuevo, ...(actual.registros || [])]
        }),
        `Creado registro "${nuevo.titulo}" en categoría "${nuevo.categoria}"`
      );

      return nuevo;
    },

    /**
     * ✏️ UPDATE: Actualiza un registro existente por su ID.
     * @param {string} idRegistro
     * @param {Record<string, any>} cambiosParciales
     * @param {string} [motivo='Actualización de registro CRUD']
     */
    actualizarRegistroExistente(idRegistro, cambiosParciales, motivo = 'Actualización de registro CRUD') {
      let actualizado = null;
      mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          registros: (actual.registros || []).map((item) => {
            if (item.id !== idRegistro) return item;
            actualizado = {
              ...item,
              ...cambiosParciales,
              id: item.id
            };
            return actualizado;
          })
        }),
        motivo
      );
      return actualizado;
    },

    /**
     * ⭐ Alterna la marca `destacado` de un registro.
     * @param {string} idRegistro
     */
    alternarDestacadoPorId(idRegistro) {
      const actual = leerEstadoInmutable(estado);
      const encontrado = (actual.registros || []).find((r) => r.id === idRegistro);
      if (!encontrado) return null;
      return this.actualizarRegistroExistente(
        idRegistro,
        { destacado: !encontrado.destacado },
        `Alternado destacado en "${encontrado.titulo}"`
      );
    },

    /**
     * 🗑️ DELETE: Elimina un registro por ID.
     * @param {string} idRegistro
     * @param {string} [motivo='Eliminación de registro CRUD']
     */
    eliminarRegistroPorId(idRegistro, motivo = 'Eliminación de registro CRUD') {
      const antes = (leerEstadoInmutable(estado).registros || []).length;
      mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          registros: (actual.registros || []).filter((item) => item.id !== idRegistro)
        }),
        motivo
      );
      const despues = (leerEstadoInmutable(estado).registros || []).length;
      return despues < antes;
    },

    /**
     * 📊 Devuelve métricas agrupadas por categoría e historial de mutaciones.
     */
    obtenerEstadisticasPorCategoria() {
      const actual = leerEstadoInmutable(estado);
      const registros = actual.registros || [];
      /** @type {Record<string, number>} */
      const conteoPorCategoria = {};
      (actual.categorias || []).forEach((cat) => {
        conteoPorCategoria[cat] = 0;
      });
      registros.forEach((r) => {
        conteoPorCategoria[r.categoria] = (conteoPorCategoria[r.categoria] || 0) + 1;
      });

      return {
        totalRegistros: registros.length,
        totalDestacados: registros.filter((r) => r.destacado).length,
        conteoPorCategoria,
        historialCambios: obtenerHistorialDeMutaciones(estado)
      };
    },

    reiniciarDatosDeFabrica() {
      return mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          registros: registrosPorDefecto,
          filtrosActivos: { textoBusqueda: '', categoriaActiva: 'todos', soloDestacados: false }
        }),
        'Reinicio a datos de fábrica del catálogo CRUD'
      );
    }
  };
}

/**
 * 2. 🌐 Controlador Granular de Estrategia de Render por Vista (`Hybrid`, `SSR`, `SSG`, `CSR`)
 * Permite configurar, cambiar en caliente o activar/desactivar el modo de renderizado
 * de cada ruta específica sin tocar el resto de la aplicación.
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='router:estrategias_por_vista']
 */
export function crearControladorEstrategiaPorVista(opciones = {}) {
  const nombreEstado = opciones.nombreEstado || 'router:estrategias_por_vista';

  const mapaInicial = {
    '/inicio': {
      ruta: '/inicio',
      titulo: 'Portada & Hero',
      modo: 'hybrid',
      habilitada: true,
      hidratarIslasCliente: true,
      explicacion: 'HTML instantáneo desde servidor + Islas interactivas en cliente.'
    },
    '/empleos': {
      ruta: '/empleos',
      titulo: 'Tablón de Empleos (MySQL + Signals)',
      modo: 'ssr',
      habilitada: true,
      hidratarIslasCliente: true,
      explicacion: 'SSR dinámico en cada request para SEO de ofertas laborales en tiempo real.'
    },
    '/docs': {
      ruta: '/docs',
      titulo: 'Documentación & Tutoriales',
      modo: 'ssg',
      habilitada: true,
      hidratarIslasCliente: true,
      explicacion: 'Pre-compilado estático (SSG) ultra-rápido con hidratación del buscador.'
    },
    '/admin': {
      ruta: '/admin',
      titulo: 'Dashboard Privado de Administración',
      modo: 'csr',
      habilitada: true,
      hidratarIslasCliente: true,
      explicacion: '100% Client-Side Rendering (CSR / SPA): no necesita indexación SEO.'
    }
  };

  const estado = crearEstadoReactivoInmutable(nombreEstado, mapaInicial, {
    compartidoEntreComponentes: true,
    persistirEnLocalStorage: true,
    descripcionDelEstado: 'Configuración granular del modo de renderizado (Hybrid/SSR/SSG/CSR) y estado ON/OFF por vista.',
    reglasDeNegocio: 'Si una vista tiene habilitada === false, renderizarVistaConConfiguracion() devuelve el aviso de vista desactivada.'
  });

  return {
    estado,

    obtenerConfiguracionDeVista(ruta) {
      const mapa = leerEstadoInmutable(estado);
      return (
        mapa[ruta] || {
          ruta,
          titulo: ruta,
          modo: 'hybrid',
          habilitada: true,
          hidratarIslasCliente: true,
          explicacion: 'Modo Hybrid por defecto.'
        }
      );
    },

    /**
     * Cambia en caliente la estrategia (`'hybrid' | 'ssr' | 'ssg' | 'csr'`) de una vista específica.
     * @param {string} ruta
     * @param {'hybrid' | 'ssr' | 'ssg' | 'csr'} nuevoModo
     */
    cambiarModoDeVistaEnCaliente(ruta, nuevoModo) {
      const actual = this.obtenerConfiguracionDeVista(ruta);
      return mutarEstadoConHistorial(
        estado,
        (mapa) => ({
          ...mapa,
          [ruta]: {
            ...actual,
            modo: nuevoModo
          }
        }),
        `Vista "${ruta}" cambiada a estrategia ${String(nuevoModo).toUpperCase()}`
      );
    },

    /**
     * Activa o desactiva una vista específica de forma granular.
     * @param {string} ruta
     * @param {boolean} habilitada
     */
    activarODesactivarVista(ruta, habilitada) {
      const actual = this.obtenerConfiguracionDeVista(ruta);
      return mutarEstadoConHistorial(
        estado,
        (mapa) => ({
          ...mapa,
          [ruta]: {
            ...actual,
            habilitada: Boolean(habilitada)
          }
        }),
        `Vista "${ruta}" ${habilitada ? 'ACTIVADA' : 'DESACTIVADA'} por control granular`
      );
    },

    listarMapaDeVistas() {
      return Object.values(leerEstadoInmutable(estado));
    },

    /**
     * Renderiza una clase de vista aplicando automáticamente la estrategia y el estado ON/OFF configurados para su ruta.
     * @param {string} ruta
     * @param {any} VistaOClase
     */
    async renderizarVistaConConfiguracion(ruta, VistaOClase) {
      const cfg = this.obtenerConfiguracionDeVista(ruta);
      if (!cfg.habilitada) {
        return {
          ruta,
          habilitada: false,
          modoAplicado: 'disabled',
          head: `<title>Vista ${ruta} Desactivada</title>`,
          body: `<section data-vista-estado="desactivada">🔴 La vista <strong>${ruta}</strong> (${cfg.titulo}) está desactivada temporalmente por control granular.</section>`
        };
      }

      const resultado = await renderizarVistaUniversal(VistaOClase, {
        url: ruta,
        modo: cfg.modo,
        contexto: { modo: cfg.modo, ruta }
      });

      return {
        ruta,
        habilitada: true,
        ...resultado
      };
    }
  };
}

/**
 * 3. 🏆 Gestor de Gamificación de Lectura, Resaltado de Texto y Analíticas de Precisión
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='docs:gamificacion_y_resaltados']
 */
export function crearGestorGamificacionLectura(opciones = {}) {
  const nombreEstado = opciones.nombreEstado || 'docs:gamificacion_y_resaltados';

  const estado = crearEstadoReactivoInmutable(
    nombreEstado,
    {
      documentosLeidos: ['readme'],
      puntosXP: 50,
      nivelActual: '🌱 Explorador Mita-DOM',
      resaltados: [
        {
          id: 'hl-1',
          idDoc: 'readme',
          texto: 'Light DOM',
          color: 'amarillo',
          creadoEn: '2026-11-22'
        }
      ],
      metricasPrecision: {
        segundosLecturaAcumulados: 15,
        caracteresAnalizados: 1200,
        eventosPrecisionEmitidos: 0
      }
    },
    {
      compartidoEntreComponentes: true,
      persistirEnLocalStorage: true,
      descripcionDelEstado: 'Progreso gamificado de lectura (XP, Nivel, Guías leídas), resaltados de texto y telemetría de precisión.',
      reglasDeNegocio: 'Cada guía leída otorga +50 XP y cada resaltado +15 XP.'
    }
  );

  function calcularNivelPorXP(xp) {
    if (xp >= 300) return '🦀 Maestro Mita-DOM & Rust Guard';
    if (xp >= 150) return '⚡ Arquitecto Reactivo Light DOM';
    return '🌱 Explorador Mita-DOM';
  }

  return {
    estado,

    /**
     * Marca un documento como leído, suma +50 XP y recalcula el nivel del lector.
     * @param {string} idDoc
     * @param {number} [segundosInvertidos=30]
     */
    marcarDocumentoComoLeido(idDoc, segundosInvertidos = 30) {
      const clave = String(idDoc || 'readme').trim().toLowerCase();
      return mutarEstadoConHistorial(
        estado,
        (actual) => {
          const yaLeido = (actual.documentosLeidos || []).includes(clave);
          const nuevosLeidos = yaLeido
            ? actual.documentosLeidos
            : [...actual.documentosLeidos, clave];
          const nuevoXP = yaLeido ? actual.puntosXP : actual.puntosXP + 50;

          return {
            ...actual,
            documentosLeidos: nuevosLeidos,
            puntosXP: nuevoXP,
            nivelActual: calcularNivelPorXP(nuevoXP),
            metricasPrecision: {
              ...actual.metricasPrecision,
              segundosLecturaAcumulados:
                (actual.metricasPrecision?.segundosLecturaAcumulados || 0) +
                Math.max(1, Number(segundosInvertidos) || 10)
            }
          };
        },
        `Documento "${clave}" marcado como leído (+50 XP)`
      );
    },

    /**
     * 🖍️ Guarda un término o frase resaltada dentro de un documento y otorga +15 XP.
     * @param {string} idDoc
     * @param {string} textoResaltado
     * @param {'amarillo' | 'verde' | 'azul'} [color='amarillo']
     */
    agregarResaltadoDeTexto(idDoc, textoResaltado, color = 'amarillo') {
      const texto = String(textoResaltado || '').trim();
      if (!texto || texto.length < 2) return null;

      const nuevo = {
        id: `hl-${Date.now()}`,
        idDoc: String(idDoc || 'readme').trim().toLowerCase(),
        texto,
        color,
        creadoEn: new Date().toISOString().split('T')[0]
      };

      mutarEstadoConHistorial(
        estado,
        (actual) => {
          const nuevoXP = actual.puntosXP + 15;
          return {
            ...actual,
            puntosXP: nuevoXP,
            nivelActual: calcularNivelPorXP(nuevoXP),
            resaltados: [nuevo, ...(actual.resaltados || [])].slice(0, 30)
          };
        },
        `Texto resaltado en "${nuevo.idDoc}": "${nuevo.texto}" (+15 XP)`
      );

      return nuevo;
    },

    eliminarResaltadoDeTexto(idResaltado) {
      return mutarEstadoConHistorial(
        estado,
        (actual) => ({
          ...actual,
          resaltados: (actual.resaltados || []).filter((h) => h.id !== idResaltado)
        }),
        `Eliminado resaltado ${idResaltado}`
      );
    },

    /**
     * Aplica las etiquetas `<mark class="mita-text-highlight">` sobre un HTML renderizado para los resaltados activos del documento.
     * @param {string} idDoc
     * @param {string} htmlRenderizado
     */
    aplicarResaltadosEnHtml(idDoc, htmlRenderizado) {
      const actual = leerEstadoInmutable(estado);
      const delDoc = (actual.resaltados || []).filter((h) => h.idDoc === idDoc);
      if (delDoc.length === 0) return htmlRenderizado;

      let salida = String(htmlRenderizado || '');
      delDoc.forEach((h) => {
        const terminoSeguro = h.texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        if (!terminoSeguro) return;
        // Evitar reemplazar dentro de atributos o etiquetas HTML (<...>)
        const regex = new RegExp(`(>[^<]*?)(${terminoSeguro})([^<]*?<)`, 'gi');
        salida = salida.replace(
          regex,
          `$1<mark class="docs-user-highlight highlight-${h.color}" data-hl-id="${h.id}">$2</mark>$3`
        );
      });
      return salida;
    },

    /**
     * 📊 Calcula el resumen gamificado y emite analítica de alta precisión si el gestor de consentimiento lo permite.
     * @param {number} [totalCatalogoDocs=28]
     * @param {any} [gestorConsentimiento]
     */
    obtenerResumenGamificacion(totalCatalogoDocs = 28, gestorConsentimiento = null) {
      const actual = leerEstadoInmutable(estado);
      const leidosCount = (actual.documentosLeidos || []).length;
      const total = Math.max(1, totalCatalogoDocs);
      const porcentaje = Math.min(100, Math.round((leidosCount / total) * 100));

      let analiticaEnviada = false;
      if (gestorConsentimiento && typeof gestorConsentimiento.registrarAnalitica === 'function') {
        const res = gestorConsentimiento.registrarAnalitica('lectura_precision_checkpoint', {
          leidosCount,
          porcentajeProgreso: porcentaje,
          puntosXP: actual.puntosXP,
          segundosActivos: actual.metricasPrecision?.segundosLecturaAcumulados || 0
        });
        analiticaEnviada = Boolean(res?.enviado);
      }

      return {
        leidosCount,
        totalCatalogoDocs: total,
        porcentajeProgreso: porcentaje,
        puntosXP: actual.puntosXP,
        nivelActual: actual.nivelActual,
        totalResaltados: (actual.resaltados || []).length,
        segundosLecturaAcumulados: actual.metricasPrecision?.segundosLecturaAcumulados || 0,
        analiticaPrecisionEnviada: analiticaEnviada
      };
    }
  };
}
