import { describe, it, expect, beforeEach } from 'vitest';
import { Signal, ComputedSignal } from '../../src/core/signals.js';

describe('Reactividad Granular (DOM Testing con JSDOM)', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    it('Actualiza quirúrgicamente un nodo de texto al mutar el Signal (Sin VDOM)', () => {
        // Arrange
        const nombre = new Signal('Mita');
        const container = document.createElement('div');
        const nodoTexto = document.createTextNode('');
        
        // Simular lo que haría el framework: vincular el signal a un nodo
        nombre.suscribir(val => {
            nodoTexto.textContent = val;
        });

        container.appendChild(nodoTexto);
        document.body.appendChild(container);

        // Assert inicial
        expect(container.innerHTML).toBe('Mita');

        // Act
        nombre.set('Granular');

        // Assert post-mutación
        // Aquí demostramos que no se recreó el "div", solo cambió el textContent del nodoTexto
        expect(container.innerHTML).toBe('Granular');
        expect(nodoTexto.textContent).toBe('Granular');
    });

    it('El ComputedSignal se actualiza reactivamente en el DOM', () => {
        const visitas = new Signal(10);
        const mensaje = new ComputedSignal(visitas, v => `Visitas: ${v}`);
        
        const h1 = document.createElement('h1');
        mensaje.suscribir(m => h1.textContent = m);
        
        expect(h1.textContent).toBe('Visitas: 10');
        
        visitas.set(20);
        expect(h1.textContent).toBe('Visitas: 20');
    });
});
