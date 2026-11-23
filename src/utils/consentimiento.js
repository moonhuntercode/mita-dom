// @ts-check
/**
 * 🍪 Gestor Reactivo y Auto-Administrable de Términos y Condiciones, Cookies, Analíticas y Guía en la Nube
 *
 * - Garantiza privacidad por diseño: bloquea cualquier evento de analítica mientras
 *   el usuario no haya aceptado explícitamente Términos y Cookies de Analítica.
 * - Es 100% Auto-Administrable: el administrador (o usuario con control granular) puede
 *   editar en caliente el texto de Términos y Condiciones, las reglas de cada categoría,
 *   la URL de la Guía en la Nube y exportar/importar el snapshot JSON para sincronizarlo
 *   con el File System o repositorio Git.
 */
import { crearEstadoCompartido } from '../core/signals.js';

/**
 * Crea o recupera un controlador compartido y auto-administrable de Consentimiento.
 *
 * @param {Object} [opciones={}]
 * @param {string} [opciones.nombreEstado='sistema:consentimiento_cookies']
 * @param {boolean} [opciones.persistirLocal=true]
 * @param {string} [opciones.versionTerminos='2026-11-22']
 * @param {string} [opciones.textoTerminos]
 * @param {string} [opciones.urlGuiaNube]
 */
export function crearGestorConsentimiento(opciones = {}) {
  const nombreEstado = opciones.nombreEstado || 'sistema:consentimiento_cookies';

  const estado = crearEstadoCompartido(
    nombreEstado,
    {
      decidido: false,
      terminosAceptados: false,
      cookiesEsenciales: true, // Siempre activas por funcionamiento técnico
      cookiesPreferencias: false,
      cookiesAnaliticas: false,
      cookiesMarketing: false,
      versionTerminos: opciones.versionTerminos || '2026-11-22',
      textoTerminos:
        opciones.textoTerminos ||
        'Acepto los Términos y Condiciones de uso, el almacenamiento local seguro y las políticas de privacidad vigentes.',
      reglasAnalitica:
        'Las analíticas están desactivadas por defecto y solo se registran cuando terminosAceptados y cookiesAnaliticas son true.',
      urlGuiaNube:
        opciones.urlGuiaNube || 'https://github.com/moonhuntercode/mita-dom/tree/main/docs',
      eventosAnalitica: [],
      ultimoAviso: 'Esperando decisión de privacidad del usuario.'
    },
    {
      persistirLocal: opciones.persistirLocal ?? true,
      descripcion: 'Consentimiento y políticas auto-administrables de Términos, Cookies, Analíticas y Guía en la Nube.',
      reglas: 'registrarAnalitica() solo almacena o emite eventos si terminosAceptados && cookiesAnaliticas son true.'
    }
  );

  return {
    estado,

    aceptarTodo() {
      estado.patch({
        decidido: true,
        terminosAceptados: true,
        cookiesEsenciales: true,
        cookiesPreferencias: true,
        cookiesAnaliticas: true,
        cookiesMarketing: true,
        ultimoAviso: '✅ Aceptaste Términos, Cookies de Preferencias y Analíticas.'
      });
      return estado.get();
    },

    soloEsenciales() {
      estado.patch({
        decidido: true,
        terminosAceptados: true,
        cookiesEsenciales: true,
        cookiesPreferencias: false,
        cookiesAnaliticas: false,
        cookiesMarketing: false,
        ultimoAviso: '🛡️ Modo estricto activo: solo Cookies Esenciales (Analíticas bloqueadas).'
      });
      return estado.get();
    },

    guardarPreferencias({
      terminosAceptados,
      cookiesPreferencias,
      cookiesAnaliticas,
      cookiesMarketing
    }) {
      if (!terminosAceptados) {
        estado.patch({
          ultimoAviso: '⚠️ Debes aceptar los Términos y Condiciones de uso.'
        });
        return { ok: false, motivo: 'Debes aceptar los Términos y Condiciones.' };
      }

      estado.patch({
        decidido: true,
        terminosAceptados: true,
        cookiesEsenciales: true,
        cookiesPreferencias: Boolean(cookiesPreferencias),
        cookiesAnaliticas: Boolean(cookiesAnaliticas),
        cookiesMarketing: Boolean(cookiesMarketing),
        ultimoAviso: `⚙️ Preferencias granulares guardadas (Preferencias=${Boolean(cookiesPreferencias)}, Analíticas=${Boolean(cookiesAnaliticas)}).`
      });
      return { ok: true, estado: estado.get() };
    },

    /**
     * 🛠️ Permite al Administrador editar en vivo los Términos y Condiciones, la versión,
     * las reglas de analítica y el enlace a la Guía en la Nube.
     * @param {{ textoTerminos?: string, versionTerminos?: string, reglasAnalitica?: string, urlGuiaNube?: string }} nuevasPoliticas
     */
    actualizarTerminosYPoliticas(nuevasPoliticas = {}) {
      const actual = estado.get();
      estado.patch({
        textoTerminos: nuevasPoliticas.textoTerminos
          ? String(nuevasPoliticas.textoTerminos).trim()
          : actual.textoTerminos,
        versionTerminos: nuevasPoliticas.versionTerminos
          ? String(nuevasPoliticas.versionTerminos).trim()
          : actual.versionTerminos,
        reglasAnalitica: nuevasPoliticas.reglasAnalitica
          ? String(nuevasPoliticas.reglasAnalitica).trim()
          : actual.reglasAnalitica,
        urlGuiaNube: nuevasPoliticas.urlGuiaNube
          ? String(nuevasPoliticas.urlGuiaNube).trim()
          : actual.urlGuiaNube,
        ultimoAviso: '🛡️ Políticas de Términos, Cookies y Guía en la Nube actualizadas por Administración.'
      });
      return estado.get();
    },

    /**
     * ☁️ Exporta el snapshot serializable para respaldarlo en File System (`.json`) o en la nube.
     */
    exportarSnapshotNube() {
      const actual = estado.get();
      return {
        exportadoEn: new Date().toISOString(),
        nombreEstado,
        versionTerminos: actual.versionTerminos,
        textoTerminos: actual.textoTerminos,
        reglasAnalitica: actual.reglasAnalitica,
        urlGuiaNube: actual.urlGuiaNube,
        preferenciasUsuario: {
          decidido: actual.decidido,
          terminosAceptados: actual.terminosAceptados,
          cookiesEsenciales: actual.cookiesEsenciales,
          cookiesPreferencias: actual.cookiesPreferencias,
          cookiesAnaliticas: actual.cookiesAnaliticas,
          cookiesMarketing: actual.cookiesMarketing
        }
      };
    },

    /**
     * 📥 Restaura o sincroniza políticas y preferencias desde un snapshot JSON del File System o nube.
     * @param {Record<string, any>} snapshot
     */
    importarSnapshotNube(snapshot = {}) {
      if (!snapshot || typeof snapshot !== 'object') return estado.get();
      const prefs = snapshot.preferenciasUsuario || {};
      estado.patch({
        versionTerminos: snapshot.versionTerminos ?? estado.get().versionTerminos,
        textoTerminos: snapshot.textoTerminos ?? estado.get().textoTerminos,
        reglasAnalitica: snapshot.reglasAnalitica ?? estado.get().reglasAnalitica,
        urlGuiaNube: snapshot.urlGuiaNube ?? estado.get().urlGuiaNube,
        decidido: prefs.decidido ?? estado.get().decidido,
        terminosAceptados: prefs.terminosAceptados ?? estado.get().terminosAceptados,
        cookiesPreferencias: prefs.cookiesPreferencias ?? estado.get().cookiesPreferencias,
        cookiesAnaliticas: prefs.cookiesAnaliticas ?? estado.get().cookiesAnaliticas,
        cookiesMarketing: prefs.cookiesMarketing ?? estado.get().cookiesMarketing,
        ultimoAviso: '☁️ Configuración de Términos y Cookies sincronizada desde Snapshot.'
      });
      return estado.get();
    },

    revocarConsentimiento() {
      estado.patch({
        decidido: false,
        terminosAceptados: false,
        cookiesPreferencias: false,
        cookiesAnaliticas: false,
        cookiesMarketing: false,
        eventosAnalitica: [],
        ultimoAviso: '🔄 Consentimiento revocado y eventos de analítica purgados.'
      });
    },

    /**
     * Registra un evento de analítica SOLO si el usuario aceptó Términos y Cookies Analíticas.
     * @param {string} nombreEvento
     * @param {Record<string, any>} [metadata={}]
     */
    registrarAnalitica(nombreEvento, metadata = {}) {
      const actual = estado.get();
      if (!actual.terminosAceptados || !actual.cookiesAnaliticas) {
        estado.patch({
          ultimoAviso: `🚫 Evento "${nombreEvento}" bloqueado: el usuario no autorizó Cookies Analíticas o Términos.`
        });
        return { enviado: false, motivo: 'Sin consentimiento de analíticas o términos.' };
      }

      const nuevoEvento = {
        id: Date.now(),
        evento: nombreEvento,
        metadata,
        fecha: new Date().toISOString()
      };

      const lista = [nuevoEvento, ...(actual.eventosAnalitica || [])].slice(0, 20);
      estado.patch({
        eventosAnalitica: lista,
        ultimoAviso: `📊 Evento de analítica "${nombreEvento}" registrado con éxito.`
      });
      return { enviado: true, evento: nuevoEvento };
    }
  };
}
