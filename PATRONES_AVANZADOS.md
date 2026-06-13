# 🧠 Patrones Avanzados y Rendimiento en MitaDOM

Esta guía documenta las lecciones aprendidas de otros frameworks modernos (Vue, Solid, Svelte) y cómo MitaDOM las asimila usando Vanilla JS nativo para alcanzar el máximo rendimiento, sin compiladores mágicos.

---

## 1. Vue Vapor, SolidJS y el Fin del Virtual DOM
Preguntabas por qué Vue.js está intentando cambiar a **Vapor Mode**, y SolidJS/Svelte son tan rápidos. La respuesta es: **El Virtual DOM es un cuello de botella.**

En React, cuando un estado cambia, se recrea un árbol virtual en la RAM y se compara (diffing) contra el DOM real. Esto cuesta CPU y batería.
- **Vue Vapor / SolidJS**: Compilan el código para que las actualizaciones modifiquen *directamente* el nodo exacto del DOM (`h1.textContent = valor`).
- **MitaDOM**: Logra exactamente esto mismo, pero **sin necesidad de compilar**. Nuestros **Signals** y métodos `update`/`patch` apuntan quirúrgicamente al DOM real.

---

## 2. Memoization y el Nuevo `ComputedSignal`
Para igualar el poder de `useMemo` (React) o `computed()` (Vue), hemos incorporado el `ComputedSignal`.

### ¿Para qué sirve? (Casos de Uso)
Imagina un estado global que guarda un arreglo de 10,000 usuarios, y necesitas renderizar "Usuarios Activos". Si usas una función normal, en cada renderizado iterarás 10,000 veces.

Con `ComputedSignal`:
```javascript
import { Signal, ComputedSignal } from 'mita-dom';

const estadoUsuarios = new Signal([{ id: 1, activo: true }, ...]);

// Esto es un CACHÉ MATEMÁTICO. Solo se ejecuta si estadoUsuarios cambia.
const usuariosActivos = new ComputedSignal(estadoUsuarios, (usuarios) => {
    return usuarios.filter(u => u.activo).length;
});

// El DOM se suscribe al estado computado.
usuariosActivos.suscribir(cantidad => {
    document.getElementById('badge').textContent = cantidad;
});
```
**Ventaja:** Ahorras ciclos de CPU. El cálculo pesado se memoiza automáticamente.

---

## 3. Red Inteligente (Smart Network y Polyfills)
Una web moderna debe adaptarse a las condiciones del usuario. 
Hemos integrado **Vite Legacy Plugin**, que inyecta polyfills (Core-JS) solo en navegadores viejos. Pero además, hemos creado el **`networkService.js`**.

```javascript
import { networkService } from '../services/networkService.js';

if (networkService.esConexionLenta()) {
   // Desactivar videos HD
   // No descargar assets no críticos
}
```
Esto permite a MitaDOM comportarse como una PWA inteligente, reduciendo el consumo de datos si detecta redes lentas (3G, 2G).

---

## 4. ESLint y Seguridad de Memoria
Para evitar errores humanos, hemos creado un Linter Inteligente (AST Parser) nativo para MitaDOM en `eslint.config.js`.

### La Regla: `mita-no-duplicate-persist-keys`
Si dos desarrolladores crean Signals distintos pero le asignan el mismo `persistKey`:
```javascript
const s1 = new Signal(0, { persistKey: 'mita_contador' });
const s2 = new Signal(0, { persistKey: 'mita_contador' }); // ESLint lanzará ERROR aquí
```
El Linter detendrá la compilación en seco, previniendo Fugas de Memoria y Colisiones en IndexedDB o LocalStorage antes de que lleguen a producción.

---

## 5. El Mita Profiler y los Límites de Rendimiento UI
Hemos construido un Widget Profiler (inspirado en Vercel Speed Insights) que analiza cuánto demora en renderizar cada componente. 

### Análisis Estricto: ¿Cuánto es "Lento"?
Para que la Interfaz de Usuario (UI) se perciba instantánea y no se congele al hacer scroll o animaciones, el navegador debe pintar la pantalla a **60 Frames Por Segundo (FPS)**.
Matemáticamente: `1000 milisegundos / 60 FPS = 16.6ms` por frame.

Sin embargo, el navegador necesita tiempo para calcular los estilos (Recalculate Style), dibujar los píxeles (Paint) y componer las capas (Composite). Por lo tanto, el presupuesto real para la ejecución de JavaScript no es 16.6ms, sino **entre 8ms y 10ms**.
Y en móviles modernos o monitores de **120 FPS**, el límite cae a la mitad (8.3ms en total, por lo que el JS tiene solo **~4-5ms**).

**Valores Recomendados que hemos establecido en `profilerStore.js`:**
- **Verde (< 5ms)**: Óptimo. Soporta pantallas a 120Hz sin parpadeos.
- **Amarillo (5ms - 10ms)**: Peligro. Sigue siendo fluido a 60FPS, pero si hay más lógica pesada, la UI empezará a tartamudear (jank).
- **Rojo (> 10ms)**: Componente Lento. Causará caída de frames perceptible por el usuario. Hay que aplicar Memoization (`ComputedSignal`) u optimizar el bucle.
