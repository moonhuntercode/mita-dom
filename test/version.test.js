import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test('Versión en dist/mita-dom.js debe coincidir con package.json (Prevenir Error de Compilación Olvidada)', async () => {
  // Leemos package.json
  const packageJsonPath = path.resolve(__dirname, '../package.json');
  const packageJsonData = await fs.readFile(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageJsonData);
  const currentVersion = packageJson.version;

  // Leemos el archivo minificado
  const distFilePath = path.resolve(__dirname, '../dist/mita-dom.js');
  let distData = '';
  try {
    distData = await fs.readFile(distFilePath, 'utf8');
  } catch (e) {
    assert.fail(`El archivo dist/mita-dom.js no existe. Debes ejecutar 'npm run build' primero.`);
  }

  // Verificamos que el string de versión de package.json esté inyectado en el archivo compilado
  // (debido al import { version } from '../../package.json', el bundler reemplaza la variable con el string)
  const isVersionInjected = distData.includes(`"${currentVersion}"`);
  
  if (!isVersionInjected) {
    assert.fail(`
      🔥 ERROR GRAVE DETECTADO:
      El archivo dist/mita-dom.js NO contiene la versión actual (${currentVersion}).
      Esto significa que modificaste el package.json pero olvidaste correr 'npm run build' antes de probar o publicar.
      Para solucionar esto y evitar que los usuarios reciban advertencias falsas, ejecuta:
      
      npm run build
    `);
  } else {
    assert.ok(true, `La versión ${currentVersion} está correctamente sincronizada en el build final.`);
  }
});
