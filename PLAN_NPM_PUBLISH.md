# Guía Definitiva: Publicación de MitaDOM (NPM + GitHub Releases)

Esta guía documenta el flujo oficial y estandarizado para publicar nuevas versiones de **mita-dom**, incluyendo el manejo de la Autenticación de Dos Pasos (OTP) y la creación automática de _Releases_ usando la GitHub CLI (`gh`).

---

## Flujo de Trabajo Estandarizado (Release & Publish)

Cuando la arquitectura esté estable, todos los tests pasen y se haya documentado la versión, sigue estos 4 pasos en orden estricto desde tu terminal en la raíz de \`mita-dom\`:

### 1. Preparar la Versión y Changelog
Asegúrate de haber incrementado la versión en tu \`package.json\`. Luego, generamos el changelog localmente:
\`\`\`bash
npm run changelog
git add .
git commit -m "chore(release): vX.X.X"
\`\`\`
*(Reemplaza X.X.X por tu versión, ej: v2.5.2)*

### 2. Crear el Tag de Git
Un Tag es indispensable para que GitHub reconozca en qué punto exacto del código se hace el release.
\`\`\`bash
git tag vX.X.X
git push origin main --tags
\`\`\`

### 3. Crear el Release Oficial (GitHub CLI)
En lugar de ir a la web de GitHub, utilizamos la CLI \`gh\` para adjuntar las notas de la versión (Changelog) directamente al Tag que acabamos de crear:
\`\`\`bash
# Reemplaza la ruta del changelog y el título por la versión correcta
gh release create vX.X.X -F changelogs/2026-08-26-vX.X.X.md -t "vX.X.X - Título de la Versión"
\`\`\`
✅ *Resultado:* Un release oficial se genera en tu repositorio (con etiqueta verde "Latest").

### 4. Publicar en NPM (Manejo de OTP)
Finalmente, subimos el empaquetado a NPM:
\`\`\`bash
npm publish
\`\`\`
> **⚠️ Atención (Seguridad NPM):** 
> Si tu cuenta tiene 2FA (OTP) obligatorio para publicación, el comando pausará y mostrará un mensaje: \`npm error code EOTP\`.
> 1. NPM imprimirá un enlace en la terminal (ej: \`https://www.npmjs.com/auth/cli/...\`).
> 2. Haz `Ctrl + Click` para abrirlo en tu navegador.
> 3. Completa la autenticación (usa tu App Authenticator).
> 4. Una vez autorizado en la web, la terminal se reanudará automáticamente y el paquete estará ¡en vivo!

---
*MitaDOM Architecture - Mantenimiento de Paquetes Globales*
