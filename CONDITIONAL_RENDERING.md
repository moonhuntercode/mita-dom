# 🔀 Renderizado Condicional sin Magia

Frameworks como Vue usan `v-if` y `v-show`. React usa operadores ternarios JSX `{condicion ? <A/> : <B/>}`. Todos estos métodos obligan a un compilador a parsear tu código o al Virtual DOM a reconciliar árboles.

En MitaDOM usamos **Vanilla JavaScript puro** y **Signals**. Tenemos dos estrategias principales, cada una perfecta para un caso de uso distinto.

## 1. Ocultamiento CSS (El equivalente a `v-show`)
Es la estrategia **más rápida y eficiente**. El elemento HTML siempre existe en el DOM, pero lo ocultamos visualmente. 

- **Ventajas**: Tiempo de renderizado O(1). No se destruyen Event Listeners ni el estado interno del componente.
- **Cuándo usarlo**: Para menús desplegables, tooltips, modales, alertas, pestañas (Tabs), y portales.

### Ejemplo:
```javascript
import { crearEstadoLocal } from 'mita-dom';

const mostrarModal = crearEstadoLocal(false);

// En tu método iniciarLogica():
const $modal = this.querySelector('.mi-modal');

mostrarModal.suscribir(visible => {
  $modal.style.display = visible ? 'block' : 'none';
});
```

### Ejemplo Avanzado: Botón de Cerrar Sidebar
Puedes combinar múltiples condiciones, como un estado global y el tamaño de la ventana (`window.innerWidth`), para mostrar un botón condicionalmente (Renderizado Responsive Condicional):

```javascript
import { estadoSidebar } from '../../store/layoutStore.js';

const $btnCerrar = this.querySelector('#btn-cerrar-sidebar');

estadoSidebar.suscribir(({ abierto }) => {
    // Solo mostrar el botón "✕ Cerrar" si el menú está abierto Y estamos en vista móvil
    const esMobile = window.innerWidth < 715;
    $btnCerrar.style.display = (abierto && esMobile) ? 'block' : 'none';
});
```

> [!TIP]
> **Sinergia con Teleport**: Esta es exactamente la estrategia que usamos para crear Portales Globales. Revisar la guía de [Teleport y Portales](./TELEPORT.md) para ver cómo un `v-show` puede ser controlado por un componente al otro lado de la aplicación.

## 2. Ocultamiento de Visibilidad (El uso de `visibility`)
Hay un tercer caso de uso muy importante. Si usas `display: none`, el elemento desaparece del DOM y los elementos adyacentes ocupan su lugar (se rompe el layout). Si quieres **ocultar visualmente un elemento pero mantener su espacio físico reservado**, debes usar `visibility: hidden`.

- **Ventajas**: El Layout y el "reflow" no se ven afectados. Ideal para animaciones y elementos estructurales.
- **Cuándo usarlo**: Componentes de cuadrícula (Grid/Flexbox), avatares, o tooltips que están esperando su animación de entrada.

### Ejemplo:
```javascript
import { crearEstadoLocal } from 'mita-dom';

const mostrarNotificacion = crearEstadoLocal(false);

const $alerta = this.querySelector('.alerta');

mostrarNotificacion.suscribir(visible => {
  $alerta.style.visibility = visible ? 'visible' : 'hidden';
});
```

## 3. Inyección / Destrucción del DOM (El equivalente a `v-if`)
Si tienes un componente muy pesado (Ej. un visualizador de mapas 3D) y no quieres que ocupe RAM mientras está oculto, debes destruirlo físicamente del DOM.

- **Ventajas**: Libera RAM y fuerza al Garbage Collector a limpiar instancias pesadas.
- **Cuándo usarlo**: Para ruteo de SPA completo (cambiar de página), vistas con muchísimos datos.

### Ejemplo usando `.innerHTML`
La forma más agresiva y rápida de renderizar condicionalmente componentes masivos es manipular el HTML del contenedor.

```javascript
import { crearEstadoGlobal } from 'mita-dom';
import { Logger } from '../utils/logger.js';

const usuarioLogeado = crearEstadoGlobal(false);

usuarioLogeado.suscribir(estaLogeado => {
  if (estaLogeado) {
    Logger.info('Autenticación exitosa, inyectando Dashboard...');
    this.$contenedor.innerHTML = '<dashboard-privado></dashboard-privado>';
  } else {
    Logger.warn('Sesión terminada, mostrando Login...');
    this.$contenedor.innerHTML = '<formulario-login></formulario-login>';
  }
});
```

### Ejemplo usando `appendChild` y `removeChild` (El método Quirúrgico Absoluto)
Si necesitas preservar referencias exactas o manipular un DocumentFragment:

```javascript
let $nodoPrivado = null;

usuarioLogeado.suscribir(estaLogeado => {
  if (estaLogeado) {
    $nodoPrivado = document.createElement('dashboard-privado');
    this.$contenedor.appendChild($nodoPrivado);
  } else {
    if ($nodoPrivado) {
      this.$contenedor.removeChild($nodoPrivado);
      $nodoPrivado = null; // Liberamos para el Garbage Collector
    }
  }
});
```

## 4. Renderizado Condicional con Feedback en la UI (UX Mejorada)
Cuando realices una carga asíncrona (como conectarte a una API), la mejor práctica es mostrar *Feedback de UI* usando el renderizado condicional.

### Ejemplo: Spinners y Alertas
```javascript
import { crearEstadoLocal, crearRecurso, MitaElement } from 'mita-dom';
import { Logger } from '../utils/logger.js';

export class PanelDatos extends MitaElement {
    constructor() {
        super();
        this.recurso = crearRecurso(() => fetch('https://api.ejemplo.com/datos').then(r => r.json()));
    }

    async render() {
        this.innerHTML = `
            <div class="panel">
                <div id="ui-feedback"></div>
                <div id="ui-contenido" style="display: none;"></div>
            </div>
        `;

        const $feedback = this.querySelector('#ui-feedback');
        const $contenido = this.querySelector('#ui-contenido');

        // Renderizado Condicional del Loading (Feedback visual y consola)
        this.recurso.loading.suscribir(cargando => {
            if (cargando) {
                Logger.info('Cargando recursos remotos...');
                $feedback.innerHTML = '<div class="spinner">⏳ Cargando...</div>';
                $contenido.style.display = 'none';
            }
        });

        // Renderizado Condicional del Error
        this.recurso.error.suscribir(error => {
            if (error) {
                Logger.error('Fallo en la red detectado', error);
                $feedback.innerHTML = `<div class="alerta-error">❌ No se pudieron cargar los datos</div>`;
            }
        });

        // Renderizado Condicional del Éxito
        this.recurso.data.suscribir(datos => {
            if (datos) {
                Logger.info('Datos renderizados exitosamente');
                $feedback.innerHTML = ''; // Ocultar feedback
                $contenido.style.display = 'block'; // Mostrar contenido
                $contenido.innerHTML = `<pre>${JSON.stringify(datos, null, 2)}</pre>`;
            }
        });
    }
}
```

## 🧠 Reflexión de Arquitecto
La "Directiva vs VDOM" es una falsa dicotomía impuesta por los frameworks pesados. El API del DOM moderno (HTML5) ya incluye métodos ultra-optimizados (`.style.display` o `innerHTML`). Al combinarlos con la reactividad de los Signals, logramos el mismo resultado de los frameworks, pero permitiendo al desarrollador entender exactamente **cuándo, cómo y por qué** se destruye la memoria.
