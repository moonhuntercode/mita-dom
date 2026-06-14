# 🌐 Datos, APIs y Asincronía

MitaDOM abraza las características asíncronas modernas de JavaScript (`async/await`, `fetch`, `Promesas`) integrándolas naturalmente con el sistema de Signals.

## 1. Consumo de APIs Externas (Fetch)
No necesitas librerías como Axios o React Query. La API nativa `fetch` de HTML5 junto con un Signal local es suficiente para crear interfaces robustas que manejan estados de "Carga", "Error" y "Éxito".

```javascript
import { crearEstadoLocal, MitaElement } from 'mita-dom';

export class ListaUsuarios extends MitaElement {
  constructor() {
    super();
    // Signal local que contiene el estado completo de la petición
    this.estadoPeticion = crearEstadoLocal({
      cargando: true,
      error: null,
      datos: []
    });
  }

  async connectedCallback() {
    // Al conectarnos al DOM, llamamos a la API
    try {
      const res = await fetch('https://jsonplaceholder.typicode.com/users');
      if (!res.ok) throw new Error('Error en la API');
      
      const usuarios = await res.json();
      
      // Actualizamos el Signal con los datos
      this.estadoPeticion.patch({ cargando: false, datos: usuarios });
    } catch (err) {
      this.estadoPeticion.patch({ cargando: false, error: err.message });
    }
  }

  iniciarLogica() {
    const $container = this.querySelector('.resultados');

    this.estadoPeticion.suscribir(estado => {
      if (estado.cargando) {
        $container.innerHTML = '<p>Cargando usuarios...</p>';
        return;
      }
      
      if (estado.error) {
        $container.innerHTML = `<p class="error">${estado.error}</p>`;
        return;
      }

      // Renderizamos la lista real usando el Granular DOM
      const fragmento = document.createDocumentFragment();
      estado.datos.forEach(user => {
        const li = document.createElement('li');
        li.textContent = user.name;
        fragmento.appendChild(li);
      });
      
      $container.innerHTML = '';
      $container.appendChild(fragmento);
    });
  }
}
```

## 2. Base de Datos Local y Persistencia

Las Single Page Applications necesitan a menudo guardar datos en el dispositivo del usuario (`localStorage` o `IndexedDB`). 
MitaDOM ofrece persistencia automática en sus Signals mediante opciones de inicialización.

### Adaptador de Storage
Cuando creas un Signal global, puedes pasarle la clave `persistKey`.

```javascript
import { crearEstadoGlobal } from 'mita-dom';

const estadoCarrito = crearEstadoGlobal([], {
  persistKey: 'mita_spa_carrito',
  immutable: true // Recomendado para arrays complejos
});
```

**¿Qué sucede bajo el capó?**
1. **Lectura Automática**: Al arrancar la SPA, el Signal busca en `localStorage` (o en IndexedDB si proporcionas un adaptador personalizado) si existe la clave `mita_spa_carrito`. Si existe, inicializa la variable con esos datos instantáneamente.
2. **Escritura Automática**: Cada vez que ejecutas `estadoCarrito.patch()` o `estadoCarrito.update()`, el Signal guarda la copia serializada en el almacenamiento local en un micro-tick, garantizando que el usuario jamás pierda sus datos si cierra la pestaña accidentalmente.

## 3. Manejo Inteligente de Errores (Error Boundaries Locales)
Recuerda que `MitaElement` ya actúa como un *Error Boundary*. Si durante un `fetch` ocurre un error no manejado que crashea tu componente, el resto de la aplicación (el Sidebar, el Header) seguirá funcionando perfectamente, y ese componente específico renderizará la vista `fallbackUI()`.
