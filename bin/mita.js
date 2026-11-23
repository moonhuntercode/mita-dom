#!/usr/bin/env node
// @ts-check
import fs from 'fs';
import path from 'path';
import { simularComandoCliMita } from '../src/utils/cliSimulator.js';

const args = process.argv.slice(2);
const resultado = simularComandoCliMita(args.join(' '));

console.log(`\n🛠️  ${resultado.resumen}\n`);

if (resultado.tipo === 'help' || resultado.tipo === 'doctor') {
  console.log(resultado.archivos[0].contenido);
  process.exit(0);
}

const escribirEnDisco = !args.includes('--dry-run');
const rootDir = process.cwd();

resultado.archivos.forEach((archivo) => {
  const destino = path.resolve(rootDir, archivo.ruta);
  if (escribirEnDisco) {
    fs.mkdirSync(path.dirname(destino), { recursive: true });
    fs.writeFileSync(destino, archivo.contenido, 'utf-8');
    console.log(`✅ [Mita CLI] Archivo creado: ${archivo.ruta}`);
  } else {
    console.log(`📄 [Dry-Run] ${archivo.ruta}\n${archivo.contenido}`);
  }
});
