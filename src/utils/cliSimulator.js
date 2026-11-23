// @ts-check
/**
 * 🛠️ Generador y Doctor CLI de Mita-DOM (Isomórfico: funciona en Node CLI `bin/mita.js` y en el Browser Sandbox)
 *
 * Inspirado en lo mejor de:
 * - Angular CLI (`ng g c`, `ng g s` con generación automática de `.test.js` y estructura limpia)
 * - Vue / Vite CLI (separación `.html`, `.css` con `@scope` y `.js`)
 * - SolidJS / React (signals granulares, stores desacoplados y páginas SSR/SSG/Hybrid)
 * - Rust Cargo (`mita doctor` / `cargo check` contra fugas de memoria y anti-patrones)
 */

function aKebabCase(texto) {
  return String(texto || 'mi-elemento')
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function aPascalCase(texto) {
  return aKebabCase(texto)
    .split('-')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

/**
 * Genera en memoria los archivos para un componente, store, página universal o diagnóstico `doctor`.
 * @param {string} comandoRaw Ejemplo: `'mita g c TarjetaOferta'`, `'mita g s empleos'`, `'mita g p Menu --hybrid'`, `'mita doctor'`
 */
export function simularComandoCliMita(comandoRaw) {
  const limpio = String(comandoRaw || '').trim().replace(/^npx\s+/i, '').replace(/^mita\s+/i, '');
  const partes = limpio.split(/\s+/).filter(Boolean);
  const accion = (partes[0] || 'help').toLowerCase();

  if (accion === 'doctor' || accion === 'check') {
    return {
      comando: `npx mita doctor`,
      tipo: 'doctor',
      resumen: '🩺 Diagnóstico de Salud Mita-DOM (Estilo Rust Cargo Check + Angular Doctor)',
      archivos: [
        {
          ruta: 'reporte-doctor.txt',
          contenido: [
            '🩺 [Mita Doctor v2.7] Ejecutando auditoría integral...',
            '  ✔ 1. Arquitectura Light DOM: 0 llamadas a attachShadow() detectadas.',
            '  ✔ 2. Rust Memory Guard: Todos los componentes usan crearAmbitoConLimpiezaAutomatica() o registrarLimpieza().',
            '  ✔ 3. Registro de Estados Compartidos: 0 colisiones de persistKey en localStorage.',
            '  ✔ 4. Pure CSS3 Mobile-First: @scope y :root verificados (0 CSS muerto).',
            '  ✔ 5. HTML5 Semántico: <header>, <main>, <section>, <article>, <aside>, <dialog> sin div-soup.'
          ].join('\n')
        }
      ]
    };
  }

  if (accion === 'g' || accion === 'generate') {
    const subtipo = (partes[1] || 'c').toLowerCase();
    const nombreBase = partes[2] || 'MiComponente';
    const flagModo = partes.find((p) => p.startsWith('--')) || '--hybrid';
    const kebab = aKebabCase(nombreBase.includes('-') ? nombreBase : `mita-${nombreBase}`);
    const pascal = aPascalCase(nombreBase);

    if (subtipo === 'c' || subtipo === 'component') {
      return {
        comando: `npx mita g component ${pascal}`,
        tipo: 'component',
        resumen: `🧩 Componente Web Light DOM <${kebab}> + CSS @scope + Test Unitario (Estilo Angular/Vue CLI)`,
        archivos: [
          {
            ruta: `src/componentes/${kebab}/${kebab}.js`,
            contenido: `import {
  MitaElement,
  crearEstadoReactivoInmutable,
  mutarEstadoConHistorial,
  crearAmbitoConLimpiezaAutomatica,
  vincularTexto
} from 'mita-dom';
import './${kebab}.css';

export class ${pascal} extends MitaElement {
  constructor() {
    super();
    this.ambitoMemoria = crearAmbitoConLimpiezaAutomatica('<${kebab}>');
    this.estado = crearEstadoReactivoInmutable('${kebab}:local', { clicks: 0 });
  }

  async render() {
    this.ambitoMemoria.reiniciarAmbitoParaNuevoRender();
    const titulo = this.getAttribute('titulo') || '${pascal}';

    this.innerHTML = \`
      <article class="${kebab}-card">
        <header class="${kebab}-head">
          <h3>\${titulo}</h3>
          <output class="${kebab}-count">0</output>
        </header>
        <button type="button" class="${kebab}-btn">Acción Reactiva</button>
      </article>
    \`;

    const stopTexto = vincularTexto(
      this.estado,
      this.querySelector('.${kebab}-count'),
      (st) => \`\${st.clicks} clics\`
    );
    this.registrarLimpieza(stopTexto);

    this.ambitoMemoria.escucharEventoDomConLimpieza(
      this.querySelector('.${kebab}-btn'),
      'click',
      () => {
        mutarEstadoConHistorial(
          this.estado,
          (actual) => ({ clicks: actual.clicks + 1 }),
          'Clic en botón de ${kebab}'
        );
      }
    );
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.ambitoMemoria.liberarMemoriaCompleta();
  }
}

if (!customElements.get('${kebab}')) {
  customElements.define('${kebab}', ${pascal});
}
`
          },
          {
            ruta: `src/componentes/${kebab}/${kebab}.css`,
            contenido: `@scope (${kebab}) {
  :scope {
    display: block;
  }

  .${kebab}-card {
    display: grid;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 10px;
    border: 1px solid var(--color-borde, rgba(255, 255, 255, 0.14));
  }

  .${kebab}-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.5rem;
  }
}
`
          },
          {
            ruta: `test/${kebab}.test.js`,
            contenido: `import { describe, it, expect } from 'vitest';
import '../src/componentes/${kebab}/${kebab}.js';

describe('<${kebab}> (Generado por Mita CLI)', () => {
  it('monta en Light DOM y libera memoria con RustGuard al desmontar', async () => {
    const el = document.createElement('${kebab}');
    document.body.appendChild(el);
    el.querySelector('.${kebab}-btn').click();
    expect(el.querySelector('.${kebab}-count').textContent).toBe('1 clics');
    el.remove();
  });
});
`
          }
        ]
      };
    }

    if (subtipo === 's' || subtipo === 'store') {
      const slugStore = aKebabCase(nombreBase).replace(/-/g, '_');
      return {
        comando: `npx mita g store ${slugStore}`,
        tipo: 'store',
        resumen: `📦 Store Compartido con Inmutabilidad Rust (&T / &mut T) + Persistencia Local`,
        archivos: [
          {
            ruta: `src/store/${slugStore}Store.js`,
            contenido: `import {
  crearEstadoReactivoInmutable,
  leerEstadoInmutable,
  mutarEstadoConHistorial,
  obtenerHistorialDeMutaciones
} from 'mita-dom';

export const estado${pascal} = crearEstadoReactivoInmutable(
  'app:${slugStore}',
  {
    habilitado: true,
    items: []
  },
  {
    compartidoEntreComponentes: true,
    persistirEnLocalStorage: true,
    descripcionDelEstado: 'Store compartido ${pascal} generado por Mita CLI',
    reglasDeNegocio: 'Mutar únicamente mediante funciones exportadas con motivo explícito.'
  }
);

export function leer${pascal}() {
  return leerEstadoInmutable(estado${pascal});
}

export function actualizar${pascal}(cambios, motivo = 'Actualización de ${slugStore}') {
  return mutarEstadoConHistorial(estado${pascal}, cambios, motivo);
}

export function auditarHistorial${pascal}() {
  return obtenerHistorialDeMutaciones(estado${pascal});
}
`
          }
        ]
      };
    }

    if (subtipo === 'p' || subtipo === 'page') {
      const modo = flagModo.replace(/^--/, '') || 'hybrid';
      return {
        comando: `npx mita g page ${pascal} --${modo}`,
        tipo: 'page',
        resumen: `🌐 Página Universal (${modo.toUpperCase()}) con SEO MitaMeta e Islas Light DOM`,
        archivos: [
          {
            ruta: `src/pages/${aKebabCase(nombreBase)}.js`,
            contenido: `import { MitaElement, MitaMeta } from 'mita-dom';

export default class ${pascal}Page extends MitaElement {
  static meta_title = '${pascal} — MitaDOM Universal (${modo.toUpperCase()})';
  static meta_description = 'Página universal generada por Mita CLI';

  async onInit(contexto = {}) {
    MitaMeta.useHead({
      title: ${pascal}Page.meta_title,
      meta: [{ name: 'description', content: ${pascal}Page.meta_description }]
    });
  }

  render() {
    return \`
      <section class="page-${aKebabCase(nombreBase)}">
        <header mita-server="only">
          <h1>${pascal} (${modo.toUpperCase()})</h1>
        </header>
        <article>
          <p>Contenido universal listo para SSR, SSG, Hybrid o SPA.</p>
        </article>
      </section>
    \`;
  }
}
`
          }
        ]
      };
    }
  }

  return {
    comando: 'npx mita help',
    tipo: 'help',
    resumen: '📖 Ayuda de Mita-DOM CLI v2.7',
    archivos: [
      {
        ruta: 'cli-help.txt',
        contenido: [
          'Mita-DOM CLI v2.7 (Inspirado en Angular CLI, Vue/Vite, SolidJS y Rust Cargo)',
          '',
          'Comandos disponibles:',
          '  npx mita g component <Nombre>            -> Genera Web Component Light DOM (.js, .css @scope, .test.js)',
          '  npx mita g store <Nombre>                -> Genera Store compartido con Rust Borrow Checker e historial',
          '  npx mita g page <Nombre> [--hybrid|--ssr] -> Genera Página Universal con SEO MitaMeta e Islas',
          '  npx mita doctor                          -> Audita fugas de memoria, persistKey, CSS y Light DOM'
        ].join('\n')
      }
    ]
  };
}
