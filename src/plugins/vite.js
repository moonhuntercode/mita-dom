/**
 * @file mitaHmrPlugin.js
 * @description Plugin oficial de MitaDOM para Vite.
 * Facilita el Granular HMR en plantillas HTML y componentes de MitaDOM,
 * mejorando la Experiencia de Desarrollo (DX) y evitando recargas de página.
 */

export function mitaHmrPlugin() {
    return {
        name: 'vite-plugin-mita-hmr',
        enforce: 'post',
        
        // Intercepta la recarga cuando cambian archivos .html
        handleHotUpdate({ file, server, modules }) {
            if (file.endsWith('.html')) {
                // En SPAs basadas en Web Components, un cambio en la plantilla HTML
                // requiere redefinir el Custom Element o recargar la página.
                // Disparamos un full-reload para garantizar consistencia.
                server.ws.send({ type: 'full-reload', path: '*' });
                return []; // Evita el pipeline por defecto que a veces ignora archivos ?raw
            }
            return modules;
        },
        
        configResolved(config) {
            if (config.command === 'serve') {
                console.log('\x1b[32m%s\x1b[0m', '⚡ MitaDOM Granular HMR Plugin Activado');
            }
        }
    };
}
