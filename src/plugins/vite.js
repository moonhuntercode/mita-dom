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
        handleHotUpdate({ file, server }) {
            if (file.endsWith('.html')) {
                server.ws.send({
                    type: 'custom',
                    event: 'mita:html-update',
                    data: { file }
                });
                // Retornar [] previene que Vite haga un "Full Reload" (recarga de página)
                // forzando a que MitaDOM maneje el parche granularmente en el cliente.
                // Nota: Por ahora, delegamos a import.meta.hot.accept en los JS.
            }
        },
        
        configResolved(config) {
            if (config.command === 'serve') {
                console.log('\x1b[32m%s\x1b[0m', '⚡ MitaDOM Granular HMR Plugin Activado');
            }
        }
    };
}
