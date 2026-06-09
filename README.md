# 🌿 MitaDOM

**MitaDOM** es una librería reactiva moderna, modular e inclusiva, construida puramente sobre Vanilla JavaScript y Web Components nativos.

## 📖 El Origen del Nombre
El nombre de nuestro proyecto encierra un doble y poderoso significado cultural:
- **Mitay** (del Quechua): Refiere al sistema de "turnos de trabajo" optimizado en el Potosí colonial. En MitaDOM, esto representa el motor interno de nuestro sistema reactivo (*Signals*), el cual gestiona y despacha las actualizaciones del DOM por turnos precisos y granulares, logrando la máxima eficiencia sin sobrecargar el procesador.
- **Mita** (del Guaraní): Significa "niño", "nuevo" o "nacimiento". Simboliza el renacer de la Web Nativa; una arquitectura fresca que devuelve a los desarrolladores a los fundamentos de la web, libres del peso de corporaciones y *frameworks* pesados.

## 🚀 ¿Qué hemos construido?
MitaDOM ofrece un ecosistema completo para *Single Page Applications* (SPAs) enfocándose en el rendimiento absoluto:
- ⚛️ **Reactividad Granular (Signals):** Eliminamos el pesado *Virtual DOM*. Mutamos solo el texto necesario (`.textContent`) con precisión quirúrgica, optimizando el uso de CPU y batería.
- 🧭 **Router SPA Nativo:** Navegación ultra rápida e interceptada usando el estándar moderno `Navigation API`.
- 📦 **Componentes Modulares:** *Web Components* aislados y seguros utilizando CSS nativo (`@scope`), con un enfoque estricto en *Mobile First* y HTML Semántico.
- ⚡ **Fetch Reactivo:** Gestión limpia y asíncrona de recursos (`loading`, `data`, `error`) con excelente Experiencia del Desarrollador (DX).

## ⚙️ Instalación y Uso

### 1. Instalación (Próximamente en NPM)
Instala la librería en tu proyecto:
```bash
npm install mita-dom
```

### 2. Uso Básico
MitaDOM es modular, solo importas lo que necesitas. Aquí un ejemplo rápido usando *Signals* y el *Router*:

```javascript
import { Signal, rutaActual, MitaTarjeta } from 'mita-dom';

// Crear un estado reactivo puro
const estadoGlobal = new Signal(0);

// Suscribirse a los cambios de la URL (Navigation API)
rutaActual.suscribir((ruta) => {
    console.log("El usuario navegó de manera fluida a:", ruta);
});
```

### 3. Entorno de Desarrollo (Playground)
Si clonas el repositorio y quieres interactuar con la librería y sus componentes base, levanta el servidor de Vite:
```bash
npm install
npm run dev
```
Esto abrirá en `http://localhost:5173/` nuestro entorno interactivo.

### 4. Pruebas Automáticas
Mantenemos la librería ligera usando los test-runners nativos de Node.js v24:
```bash
node --test
```

## 🌍 Inclusividad Tecnológica
De **Bolivia para el mundo**. MitaDOM es nuestra respuesta social a la sobrecomplejidad de la industria actual. Al no depender de pesadas librerías de terceros, construimos aplicaciones extremadamente ligeras y veloces que cargan al instante. 

Esto permite que personas con dispositivos móviles de gama baja o conexiones a internet limitadas puedan acceder a la información sin barreras, logrando una **verdadera inclusión digital**.

---
*MitaDOM te devuelve el control y la comprensión profunda de la Web.* 
📚 Puedes leer nuestra visión completa en el [MANIFIESTO.md](./MANIFIESTO.md).
