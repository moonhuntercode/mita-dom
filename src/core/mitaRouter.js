import { MitaElement } from './mitaElement.js';
import { rutaActual } from './router.js';
import { MitaAnim } from './mitaAnim.js';

/**
 * MitaRouter - Paginación Animada NATIVA.
 * Consume `<template data-path="/ruta">` de su Light DOM y los renderiza con animaciones de WAAPI.
 */
export class MitaRouter extends MitaElement {
  constructor() {
    super();
    this.routes = {};
    this.currentView = null;
    this.isAnimating = false;
  }

  alMontar() {
    // 1. Recolectar todas las rutas (templates) proporcionadas por el usuario en el Light DOM
    const templates = Array.from(this.querySelectorAll('template[data-path]'));
    
    if (templates.length === 0) {
      console.warn('MitaRouter: No se encontraron <template data-path="..."> en el router.');
      return;
    }

    templates.forEach(tpl => {
      const path = tpl.getAttribute('data-path');
      this.routes[path] = tpl;
    });

    // Limpiamos el Light DOM para ser usado como contenedor (Viewport)
    this.innerHTML = '';
    
    this.viewContainer = document.createElement('div');
    this.viewContainer.style.width = '100%';
    this.viewContainer.style.height = '100%';
    this.appendChild(this.viewContainer);

    // 2. Suscribirse a los cambios de la URL (Global Signal de router.js)
    this.unsubscribe = rutaActual.suscribir((nuevaRuta) => {
      this.transicionarHacia(nuevaRuta);
    });
  }

  alDesmontar() {
    if (this.unsubscribe) {
      rutaActual.desuscribir(this.unsubscribe);
    }
  }

  async transicionarHacia(ruta) {
    if (this.isAnimating) return;
    
    // Buscar la plantilla (soporte básico para comodín "*" si la ruta no existe)
    let template = this.routes[ruta] || this.routes['*'];
    
    // Si sigue en la misma vista, no hacemos nada (Evita re-renders redundantes)
    if (this.currentView === ruta || !template) return;
    this.isAnimating = true;

    // A. Animar Salida (FadeOut) si hay algo montado
    if (this.viewContainer.firstElementChild) {
      const anim = MitaAnim.fadeOut(this.viewContainer.firstElementChild, 200);
      await anim.finished.catch(() => {}); // Esperamos que termine
    }

    // B. Reemplazar Contenido (Limpiar e Inyectar el clon del template)
    this.viewContainer.innerHTML = '';
    const clone = template.content.cloneNode(true);
    this.viewContainer.appendChild(clone);
    this.currentView = ruta;

    // C. Animar Entrada (FadeIn / SlideIn)
    if (this.viewContainer.firstElementChild) {
       // Aquí podrías leer un data-anim del template, por ahora FadeInY suave
       const enterAnim = MitaAnim.slideInY(this.viewContainer.firstElementChild, 30, 300);
       await enterAnim.finished.catch(() => {});
    }

    this.isAnimating = false;
  }
}
