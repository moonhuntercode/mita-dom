// @ts-check
/**
 * 🛡️ Utilidades para Chats Reactivos, Control Anti-Spam y Filtración de Colecciones en MitaDOM.
 * Diseñadas para ayudar a crear chats, sistemas de comentarios, tablones de anuncios y buscadores
 * de documentación sin dependencias externas.
 */

/**
 * Crea un guardián Anti-Spam con control de frecuencia (cooldown), detección de mensajes
 * duplicados, límite de longitud y filtrado de palabras o enlaces no permitidos.
 *
 * @param {Object} [opciones={}] Configuración del guardián
 * @param {number} [opciones.cooldownMs=1200] Tiempo mínimo entre mensajes del mismo usuario (ms)
 * @param {number} [opciones.maxLongitud=280] Cantidad máxima de caracteres permitidos
 * @param {string[]} [opciones.palabrasProhibidas=['spam', 'casino', 'phishing', 'estafa']] Lista negra
 * @param {boolean} [opciones.bloquearLinks=false] Si es true, rechaza mensajes con http:// o https://
 * @param {boolean} [opciones.bloquearDuplicados=true] Si es true, impide repetir el mismo texto seguido
 * @returns {{
 *   evaluarMensaje: (texto: string, usuario?: string) => { permitido: boolean, motivo: string | null, textoLimpio: string, esperaMs: number },
 *   reiniciar: () => void
 * }}
 */
export function crearControlSpam(opciones = {}) {
  const config = {
    cooldownMs: opciones.cooldownMs ?? 1200,
    maxLongitud: opciones.maxLongitud ?? 280,
    palabrasProhibidas: opciones.palabrasProhibidas || ['spam', 'casino', 'phishing', 'estafa'],
    bloquearLinks: Boolean(opciones.bloquearLinks),
    bloquearDuplicados: opciones.bloquearDuplicados ?? true
  };

  /** @type {Map<string, { ultimoEnvioMs: number, ultimoTexto: string }>} */
  const historialPorUsuario = new Map();

  return {
    evaluarMensaje(textoRaw, usuario = 'anonimo') {
      const textoLimpio = String(textoRaw ?? '').trim();
      const ahora = Date.now();

      if (!textoLimpio) {
        return {
          permitido: false,
          motivo: 'El mensaje no puede estar vacío.',
          textoLimpio: '',
          esperaMs: 0
        };
      }

      if (textoLimpio.length > config.maxLongitud) {
        return {
          permitido: false,
          motivo: `El mensaje supera el límite de ${config.maxLongitud} caracteres.`,
          textoLimpio,
          esperaMs: 0
        };
      }

      const registro = historialPorUsuario.get(usuario);
      if (registro) {
        const transcurrido = ahora - registro.ultimoEnvioMs;
        if (transcurrido < config.cooldownMs) {
          const esperaMs = config.cooldownMs - transcurrido;
          return {
            permitido: false,
            motivo: `Control Anti-Spam: espera ${(esperaMs / 1000).toFixed(1)}s antes de enviar otro mensaje.`,
            textoLimpio,
            esperaMs
          };
        }

        if (config.bloquearDuplicados && registro.ultimoTexto.toLowerCase() === textoLimpio.toLowerCase()) {
          return {
            permitido: false,
            motivo: 'Control Anti-Spam: mensaje duplicado consecutivo bloqueado.',
            textoLimpio,
            esperaMs: 0
          };
        }
      }

      if (config.bloquearLinks && /(https?:\/\/|www\.)/i.test(textoLimpio)) {
        return {
          permitido: false,
          motivo: 'Control Anti-Spam: no se permiten enlaces externos en este canal.',
          textoLimpio,
          esperaMs: 0
        };
      }

      const palabraDetectada = config.palabrasProhibidas.find((palabra) =>
        textoLimpio.toLowerCase().includes(String(palabra).toLowerCase())
      );

      if (palabraDetectada) {
        return {
          permitido: false,
          motivo: `Control Anti-Spam: el término "${palabraDetectada}" está restringido por moderación.`,
          textoLimpio,
          esperaMs: 0
        };
      }

      historialPorUsuario.set(usuario, {
        ultimoEnvioMs: ahora,
        ultimoTexto: textoLimpio
      });

      return {
        permitido: true,
        motivo: null,
        textoLimpio,
        esperaMs: 0
      };
    },

    reiniciar() {
      historialPorUsuario.clear();
    }
  };
}

/**
 * 🔍 Filtra una colección de objetos por término de búsqueda y categoría.
 * Ideal para buscadores de documentación, salas de chat, listas de novedades o anuncios.
 *
 * @template T
 * @param {T[]} coleccion Lista original de elementos
 * @param {Object} [filtros={}] Opciones de filtrado
 * @param {string} [filtros.busqueda=''] Texto a buscar
 * @param {string} [filtros.categoria='todos'] Categoría seleccionada ('todos' o 'all' no filtra)
 * @param {string} [filtros.campoCategoria='categoria'] Propiedad donde vive la categoría
 * @param {string[]} [filtros.camposTexto=['titulo', 'texto', 'contenido', 'autor']] Propiedades donde buscar texto
 * @returns {T[]} Subconjunto filtrado sin mutar la colección original
 */
export function filtrarColeccion(coleccion, filtros = {}) {
  if (!Array.isArray(coleccion)) return [];

  const termino = String(filtros.busqueda ?? '').trim().toLowerCase();
  const categoria = String(filtros.categoria ?? 'todos').trim().toLowerCase();
  const campoCat = filtros.campoCategoria || 'categoria';
  const camposTexto = filtros.camposTexto || ['titulo', 'texto', 'contenido', 'autor'];

  return coleccion.filter((item) => {
    if (!item || typeof item !== 'object') return false;

    const pasaCategoria =
      !categoria ||
      categoria === 'todos' ||
      categoria === 'all' ||
      String(item[campoCat] ?? '').toLowerCase() === categoria;

    if (!pasaCategoria) return false;
    if (!termino) return true;

    return camposTexto.some((campo) =>
      String(item[campo] ?? '').toLowerCase().includes(termino)
    );
  });
}
