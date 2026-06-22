// @ts-check
// inicio file: src/core/versionCheck.js
import { version as currentVersion } from '../../package.json';

/**
 * Comprueba de forma asíncrona si existe una nueva versión de MitaDOM
 * Se recomienda invocar esto solo en entornos de desarrollo local.
 */
export async function checkMitaDomVersion() {
  // Evitar romper SSR o entornos sin Fetch
  if (typeof window === 'undefined' || !window.fetch) return;

  try {
    // Evitamos bloquear el Hilo Principal y le damos una baja prioridad al request
    const response = await fetch('https://registry.npmjs.org/mita-dom', {
      method: 'GET',
      headers: { 'Accept': 'application/vnd.npm.install-v1+json' },
      // mode: 'cors',
    });

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
    if (process.env.NODE_ENV === "development") {
      console.debug("[MitaDOM VersionCheck] Error de red:", err);
    }

  }
}

/**
 * Compara dos versiones SemVer simples X.Y.Z
 * Retorna true si v1 > v2
 */
function esVersionMayor(v1, v2) {
  const p1 = v1.split('.').map(Number);
  const p2 = v2.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    if (p1[i] > p2[i]) return true;
    if (p1[i] < p2[i]) return false;
  }
  return false;
}
// fin file: src/core/versionCheck.js