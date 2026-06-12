# 🌿 mita-dom

**mita-dom** es una librería reactiva moderna, modular e inclusiva, construida puramente sobre Vanilla JavaScript y Web Components nativos.

## 📖 El Origen del Nombre

El nombre de nuestro proyecto encierra un doble y poderoso significado cultural:

- **Mitay** (del Quechua): Refiere al sistema de "turnos de trabajo" optimizado en el Potosí colonial. En mita-dom, esto representa el motor interno de nuestro sistema reactivo (*Signals*), el cual gestiona y despacha las actualizaciones del DOM por turnos precisos y granulares, logrando la máxima eficiencia sin sobrecargar el procesador.
- **Mita** (del Guaraní): Significa "niño", "nuevo" o "nacimiento". Simboliza el renacer de la Web Nativa; una arquitectura fresca que devuelve a los desarrolladores a los fundamentos de la web, libres del peso de corporaciones y *frameworks* pesados.

## 🚀 ¿Qué hemos construido?

mita-dom es una librería de nivel Enterprise con **Cero Dependencias**. No utilizamos paquetes de terceros; de hecho, nuestra suite de pruebas está construida íntegramente sobre el estándar nativo de Node.js (`node:test`), sin requerir librerías externas pesadas como Vitest o Jest.

Ofrece un ecosistema completo para *Single Page Applications* (SPAs) enfocándose en el rendimiento absoluto:

- ⚛️ **Reactividad Granular (Signals):** Eliminamos el pesado *Virtual DOM*. Mutamos solo el texto necesario (`.textContent`) con precisión quirúrgica, optimizando el uso de CPU y batería.
- 🧭 **Router SPA Nativo:** Navegación ultra rápida e interceptada usando el estándar moderno `Navigation API`.
- 📦 **Componentes Modulares:** *Web Components* aislados y seguros utilizando CSS nativo (`@scope`), con un enfoque estricto en *Mobile First* y HTML Semántico.
- ⚡ **Fetch Reactivo:** Gestión limpia y asíncrona de recursos (`loading`, `data`, `error`) con excelente Experiencia del Desarrollador (DX).

## ⚙️ Inicio Rápido y Uso

mita-dom no te obliga a configurar compiladores extraños. Puedes usarlo en proyectos existentes o crear uno nuevo desde cero.

---

## 🚨 Guía de Migración a v2.x (Breaking Changes)
Si vienes de la versión `1.x`, debes tener en cuenta los siguientes cambios arquitectónicos introducidos en la **v2.1.6**:

1. **Eliminación de `estadoAppGlobal`**: El core del framework ya no exporta estados globales prefabricados. Ahora tú debes crear tus propias instancias en tu aplicación: `const miEstado = new Signal(0)`.
2. **Nueva API CRUD para Signals**: Las mutaciones directas (`estado.value = 10`) han sido deprecadas. Ahora debes usar `.get()`, `.set()`, `.update()`, `.patch()` y `.reset()`.
3. **Persistencia y Arquitectura Avanzada**: El constructor de `Signal` ahora acepta un objeto de opciones para Inmutabilidad y Adaptadores de Bases de Datos (`storageAdapter`).
4. **Mita Vite Plugin**: Se incluyó `mitaHmrPlugin()` para facilitar el Granular HMR en tus proyectos de Vite.

---

### 1. Iniciar un proyecto nuevo (Automatizado)

Si quieres empezar un proyecto nuevo con todo configurado automáticamente (Servidor local, Bundler, y TypeScript opcional), te recomendamos usar el andamiaje oficial de Vite:

```bash
# Para crear un proyecto en Vanilla JS puro:
npm create vite@latest mi-proyecto -- --template vanilla

# O si prefieres TypeScript (Configurará tsconfig.json y entorno automáticamente):
npm create vite@latest mi-proyecto -- --template vanilla-ts
```

### 2. Instalar mita-dom

Entra a la carpeta de tu proyecto e instala nuestra librería:

```bash
cd mi-proyecto
npm install mita-dom
```

### 3. Uso Básico

mita-dom es modular, solo importas lo que necesitas. Aquí un ejemplo rápido usando *Signals* y el *Router*:

```javascript
import { Signal, rutaActual, navegarA } from 'mita-dom';

// Crear estado con persistencia e inmutabilidad
const estadoGlobal = new Signal({ contador: 0 }, { 
  immutable: true,
  persistKey: 'mi_app_estado'
});

// Mutación parcial avanzada (v2.x)
estadoGlobal.patch({ contador: 1 });
rutaActual.suscribir((ruta) => {
    console.log("El usuario navegó de manera fluida a:", ruta);
});
```

### 💙 Compatibilidad Total con TypeScript

mita-dom está escrita en Vanilla JS, pero **incluye nativamente sus archivos de declaración (`.d.ts`)**. ¡No necesitas instalar paquetes `@types/mita-dom` extra!

Si usas TypeScript en tu proyecto, disfrutarás de autocompletado estricto y soporte para genéricos de inmediato:

```typescript
import { Signal, crearRecurso } from 'mita-dom';

// TypeScript inferirá estrictamente que este Signal solo acepta números
const contador = new Signal<number>(0);

// Forzará errores en tiempo de compilación si intentas algo inválido:
// contador.value = "hola"; // ❌ Error TS: Type 'string' is not assignable to type 'number'
```

### 3. Ejemplos y Entorno de Desarrollo

Para probar la librería en un entorno real y visualizar componentes, consulta nuestros proyectos de ejemplo separados:

- **`example-mita-spa-01-js`**: Aplicación de ejemplo usando Vite + Vanilla JS + mita-dom.

> [!WARNING]
> **No utilices `npm run preview` dentro de este repositorio.** mita-dom es una librería, no una SPA. El comando `preview` de Vite devolverá un error 404 porque no genera un `index.html` en la compilación. Para probar mita-dom, instálalo en un proyecto externo.

### 4. Pruebas Automáticas

Mantenemos la librería ligera usando los test-runners nativos de Node.js v24:

```bash
node --test
```

## 🌍 Inclusividad Tecnológica

De **Bolivia para el mundo**. mita-dom es nuestra respuesta social a la sobrecomplejidad de la industria actual. Al no depender de pesadas librerías de terceros, construimos aplicaciones extremadamente ligeras y veloces que cargan al instante.

Esto permite que personas con dispositivos móviles de gama baja o conexiones a internet limitadas puedan acceder a la información sin barreras, logrando una **verdadera inclusión digital**.

---
*mita-dom te devuelve el control y la comprensión profunda de la Web.*

- 📚 Lee nuestra visión y filosofía técnica en el [MANIFIESTO.md](./MANIFIESTO.md).
- 🛠️ Aprende a mejorar o actualizar la librería en nuestra [Guía de Mantenimiento](./CONTRIBUTING.md).
