import test from 'node:test';
import assert from 'node:assert';

// 1. Mapeo estructural de document.createElement para pruebas Node
// @ts-ignore
global.document = {
    createElement(tag) {
        if (tag === 'div') {
            return {
                _htmlInseguro: '',
                // Simulamos la nueva API nativa de sanitización Element.setHTML
                setHTML(html) {
                    this._htmlInseguro = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
                },
                get innerHTML() {
                    return this._htmlInseguro;
                }
            };
        }
    }
};

const { sanitizarTexto } = await import('../src/seguridad.js');

test('sanitizarTexto elimina etiquetas maliciosas preventivamente', (t) => {
    const textoInseguro = '<p>Ataque</p><script>alert("hack")</script>';
    const resultado = sanitizarTexto(textoInseguro);
    
    // Solo debe quedar la etiqueta p
    assert.strictEqual(resultado, '<p>Ataque</p>');
});

test('sanitizarTexto preserva HTML semántico seguro', (t) => {
    const textoSeguro = '<b>Fuerte</b> y <i>Ladeado</i>';
    const resultado = sanitizarTexto(textoSeguro);
    
    assert.strictEqual(resultado, '<b>Fuerte</b> y <i>Ladeado</i>');
});
