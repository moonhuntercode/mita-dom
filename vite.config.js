//  inicio file: vite.config.js
// @ts-check
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => {
    // Configuración dinámica dependiendo del modo
    const esProduccion = command === 'build';

    return {
        build: {
            // Keyword: lib
            // Justificación: Le indica a Vite que debe compilar este proyecto como una librería de NPM (ES Modules) usando src/index.js como entrada.
            lib: {
                entry: 'src/index.js',
                name: 'MitaDOM',
                formats: ['es']
            },
            // Keyword: 'terser'
            // Justificación: Algoritmo de minificación que además ofusca nombres de variables, dificultando la ingeniería inversa.
            minify: esProduccion ? 'terser' : false,

            // Keyword: rollupOptions
            // Justificación: Para librerías NPM necesitamos nombres de archivo deterministas y predecibles (sin hashes).
            rollupOptions: {
                output: {
                    entryFileNames: 'mita-dom.js',
                    assetFileNames: 'mita-dom.[ext]',
                }
            }
        }
    };
});
//  fin file: vite.config.js