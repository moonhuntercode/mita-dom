// @ts-check
// inicio file: src/core/versionCheck.js
import pkg from '../../package.json' with { type: 'json' };
const currentVersion = pkg.version;

/**
 * Comprueba de forma asíncrona si existe una nueva versión de MitaDOM
 * Se recomienda invocar esto solo en entornos de desarrollo local.
 */
export async function checkMitaDomVersion() {
  // Evitar romper SSR o entornos sin Fetch
  if (typeof window === 'undefined' || !window.fetch) return;

  try {
    // AbortController para evitar que el fetch se cuelgue e interfiera con listeners asíncronos de Vite
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 segundos timeout

    // Evitamos bloquear el Hilo Principal y le damos una baja prioridad al request
    const response = await fetch('https://registry.npmjs.org/mita-dom', {
      method: 'GET',
      headers: { 'Accept': 'application/vnd.npm.install-v1+json' },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) return;

    const data = await response.json();
    const tags = data['dist-tags'];

    if (!tags) return;

    const latest = tags.latest;
    const beta = tags.beta;

    // Lógica básica de comparación (Asumiendo SemVer X.Y.Z)
    if (latest && latest !== currentVersion) {
      if (esVersionMayor(latest, currentVersion)) {
        console.warn(
          `%c[MitaDOM Update] ¡Hay una nueva versión estable disponible! v${latest} (Actualmente usas v${currentVersion}).\nEjecuta: npm install mita-dom@latest`,
          'color: #10b981; font-weight: bold; font-size: 1.1em; border: 1px solid #10b981; padding: 4px; border-radius: 4px;'
        );
      }
    } else if (beta && beta !== currentVersion && esVersionMayor(beta, currentVersion)) {
      console.info(
        `%c[MitaDOM Beta] Hay una versión beta disponible para pruebas: v${beta}.\nEjecuta: npm install mita-dom@beta`,
        'color: #8b5cf6; font-style: italic;'
      );
    }
  } catch (err) {
    // Fallo silencioso. Es solo una utilidad DX, no debe bloquear la app si falla la red.
    if (process.env.NODE_ENV === "development" && err.name !== 'AbortError') {
      console.debug("[MitaDOM VersionCheck] Error de red:", err);
    }
  }
}

/**
 * Compara dos versiones SemVer simples X.Y.Z
 * Retorna true si v1 > v2
 */
function esVersionMayor(v1, v2) {
  // Limpiamos sufijos como -beta, -rc para evitar errores de parseo (NaN)
  const cleanV1 = v1.split('-')[0];
  const cleanV2 = v2.split('-')[0];

  const p1 = cleanV1.split('.').map(Number);
  const p2 = cleanV2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const n1 = isNaN(p1[i]) ? 0 : p1[i];
    const n2 = isNaN(p2[i]) ? 0 : p2[i];
    
    if (n1 > n2) return true;
    if (n1 < n2) return false;
  }
  return false;
}
// fin file: src/core/versionCheck.js