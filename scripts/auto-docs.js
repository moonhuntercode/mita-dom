// @ts-check
/**
 * 🤖 Auto-Documentador Oficial de MitaDOM
 * 1. Escanea `src/` y genera automáticamente `docs/referencia/AUTO_API_REFERENCIA.md`
 *    extrayendo exports reales y sus comentarios JSDoc.
 * 2. Consolida todos los archivos de `changelogs/*.md` en `CHANGELOG.md` y
 *    `docs/changelogs/CHANGELOG.md` para que el proyecto siempre esté auto-documentado.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const FECHA_HOY = new Date().toISOString().split('T')[0];

/**
 * Extrae símbolos exportados (class, function, const) con su bloque JSDoc previo.
 * @param {string} contenido
 */
function extraerExportsConDoc(contenido) {
  const regex = /(?:\/\*\*([\s\S]*?)\*\/\s*)?export\s+(?:async\s+)?(class|function|const)\s+([A-Za-z0-9_$]+)(\([^)]*\))?/g;
  const items = [];
  let match;

  while ((match = regex.exec(contenido)) !== null) {
    const jsdocRaw = match[1] || '';
    const tipo = match[2];
    const nombre = match[3];
    const params = match[4] || '';

    const lineasDoc = jsdocRaw
      .split('\n')
      .map((l) => l.replace(/^\s*\*\s?/, '').trim())
      .filter((l) => l.length > 0 && !l.startsWith('@ts-'));

    const descripcion = lineasDoc.filter((l) => !l.startsWith('@')).join(' ');
    const etiquetas = lineasDoc.filter((l) => l.startsWith('@param') || l.startsWith('@returns'));

    items.push({
      tipo,
      nombre,
      firma: tipo === 'function' ? `${nombre}${params}` : nombre,
      descripcion: descripcion || 'Símbolo público exportado por el núcleo de MitaDOM.',
      etiquetas
    });
  }

  return items;
}

function generarReferenciaAPI() {
  const categorias = [
    {
      titulo: '⚡ 1. Hooks / Signals y Reactividad Granular',
      resumen: 'Equivalente a `useState`, `useMemo`, `useEffect`, `useContext` y `untrack` sin Virtual DOM.',
      archivos: ['src/core/signals.js', 'src/core/render.js', 'src/core/resource.js']
    },
    {
      titulo: '🧬 2. Componentes Nativos, Ciclo de Vida y Props/@defer',
      resumen: 'Web Components Light DOM con ciclo de vida en español (`alCrear` → `render` → `alMontar` → `alCambiarProp` → `alDesmontar`), Props complejas y `@defer`.',
      archivos: ['src/core/mitaElement.js', 'src/core/componentes.js', 'src/core/propsYDefer.js']
    },
    {
      titulo: '🌐 3. Async Graph (Solid 2.0), Server Functions, Routing y SSR/Islands',
      resumen: 'Promesas en el grafo reactivo, `live()` SSE, Optimistic Rollback, estrategias de render en 1 línea y Router SPA.',
      archivos: ['src/core/asyncGraph.js', 'src/core/ssr.js', 'src/core/router.js', 'src/core/mitaRouter.js']
    },
    {
      titulo: '🦀 4. Seguridad, Protección de Memoria (RustGuard) y Animaciones',
      resumen: 'Borrow Checker inmutable (`&T`/`&mut T`), RAII Drop, sanitización XSS, `mitaResult` y animaciones nativas.',
      archivos: ['src/core/rustGuard.js', 'src/seguridad.js', 'src/utils/result.js', 'src/core/mitaAnim.js', 'src/core/mitaTween.js']
    },
    {
      titulo: '🛡️ 5. UI, Formularios, Moderación, Fullstack y DevTools',
      resumen: 'FormBuilder Auth, Consentimiento, Chat Anti-Spam, Paginación, Moderación `"DC"`, CLI `npx mita`, Mita Doc y SemVer Advisor.',
      archivos: [
        'src/utils/chatGuard.js',
        'src/utils/formBuilder.js',
        'src/utils/consentimiento.js',
        'src/utils/cliSimulator.js',
        'src/utils/crudCategorias.js',
        'src/utils/uiModeracionYComunidad.js',
        'src/utils/fullstackYDevtools.js'
      ]
    }
  ];

  const secciones = [];
  const filasResumen = [];

  for (const cat of categorias) {
    const subSecciones = [];
    for (const relPath of cat.archivos) {
      const absPath = path.join(ROOT, relPath);
      if (!fs.existsSync(absPath)) continue;

      const contenido = fs.readFileSync(absPath, 'utf8');
      const exportsEncontrados = extraerExportsConDoc(contenido);
      if (exportsEncontrados.length === 0) continue;

      filasResumen.push(
        `| ${cat.titulo.split(' ')[1]} | \`${relPath}\` | ${exportsEncontrados.map((e) => `\`${e.nombre}\``).join(', ')} |`
      );

      const detalleModulo = exportsEncontrados
        .map((exp) => {
          const listaTags =
            exp.etiquetas.length > 0
              ? `\n${exp.etiquetas.map((t) => `- \`${t}\``).join('\n')}`
              : '';
          return `#### \`${exp.tipo} ${exp.firma}\`\n\n${exp.descripcion}${listaTags}\n`;
        })
        .join('\n');

      subSecciones.push(`### 📦 Módulo \`${relPath}\`\n\n${detalleModulo}`);
    }

    if (subSecciones.length > 0) {
      secciones.push(`## ${cat.titulo}\n\n> ${cat.resumen}\n\n${subSecciones.join('\n')}`);
    }
  }

  const markdown = [
    `# 🤖 Referencia de API Auto-Generada — MitaDOM v${pkg.version}`,
    '',
    `- **Versión:** \`v${pkg.version}\``,
    `- **Fecha de Auto-Generación:** \`${FECHA_HOY}\``,
    `- **Comando:** \`npm run docs:auto\` (\`scripts/auto-docs.js\`)`,
    `- **Guía Profunda + Equivalencias \`react.dev/reference/react\` + Glosario:** \`docs/referencia/REFERENCIA_COMPLETA_REACT_A_MITADOM_GLOSARIO_Y_PROFUNDIZACION_2026-11-23.md\``,
    '',
    '> Este documento se regenera automáticamente leyendo los `export` y JSDoc reales de `src/` y está agrupado por categorías inspiradas en `react.dev/reference/react`.',
    '',
    '## 🧭 Mapa Rápido (React → MitaDOM)',
    '',
    '| Concepto (`react.dev/reference/react`) | Equivalente en MitaDOM |',
    '| --- | --- |',
    '| `useState(inicial)` | `crearEstadoLocal(inicial)` |',
    '| `useMemo(() => ..., [deps])` | `signal.derivar(fn)` o `crearMemoAsincrono(async () => ...)` |',
    '| `useEffect(() => ..., [deps])` | `crearEfecto(() => ...)` (auto-rastreo + `sinRastrear()`) |',
    '| `useContext(Ctx)` | `crearEstadoCompartido(nombre, val)` + `obtenerEstadoCompartido(nombre)` |',
    '| `useOptimistic` / `useActionState` | `crearEstadoOptimistaConRollback()` + `crearFuncionServidor()` |',
    '| `<Suspense>` / `lazy()` | `renderizarVistaDiferida()` (`@defer`) + `crearMemoAsincrono()` |',
    '| `ErrorBoundary` | `MitaElement` nativo (`fallbackUI(err)` + `alError(err, fase)`) |',
    '',
    '## 🗺️ Inventario de Módulos y Exports',
    '',
    '| Grupo | Archivo Fuente | Símbolos Públicos Exportados |',
    '| --- | --- | --- |',
    ...filasResumen,
    '',
    '---',
    '',
    ...secciones,
    '',
    '---',
    '',
    '## 🧠 Para Profundizar y Glosario Esencial',
    '',
    '- **Ciclo de Vida Completo (`MitaElement`):** `alCrear()` → `alAntesDeRenderizar()` → `render()` → `alMontar()` → `alCambiarProp()` → `alActualizar()` → Auto-Limpieza + `alDesmontar()`.',
    '- **`sinRastrear(fn)` (`untrack`):** ejecuta lecturas/mutaciones internas sin registrar dependencias en `crearEfecto()`, eliminando bucles infinitos.',
    '- **Light DOM + `@scope`:** 0 Virtual DOM y 0 Shadow DOM; el SEO, la accesibilidad y CSS3 nativo funcionan sin barreras.',
    '- **Agent Repair Guide:** `skills/reactivity-diagnostics/SKILL.md` documenta cada código `[MITA_*]` para humanos y Agentes IA.'
  ].join('\n');

  const destino = path.join(ROOT, 'docs', 'referencia', 'AUTO_API_REFERENCIA.md');
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, markdown, 'utf8');
  console.log(`✅ [auto-docs] Generado: docs/referencia/AUTO_API_REFERENCIA.md (${filasResumen.length} módulos)`);
}

function consolidarChangelogs() {
  const dirChangelogs = path.join(ROOT, 'changelogs');
  if (!fs.existsSync(dirChangelogs)) return;

  const archivos = fs
    .readdirSync(dirChangelogs)
    .filter((f) => f.endsWith('.md'))
    .sort((a, b) => b.localeCompare(a));

  if (archivos.length === 0) return;

  const bloques = archivos.map((archivo) => {
    const contenido = fs.readFileSync(path.join(dirChangelogs, archivo), 'utf8').trim();
    return `<!-- Fuente: changelogs/${archivo} -->\n${contenido}`;
  });

  const consolidado = [
    `# 📜 Changelog Consolidado de MitaDOM (hasta v${pkg.version})`,
    '',
    `> Auto-consolidado el \`${FECHA_HOY}\` desde \`changelogs/*.md\` mediante \`npm run docs:auto\`.`,
    '',
    '---',
    '',
    bloques.join('\n\n---\n\n'),
    ''
  ].join('\n');

  fs.writeFileSync(path.join(ROOT, 'CHANGELOG.md'), consolidado, 'utf8');

  const docsChangelogPath = path.join(ROOT, 'docs', 'changelogs', 'CHANGELOG.md');
  fs.mkdirSync(path.dirname(docsChangelogPath), { recursive: true });
  fs.writeFileSync(docsChangelogPath, consolidado, 'utf8');

  console.log(`✅ [auto-docs] Consolidados ${archivos.length} changelogs en CHANGELOG.md y docs/changelogs/CHANGELOG.md`);
}

generarReferenciaAPI();
consolidarChangelogs();
