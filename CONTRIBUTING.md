# 🛠️ Guía Oficial de Contribución, Versionado SemVer y Release (`mita-dom`)

Esta guía estandariza el ciclo de vida completo de **`mita-dom`**: cómo contribuir sin introducir regresiones, cómo decidir el número de versión correcto según SemVer, cómo auditar el paquete antes de publicar y cómo ejecutar el release completo en **Git + GitHub Releases (`gh`) + NPM + Portal Docs (`docs-mita-dom` en Vercel)**.

---

## 1. 🧭 Diagnóstico Real de Versión (`v2.5.3` → `v2.7.0`) y Matriz SemVer

- **Última versión publicada en NPM y Git Tags:** `2.5.3`.
- **¿Por qué `2.7.0` (MINOR) y no `2.5.4` ni `3.0.0`?**
  - **No es PATCH (`2.5.4`)** porque agrega módulos públicos completos: `rustGuard.js`, `propsYDefer.js`, `ssr.js` (Islands + `MitaMeta`), `formBuilder.js`, `consentimiento.js`, `cliSimulator.js`, `crudCategorias.js`, `uiModeracionYComunidad.js`, `fullstackYDevtools.js`, `bin/mita.js` (`npx mita`) y Signals v2.7 (`crearEfecto`, `crearEstadoCompartido`, `vincularTexto`, `Signal.prototype.derivar`).
  - **No es MAJOR (`3.0.0`)** porque **mantiene 100% compatibilidad hacia atrás**: las firmas previas de `Signal`, `MitaElement`, `renderCondicional` (5 argumentos posicionales) y `crearEstadoGlobal` siguen funcionando sin romper proyectos existentes.
  - **Sí es `2.7.0` (MINOR)** porque consolida la evolución interna `2.6.0` (no publicada en NPM) + el bloque completo de `2.7.0` de forma limpia y coherente con `changelogs/2026-11-22-v2.7.0.md`.

### Matriz de Decisión para Futuros Cambios

| ¿Qué cambiaste en el repositorio? | Acción sobre `"version"` en `package.json` | Ejemplo (`Actual: 2.7.0`) |
| --- | --- | --- |
| **1. Iteración local / PR en progreso (sin publicar en NPM)** | **MANTENER IGUAL** hasta el momento real de publicar. | Se queda en **`2.7.0`** |
| **2. Corrección de bugs, mejoras internas de rendimiento, CSS o `.md` sin nuevos exports ni rupturas** | **Subir PATCH** (`+0.0.1`). | Sube a **`2.7.1`** |
| **3. Nuevas funciones, utilidades, helpers o exports retrocompatibles** | **Subir MINOR** (`+0.1.0`, patch vuelve a `0`). | Sube a **`2.8.0`** |
| **4. Eliminación o cambio incompatible de firma/exports (Breaking Change)** | **Subir MAJOR** (`+1.0.0`, minor y patch vuelven a `0`). | Sube a **`3.0.0`** |

### Verificación Programática (`calcularRecomendacionSemVer`)

```javascript
import { calcularRecomendacionSemVer } from 'mita-dom';

const decision = calcularRecomendacionSemVer({
  versionActual: '2.5.3',
  hayCambiosEnCodigo: true,
  rompeCompatibilidadAnterior: false,
  agregaNuevaFuncionalidadOExport: true
});

console.log(decision.tipoBump);           // 'MINOR'
console.log(decision.versionRecomendada); // '2.6.0' (o '2.7.0' al consolidar hitos 2.6 + 2.7)
console.log(decision.motivo);
```

---

## 2. 🦀 Reglas de Oro al Contribuir Código a `mita-dom`

1. **HTML5 Semántico (Cero Div-Soup):** usar `<main>`, `<header>`, `<nav>`, `<aside>`, `<section>`, `<article>`, `<search>`, `<menu>`, `<details>`/`<summary>`, `<output>`, `<dialog>`, `<figure>`. Prohibido envolver con `<div>` innecesarios.
2. **Light DOM + Pure CSS3 Grid Mobile-First:** prohibido `attachShadow()` y prohibido ocultar módulos sensibles con `display: none`. Usa `renderCondicional()` y `@scope (mi-componente)`.
3. **Protección de Memoria Estilo Rust (`rustGuard.js`):** usa `crearEstadoReactivoInmutable()`, `leerEstadoInmutable()` (`&T`), `mutarEstadoConHistorial()` (`&mut T`) y libera recursos en `disconnectedCallback()` con `this.registrarLimpieza()` o `crearAmbitoConLimpiezaAutomatica().liberarMemoriaCompleta()`.
4. **Cero Dependencias de Runtime:** `mita-dom` se distribuye sin dependencias externas (`dependencies` vacío); el core corre nativamente en navegadores modernos y Node `>= 24`.
5. **Auto-Documentación y Pruebas Obligatorias:** cada nueva función pública debe exportar JSDoc completo (consumido por `npm run docs:auto`), tener definición en `types/index.d.ts` y contar con tests unitarios en `test/*.test.js`.

---

## 3. 📦 Auditoría Pre-Release (`npm run release:check`)

Antes de crear un tag o ejecutar `npm publish`, corre siempre el comando unificado de verificación y auditoría de tarball:

```bash
npm run release:check
```

Este comando ejecuta en cadena `docs:auto` → `build` → `eslint` → `stylelint` → `node --test` → `npm pack --dry-run`. Verifica en la salida de `npm pack --dry-run` que:

- ✅ Estén incluidos `dist/mita-dom.js`, `bin/mita.js`, `types/index.d.ts`, `docs/`, `changelogs/` y `LICENSE`.
- ✅ **NO** se empaqueten archivos pesados innecesarios (ej. SVGs/imágenes en `src/svg/`), ni suites `*.test.js`, ni archivos vacíos `0B`.
- ✅ El tamaño comprimido del paquete (`package size`) sea ligero (**< 300 KB**).

---

## 4. 🚀 Flujo Oficial de Release en 5 Pasos (`Git` + `gh` + `NPM`)

> **Requisitos previos:**
> - `gh auth status` debe mostrar sesión activa en GitHub (`moonhuntercode`).
> - `npm whoami` debe mostrar tu usuario de NPM. Si devuelve `401 Unauthorized`, inicia sesión primero con `npm login`.

### Paso 1: Validar QA y Empaquetado

```bash
cd E:\investigations\webs\mita-dom
npm run release:check
```

### Paso 2: Commit de Release y Tag Anotado

```bash
git status
git add .
git commit -m "feat(release): v2.7.0 - Signals v2.7, RustGuard, SSR/Islands, CLI, UI Mod y Props/@defer"
git tag -a v2.7.0 -m "Release MitaDOM v2.7.0"
git push origin main --follow-tags
```

### Paso 3: Crear el Release Oficial en GitHub con `gh` CLI

Usa el changelog de la versión como cuerpo del release para que aparezca con la etiqueta **Latest** en `https://github.com/moonhuntercode/mita-dom/releases`:

```bash
gh release create v2.7.0 --title "🚀 MitaDOM v2.7.0 — Claridad, RustGuard, SSR/Islands y Ecosistema Completo" --notes-file changelogs/2026-11-22-v2.7.0.md
```

### Paso 4: Publicar en NPM (Registro Público `npmjs.org`)

```bash
npm login
npm whoami
npm publish --access public
```

> **⚠️ Autenticación 2FA (OTP) en NPM:**
> Si NPM responde `EOTP`, abrirá o imprimirá una URL `https://www.npmjs.com/auth/cli/...` (o pedirá `--otp=123456`). Autoriza con tu app autenticadora y la publicación concluirá automáticamente.
> Verifica la publicación con:
> ```bash
> npm view mita-dom version
> ```

### Paso 5 (Opcional): Publicación Espejo en GitHub Packages

La distribución principal recomendada es **npmjs.org** (`npm install mita-dom`) junto con **GitHub Releases** (`gh release create`). Si además deseas un paquete espejo scoped en GitHub Packages (`@moonhuntercode/mita-dom`):

1. Genera un PAT clásico o token con scope `write:packages`.
2. Configura `~/.npmrc` con `@moonhuntercode:registry=https://npm.pkg.github.com`.
3. Publica desde un workflow de GitHub Actions con `publishConfig.registry = "https://npm.pkg.github.com"` sin alterar el nombre público `mita-dom` en `npmjs.org`.

---

## 5. 🌐 Sincronización Post-Publish con `docs-mita-dom` (Vercel)

El portal oficial de documentación y laboratorio (`https://docs-mita-dom.vercel.app/`, repo `moonhuntercode/docs-mita-dom`, carpeta local `example-mita-spa-01-js`) usa `../mita-dom/src/index.js` en local, pero **en Vercel instala `mita-dom` desde NPM**.

Inmediatamente después de publicar `mita-dom@2.7.0` en NPM, actualiza y despliega `docs-mita-dom`:

```bash
cd E:\investigations\webs\example-mita-spa-01-js

# 1. Apuntar a la versión recién publicada en NPM y actualizar lockfile
npm pkg set dependencies.mita-dom="^2.7.0"
npm install

# 2. Sincronizar docs + lint + CSS muerto + Vitest + Vite Build
npm run qa

# 3. Subir a GitHub (dispara deploy automático en Vercel) y crear Release en GitHub
git add .
git commit -m "feat(release): v2.7.0 - Portal Docs DB Local, 15 Labs Interactivos y Blog v2.7"
git tag -a v2.7.0 -m "Docs MitaDOM v2.7.0"
git push origin main --follow-tags
gh release create v2.7.0 --title "📚 Docs MitaDOM v2.7.0" --notes "Sincronizado con mita-dom@2.7.0: 15 laboratorios interactivos Split Editor, Docs DB Local + FS Sync, Gamificación, Blog con Bitácora por Hora y 5 Paletas CSS3."
```

---

## 6. 📋 Checklist Rápido de Pull Requests

- [ ] Título de commit siguiendo Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`).
- [ ] `npm run release:check` en verde (0 errores ESLint, 0 Stylelint, 100% tests en verde).
- [ ] Tipos actualizados en `types/index.d.ts` y documentación regenerada con `npm run docs:auto`.
- [ ] Ejemplos Antes vs Después agregados en `changelogs/` cuando se introduce una API nueva.
