# 💡 Ejemplos Prácticos y Casos de Uso
*(Inspirado en React Learn y Vue.js Guide)*

MitaDOM está diseñado para ser expresivo pero extremadamente rápido. En lugar de usar compiladores complejos (`.jsx` o `.vue`), usamos la potencia bruta de Vanilla JS con *Signals* locales. 

Aquí tienes ejemplos de cómo resolver problemas comunes del día a día:

---

## 1. Renderizado Condicional y Listas Dinámicas
*¿Cómo mostrar una lista y filtrarla sin usar Virtual DOM?*

En frameworks tradicionales, cambiar el estado reconstruye (o compara) todos los nodos. En MitaDOM, el render inicial construye el DOM una sola vez, y los *Signals* aplican cambios quirúrgicos (ej. inyectando un `DocumentFragment` limpio).

### Código:
```javascript
import { Signal, ComputedSignal } from 'mita-dom';
import { MitaElement } from 'mita-dom/utils';

const products = [
  { title: 'Cabbage', isFruit: false },
  { title: 'Apple', isFruit: true }
];

export class DemoShoppingList extends MitaElement {
  constructor() {
    super();
    // Creamos el estado local de la pestaña activa
    this.filtroActivo = crearEstadoLocal('todas');
    
    // 2. Computed: Reacciona automáticamente si "filtroActivo" cambia
    this.productosFiltrados = new ComputedSignal(this.filtroActivo, (filtro) => {
      if (filtro === 'frutas') return products.filter(p => p.isFruit);
      return products;
    });
  }

  async render() {
    this.innerHTML = `
      <button id="btn-todas">Todas</button>
      <button id="btn-frutas">Solo Frutas</button>
      <ul id="lista-productos"></ul>
    `;
    this.iniciarLogica();
  }

  iniciarLogica() {
    // 3. Suscripciones al DOM
    this.querySelector('#btn-todas').addEventListener('click', () => this.filtroActivo.set('todas'));
    this.querySelector('#btn-frutas').addEventListener('click', () => this.filtroActivo.set('frutas'));

    // 4. Suscripción al Signal Computado (El repintado)
    const $lista = this.querySelector('#lista-productos');
    
    this.productosFiltrados.suscribir((lista) => {
      $lista.textContent = ''; // Limpiamos muy rápido
      const fragmento = document.createDocumentFragment(); // Sin reflows

      lista.forEach(product => {
        const li = document.createElement('li');
        li.textContent = product.title;
        li.style.color = product.isFruit ? 'magenta' : 'darkgreen';
        fragmento.appendChild(li);
      });

      $lista.appendChild(fragmento);
    });
  }
}
```

> **¡Pruébalo en vivo!** Este componente exacto ha sido construido e incluido en tu aplicación SPA de ejemplo bajo la etiqueta `<demo-shopping-list>`. Entra a tu SPA y míralo en acción.

---

## 2. Toggle Básico (Mostrar/Ocultar Opciones)

Ocultar elementos usando CSS puro es el patrón más rápido (cuesta 0ms de procesamiento JS comparado con destruir el nodo y volverlo a crear).

### Código:
```javascript
export class MiBoton extends MitaElement {
  async render() {
    this.innerHTML = `<button id="btn-magico">Ocultar</button>`;
    
    // Estado local para el toggle
    this.estadoOculto = crearEstadoLocal(false);
    const $btn = this.querySelector('#btn-magico');

    $btn.addEventListener('click', () => {
      this.estadoOculto.set(!this.estadoOculto.get()); // Invertimos el boolean
    });

    this.estadoOculto.suscribir((oculto) => {
      if (oculto) {
        $btn.textContent = 'Mostrar';
        $btn.classList.add('ocultar-panel-siguiente');
      } else {
        $btn.textContent = 'Ocultar';
        $btn.classList.remove('ocultar-panel-siguiente');
      }
    });
  }
}
```

> **¿Dónde lo veo?** Usamos exactamente este patrón para ocultar o mostrar el widget flotante del **Mita Profiler** en la esquina inferior derecha de la SPA.
