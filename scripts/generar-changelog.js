import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const changelogsDir = path.join(__dirname, '../changelogs');

// Asegurar que la carpeta existe
if (!fs.existsSync(changelogsDir)) {
    fs.mkdirSync(changelogsDir, { recursive: true });
}

const packageJsonPath = path.join(__dirname, '../package.json');
const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const version = pkg.version;
const fecha = new Date().toISOString().split('T')[0];

const nombreArchivo = `${fecha}-v${version}.md`;
const rutaArchivo = path.join(changelogsDir, nombreArchivo);

const templateChangelog = `
# 📝 Registro de Cambios - v${version} (${fecha})

## 🚀 Novedades (Production Ready)
- Refactorización de la Documentación (División Aprende vs Referencia).
- Nuevo Profiler de Interacción: Medición de Latencia de Botones (INP).
- Sistema de Control de Acceso Granular (Vistas Ocultas).
- Nuevos Componentes UI: \`<mita-code-editor>\` y \`<mita-loader>\`.

## 🐛 Corrección de Errores (Codebase Fixes)
- [Router] Corregido error crítico de bloqueo al fallar la carga lazy de chunks.
- [MitaElement] Integración de \`try/catch\` para Error Boundaries locales y prevención de caída del DOM tree.
- [Profiler] Optimización de almacenamiento en \`estadoProfiler\` para separar \`renderizados\` de \`interacciones\` y evitar saturación de memoria.

## 🛠️ Modificaciones Arquitectónicas
- Migración de \`ComputedSignal\` a \`SignalDerivado\` para mejorar claridad semántica.
- Re-estructuración del directorio de \`docs/\` copiando los estándares de la industria.

---
*Generado automáticamente mediante \`npm run changelog\`*
`.trim();

fs.writeFileSync(rutaArchivo, templateChangelog, 'utf8');
console.log(`✅ Changelog generado exitosamente en: changelogs/${nombreArchivo}`);
