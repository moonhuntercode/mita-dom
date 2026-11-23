// @ts-check
/**
 * 🌍 Motor Isomórfico de Estrategias de Render (SSR, SSG, Hybrid, Islands y CSR/SPA) + MitaMeta
 * Portado y evolucionado desde `food-show-1` al núcleo de `mita-dom`.
 */
import { crearEstadoCompartido } from './signals.js';

function escaparAtributo(valor) {
  return String(valor ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const estadoHeadGlobal = crearEstadoCompartido(
  'sistema:head_seo',
  {
    title: 'MitaDOM App',
    meta: []
  },
  {
    persistirLocal: false,
    descripcion: 'Estado isomórfico de etiquetas <title> y <meta> para SEO en SSR, SSG y SPA.',
    reglas: 'Actualizable desde cualquier vista con MitaMeta.useHead().'
  }
);

/**
 * 🏷️ Gestor Isomórfico de SEO y `<head>` (Funciona en Node SSR/SSG y en Browser SPA).
 */
export const MitaMeta = {
  /**
   * Define título y meta-tags de la vista actual.
   * @param {{ title?: string, meta?: Array<Record<string, string>> }} config
   */
  useHead(config = {}) {
    estadoHeadGlobal.patch({
      title: config.title ?? estadoHeadGlobal.get().title,
      meta: Array.isArray(config.meta) ? config.meta : estadoHeadGlobal.get().meta
    });

    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      this.applyToDOM();
    }
  },

  /**
   * Aplica los cambios directamente al `document.head` en el navegador (SPA / Hydration).
   */
  applyToDOM() {
    if (typeof document === 'undefined') return;
    const { title, meta } = estadoHeadGlobal.get();

    if (title && document.title !== title) {
      document.title = title;
    }

    document.querySelectorAll('meta[data-mita-meta]').forEach((el) => el.remove());

    if (Array.isArray(meta)) {
      meta.forEach((tag) => {
        const el = document.createElement('meta');
        el.setAttribute('data-mita-meta', 'true');
        for (const [key, value] of Object.entries(tag)) {
          el.setAttribute(key, String(value));
        }
        document.head.appendChild(el);
      });
    }
  },

  /**
   * Genera el string HTML de `<title>` y `<meta>` para inyectar en `<!--ssr-head-->` durante SSR o SSG.
   * @returns {string}
   */
  renderSSRHead() {
    const { title, meta } = estadoHeadGlobal.get();
    let html = `<title>${escaparAtributo(title)}</title>`;

    if (Array.isArray(meta)) {
      meta.forEach((tag) => {
        const attrs = Object.entries(tag)
          .map(([k, v]) => `${escaparAtributo(k)}="${escaparAtributo(v)}"`)
          .join(' ');
        html += `<meta data-mita-meta="true" ${attrs}>`;
      });
    }

    return html;
  },

  obtenerEstado() {
    return estadoHeadGlobal.get();
  }
};

/**
 * 🚀 Renderizador Universal de Vistas de MitaDOM.
 * Soporta las 4 estrategias:
 * - `'ssr'`: Server-Side Rendering dinámico por petición.
 * - `'ssg'`: Static Site Generation en tiempo de compilación (inyecta `window.__MITA_SSG__ = true`).
 * - `'hybrid'`: SSR/SSG con hidratación selectiva e Islands Architecture (`mita-client="only"`, `mita-server="only"`).
 * - `'csr'` (o `'spa'`): Client-Side Rendering puro (entrega esqueleto ligero en servidor).
 *
 * @param {any} VistaOClase Clase de página o instancia con métodos `onInit?()`, `render()`, `hydrate?()`
 * @param {Object} [opciones={}]
 * @param {string} [opciones.url='/'] URL solicitada (soporta `?mita_mode=csr` o `?mita_mode=ssr`)
 * @param {'ssr' | 'ssg' | 'hybrid' | 'csr' | 'spa'} [opciones.modo='hybrid'] Estrategia deseada
 * @param {Record<string, any>} [opciones.contexto={}] Contexto isomórfico (ej. `isSlowNetwork`, usuario)
 * @returns {Promise<{ modoAplicado: string, head: string, body: string, htmlDocumento: string }>}
 */
export async function renderizarVistaUniversal(VistaOClase, opciones = {}) {
  const url = opciones.url || '/';
  const contexto = opciones.contexto || {};
  globalThis.__SSR_CONTEXT__ = contexto;

  const instancia = typeof VistaOClase === 'function' ? new VistaOClase() : VistaOClase;
  const Clase = instancia?.constructor || {};

  // Sincronizar meta-tags estáticos si la clase los declara
  if (Clase.meta_title || Clase.meta_description) {
    MitaMeta.useHead({
      title: Clase.meta_title || 'MitaDOM App',
      meta: Clase.meta_description ? [{ name: 'description', content: Clase.meta_description }] : []
    });
  }

  // Ejecutar ciclo de inicialización isomórfico
  if (typeof instancia?.onInit === 'function') {
    await instancia.onInit(contexto);
  } else if (typeof instancia?.alIniciar === 'function') {
    await instancia.alIniciar(contexto);
  }

  // Determinar estrategia final respetando query params y flags estáticos (como en food-show-1)
  const forzarCSR = url.includes('mita_mode=csr') || opciones.modo === 'csr' || opciones.modo === 'spa';
  const forzarSSR = url.includes('mita_mode=ssr');
  const esCSR = (Boolean(Clase.isCSR) && !forzarSSR) || (forzarCSR && !forzarSSR);

  const modoAplicado = esCSR ? 'csr' : (opciones.modo || 'hybrid');
  const head = MitaMeta.renderSSRHead();

  if (esCSR) {
    const bodyCsr = `<section id="csr-loader" data-mita-mode="csr">⏳ MitaDOM: Renderizando en Cliente (CSR / SPA)...</section>`;
    return {
      modoAplicado: 'csr',
      head,
      body: bodyCsr,
      htmlDocumento: `<!doctype html><html lang="es"><head>${head}</head><body>${bodyCsr}</body></html>`
    };
  }

  let body = typeof instancia?.render === 'function' ? await instancia.render() : '';
  body = String(body || '');

  // 🏝️ ISLAND ARCHITECTURE (SSR Stripping):
  // Si un componente tiene mita-client="only", vaciamos su innerHTML en el servidor
  // para que solo se monte en el navegador.
  body = body.replace(
    /(<([a-z0-9-]+)\b[^>]*\bmita-client="only"[^>]*>)([\s\S]*?)(<\/\2>)/gi,
    '$1$4'
  );

  const scriptSSG =
    modoAplicado === 'ssg' ? '<script>window.__MITA_SSG__ = true;</script>' : '';

  return {
    modoAplicado,
    head: `${head}${scriptSSG}`,
    body,
    htmlDocumento: `<!doctype html><html lang="es"><head>${head}${scriptSSG}</head><body>${body}</body></html>`
  };
}
