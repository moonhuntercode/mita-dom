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
  const archivosCore = [
    'src/core/signals.js',
    'src/core/render.js',
    'src/core/mitaElement.js',
    'src/core/componentes.js',
    'src/core/router.js',
    'src/core/mitaRouter.js',
    'src/core/resource.js',
    'src/core/mitaAnim.js',
    'src/core/mitaTween.js',
    'src/core/ssr.js',
    'src/core/rustGuard.js',
    'src/core/propsYDefer.js',
    'src/seguridad.js',
    'src/utils/result.js',
    'src/utils/chatGuard.js',
    'src/utils/formBuilder.js',
    'src/utils/consentimiento.js',
    'src/utils/cliSimulator.js',
    'src/utils/crudCategorias.js',
    'src/utils/uiModeracionYComunidad.js',
    'src/utils/fullstackYDevtools.js'
  ];

  const secciones = [];
  const filasResumen = [];

  for (const relPath of archivosCore) {
    const absPath = path.join(ROOT, relPath);
    if (!fs.existsSync(absPath)) continue;

    const contenido = fs.readFileSync(absPath, 'utf8');
    const exportsEncontrados = extraerExportsConDoc(contenido);
    if (exportsEncontrados.length === 0) continue;

    filasResumen.push(
      `| \`${relPath}\` | ${exportsEncontrados.map((e) => `\`${e.nombre}\``).join(', ')} |`
    );

    const detalleModulo = exportsEncontrados
      .map((exp) => {
        const listaTags =
          exp.etiquetas.length > 0
            ? `\n${exp.etiquetas.map((t) => `- \`${t}\``).join('\n')}`
            : '';
        return `### \`${exp.tipo} ${exp.firma}\`\n\n${exp.descripcion}${listaTags}\n`;
      })
      .join('\n');

    secciones.push(`## 📦 Módulo \`${relPath}\`\n\n${detalleModulo}`);
  }

  const markdown = [
    `# 🤖 Referencia de API Auto-Generada — MitaDOM v${pkg.version}`,
    '',
    `- **Versión:** \`v${pkg.version}\``,
    `- **Fecha de Auto-Generación:** \`${FECHA_HOY}\``,
    `- **Comando:** \`npm run docs:auto\` (\`scripts/auto-docs.js\`)`,
    '',
    '> Este documento se regenera automáticamente leyendo los `export` y JSDoc reales de `src/`. No editar a mano.',
    '',
    '## 🗺️ Inventario de Módulos y Exports',
    '',
    '| Archivo Fuente | Símbolos Públicos Exportados |',
    '| --- | --- |',
    ...filasResumen,
    '',
    '---',
    '',
    ...secciones
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
