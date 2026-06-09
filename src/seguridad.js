//  inicio file: src/core/seguridad.js
// @ts-check

/**
 * 🔒 Sanitiza strings antes de inyectarlos en el DOM
 * Justificación: Previene que un usuario malicioso inyecte un <script> en un input.
 * @param {string} textoInseguro 
 * @returns {string}
 */
export function sanitizarTexto(textoInseguro) {
    // Keyword: Element.setHTML()
    // Justificación: API Nativa moderna (2026) que limpia código malicioso automáticamente sin usar librerías como DOMPurify.
    const elementoTemporal = document.createElement('div');
    // @ts-ignore (Si el editor aún no reconoce la API ultrarreciente)
    elementoTemporal.setHTML(textoInseguro);
    return elementoTemporal.innerHTML;
}

//  fin file: src/core/seguridad.js