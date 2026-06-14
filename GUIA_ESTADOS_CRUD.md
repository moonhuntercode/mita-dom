# 🗃️ Guía Maestra: C.R.U.D. de Estados (Signals)

MitaDOM no utiliza un Virtual DOM. Nuestra reactividad se basa en **Signals** (Patrón Observador). Esto significa que cuando un dato cambia, sabemos exactamente qué nodo de texto actualizar, garantizando 0% de re-renders innecesarios.

Esta guía te enseñará cómo administrar la Memoria, el Estado Global y Local utilizando operaciones **C.R.U.D.** completas.

---

## 🏗️ CREATE (Crear Estados)

### 1. Estado Local (Atado al Componente)
Se crea en el `constructor()` del Web Component. Nace y muere con la instancia.
```javascript
import { crearEstadoLocal } from 'mita-dom';

export class MiComponente extends HTMLElement {
  constructor() {
    super();
    // Instancia local
    this.estadoLocal = crearEstadoLocal({ contador: 0 });
  }
}
```

### 2. Estado Global (Store Central)
Se crea en un archivo separado (ej. `src/store/global.js`) y se exporta. Sobrevive a la destrucción de los componentes.
```javascript
// src/store/global.js
import { crearEstadoGlobal } from 'mita-dom';
export const sessionActual = crearEstadoGlobal({ usuario: null, token: null });
```

---

## 📖 READ (Leer y Reaccionar)

Puedes leer el estado de dos formas: **Síncrona** o **Reactiva**.

### 1. Lectura Síncrona (Snapshot)
Si solo necesitas saber el valor en un instante (ej. al enviar un formulario), lee a través del método `.get()`.
```javascript
const nombre = this.estadoLocal.get().nombre;
```

### 2. Lectura Reactiva (Suscripción)
Para que el HTML cambie automáticamente, debes suscribirte. **Siempre** haz esto dentro del `connectedCallback()`:
```javascript
connectedCallback() {
  // Guardamos la referencia de la función anónima en una variable privada (_callback)
  // Esto es OBLIGATORIO para el paso DELETE (Desuscribirse).
  this._callback = (nuevoEstado) => {
    this.querySelector('#txt-contador').textContent = nuevoEstado.contador;
  };
  
  this.estadoLocal.suscribir(this._callback);
}
```

---

## ✍️ UPDATE (Actualizar Estados)

**Regla de Oro:** Siempre usa el principio de la Inmutabilidad. Nunca alteres propiedades de un objeto directamente, reemplaza el objeto completo usando el *Spread Operator* (`...`).

❌ **Forma Incorrecta (Mutación impura):**
```javascript
// Vite y MitaDOM no detectarán el cambio porque la referencia de memoria es la misma.
const estadoObj = this.estadoLocal.get();
estadoObj.contador += 1; 
```

✅ **Forma Correcta (Usando las utilidades CRUD de MitaDOM):**
```javascript
// Opción A: Reemplazo total con .set()
const estadoAnterior = this.estadoLocal.get();
this.estadoLocal.set({ ...estadoAnterior, contador: estadoAnterior.contador + 1 });

// Opción B (Recomendada): Usar .patch() para mergear propiedades automáticamente
this.estadoLocal.patch({ contador: estadoAnterior.contador + 1 });
```

---

## 🗑️ DELETE (Destrucción y Memory Leaks)

Si tu componente se oculta (o si un Router lo destruye), el ciclo de vida `disconnectedCallback()` entrará en acción.
Si te suscribiste a un **Estado Global**, y no te desuscribes, la función seguirá viva en la RAM ejecutándose en el fondo, creando un temido *Memory Leak*.

```javascript
disconnectedCallback() {
  // OBLIGATORIO: Soltamos la referencia del Signal Global
  if (this._callbackGlobal) {
    sessionActual.desuscribir(this._callbackGlobal);
  }
  
  // OBLIGATORIO: Destrucción total (CRUD: Delete) del Estado Local
  // Esto libera los suscriptores internos y limpia la memoria según las Web APIs de JS
  this.estadoLocal.destroy();
}
```

---

## 📡 Integración con Telemetría (Logger Backend)
Tal como lo verás en la arquitectura avanzada, nunca deberías hacer `console.log()` directo para debuggear mutaciones. Utiliza tu servicio de Telemetría (ej. `src/utils/logger.js`) para interceptar las actualizaciones complejas.

```javascript
// Ejemplo de Telemetría al Update
Logger.info('Usuario mutó el Signal del Carrito', { items: 5 });
```

---

## 🌍 Arquitectura de Estados Globales (Ejemplo de Producción)
Cuando tu app crece, necesitarás comunicar componentes lejanos. Aquí tienes un ejemplo **Codebase Snapshot** de cómo estructurar tus archivos usando **solo Estados Globales**:

### 1. Crear el Store Global
Ubicación: `src/store/authStore.js`
```javascript
import { crearEstadoGlobal } from 'mita-dom';

// Exportamos un estado global con persistencia para que sobreviva recargas (Local Storage)
export const estadoAuth = crearEstadoGlobal({
    usuario: null,
    logeado: false
}, { persistKey: 'mita_auth_session' });
```

### 2. Componente que MUTA el estado global (Header/Login)
```javascript
import { MitaElement } from 'mita-dom';
import { estadoAuth } from '../store/authStore.js';

export class LoginForm extends MitaElement {
    async render() {
        this.innerHTML = `<button id="btn-login">Iniciar Sesión</button>`;
        this.querySelector('#btn-login').addEventListener('click', () => {
            // El estado global muta!
            estadoAuth.patch({ usuario: 'Victor', logeado: true });
        });
    }
}
```

### 3. Componente que REACCIONA al estado global (Sidebar/Perfil)
```javascript
import { MitaElement } from 'mita-dom';
import { estadoAuth } from '../store/authStore.js';

export class Sidebar extends MitaElement {
    async render() {
        this.innerHTML = `<div id="welcome"></div>`;
    }

    connectedCallback() {
        super.connectedCallback?.();
        
        // Reaccionamos en tiempo real, desde cualquier parte del DOM
        this.subAuth = (auth) => {
            this.querySelector('#welcome').textContent = auth.logeado 
                ? \`Hola, \${auth.usuario}!\` 
                : 'Por favor, inicia sesión';
        };
        estadoAuth.suscribir(this.subAuth);
    }

    disconnectedCallback() {
        super.disconnectedCallback?.();
        // Liberar la memoria global es OBLIGATORIO
        estadoAuth.desuscribir(this.subAuth);
    }
}
```
*Este patrón garantiza que 10, 20 o 100 componentes puedan estar sincronizados en 0 milisegundos sin necesidad de pasar atributos HTML o Props gigantes entre componentes.*
