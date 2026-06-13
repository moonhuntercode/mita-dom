# 🚀 Portales y Comunicación Transversal (Teleport)

Cuando construyes aplicaciones complejas, a menudo te encuentras con la necesidad de renderizar un componente fuera de la jerarquía normal del DOM (por ejemplo, Modales, Tooltips o menús de navegación globales).

Frameworks como React utilizan `createPortal`, y Vue o Solid utilizan `<Teleport>` o `<Portal>`. En **MitaDOM**, la aproximación recomendada es **Arquitectura de Signals Globales + Renderizado Quirúrgico**, logrando un resultado idéntico con mejor rendimiento y cero librerías extra.

## El Problema
Imagina que tienes una barra lateral global (`Sidebar`) en tu `index.html`, y una vista principal (`<mita-docs>`) que necesita insertar botones de navegación **dentro** de ese Sidebar.

Si movemos los nodos del DOM físicamente, rompemos la encapsulación de eventos y el flujo natural del navegador.

## La Solución MitaDOM

En lugar de crear un elemento `<teleport>`, en MitaDOM **elevamos el estado a un Signal Global**. 

1. **Creamos un Store Global:**
```javascript
import { Signal } from 'mita-dom';
export const estadoDocActivo = new Signal('readme');
```

2. **El "Emisor" (El Menú)**
Se inyecta un componente `<mita-docs-nav>` directamente en el Sidebar global. Este componente modifica el Signal cuando haces click:
```javascript
// mita-docs-nav.js
estadoDocActivo.set('componentes'); // ¡Teleport de estado!
```

3. **El "Receptor" (La Vista Principal)**
La vista `<mita-docs>` se suscribe al Signal y renderiza el contenido, independientemente de dónde provino el evento:
```javascript
// mita-docs.js
estadoDocActivo.suscribir((idDoc) => {
  this.$container.innerHTML = parsearMarkdown(idDoc);
});
```

### 🪄 Renderizado Condicional
Para hacer que el menú desaparezca cuando navegas a otra ruta (ej. `/perfil`), simplemente suscribimos el `<mita-docs-nav>` a la ruta global:
```javascript
import { rutaActual } from 'mita-dom';

rutaActual.suscribir(ruta => {
  this.style.display = (ruta === '/docs') ? 'block' : 'none';
});
```

## Beneficios
- **Cero Reflows Extremos**: No insertamos ni eliminamos componentes completos del DOM, solo ocultamos visualmente con CSS (`display: none`), lo que toma `0ms`.
- **Desacoplamiento Absoluto**: El Emisor y el Receptor no necesitan saber de la existencia del otro.
- **Testabilidad**: Puedes probar la lógica mutando directamente `estadoDocActivo.set('nuevo')` sin necesidad de simular clics en el DOM.
