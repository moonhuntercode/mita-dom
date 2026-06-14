# 🏗️ Fundamentos de MitaDOM

Para dominar MitaDOM y contribuir al código fuente, es crucial entender los tres pilares de nuestra filosofía técnica: **Signals**, **El DOM Granular**, y la gestión de **Estados**.

MitaDOM elimina por completo el Virtual DOM. No hay algoritmos de reconciliación ni "árboles fantasma" comparándose entre sí en cada fotograma. Operamos directamente sobre el DOM real con precisión quirúrgica (`O(1)`).

---

## 1. La Revolución de los Signals
En librerías tradicionales (React), un cambio de estado fuerza a todo el componente (y a sus hijos) a re-evaluarse. En MitaDOM, el estado vive de forma independiente del ciclo de renderizado.

### El patrón Pub/Sub Reactivo
Cuando declaras un Estado, estás creando una bóveda de datos que notifica a sus suscriptores *solo cuando el valor realmente cambia*.
```javascript
import { crearEstadoLocal } from 'mita-dom';

const contador = crearEstadoLocal(0);

// Suscripción atómica
contador.suscribir((nuevoValor) => {
  document.getElementById('display').textContent = nuevoValor;
});

// Mutación (dispara la actualización en 0 milisegundos)
contador.set(1); 
```

---

## 2. Granular DOM (Cero VDOM)
Cuando usas `DocumentFragment` o manipulas el DOM directamente dentro de un `suscribir`, estás realizando un "Granular DOM Update". 
Si tienes una lista de 10,000 elementos y mutas uno, solo ese nodo específico del DOM recibe la actualización. Vite y el navegador se encargan de pintar la pantalla a máxima velocidad.

---

## 3. Estados Locales vs. Globales

### Estado Local (`crearEstadoLocal`)
Vive dentro del ciclo de vida de un Web Component. Se usa para controlar la UI interna de ese componente (ej. un input, un contador). Al usar `crearEstadoLocal` obtienes feedback automático en consola con el prefijo `🏠 [MitaDOM] Estado Local Mutado con éxito`.
```javascript
import { crearEstadoLocal } from 'mita-dom';

export class MiBoton extends MitaElement {
  constructor() {
    super();
    this.estadoHover = crearEstadoLocal(false); // Se destruye cuando el botón desaparece
  }
}
```

### Estado Global (`crearEstadoGlobal` o Store)
Se crea en un archivo `.js` separado (ej. `src/store/userStore.js`) y se exporta. Al mutarse, genera un log `🌍 [MitaDOM] Estado Global Mutado con éxito`. **Es el corazón de MitaDOM para compartir datos entre componentes**.
- Evita el *Prop Drilling* (pasar variables de padre a hijo a nieto).
- Habilita patrones como los *Portales* (ver `TELEPORT.md`).

---

## 4. Conditional Rendering Nativo (`v-if` / `v-show`)

En MitaDOM no usamos directivas mágicas en el HTML. Todo ocurre en JavaScript puro.

### Ocultamiento Visual (Estilo `v-show`)
La forma más rápida de ocultar un elemento es mediante CSS. MitaDOM brilla aquí:
```javascript
import { crearEstadoLocal } from 'mita-dom';

const mostrarAlerta = crearEstadoLocal(false);
const $alerta = this.querySelector('.alerta');

mostrarAlerta.suscribir(visible => {
  $alerta.style.display = visible ? 'block' : 'none';
});
```
*Ventaja*: El nodo no se destruye, mantiene sus Event Listeners y consume memoria estática.

### Renderizado Dinámico (Estilo `v-if`)
Si necesitas destruir el nodo para liberar recursos:
```javascript
mostrarAlerta.suscribir(visible => {
  if (visible) {
    this.$contenedor.innerHTML = '<mi-alerta></mi-alerta>';
  } else {
    this.$contenedor.innerHTML = ''; // Garbage Collection elimina el componente
  }
});
```
*Recomendación*: Prefiere el estilo `v-show` (`display: none`) para componentes de navegación rápida, y el estilo `v-if` para vistas masivas de ruteo.
