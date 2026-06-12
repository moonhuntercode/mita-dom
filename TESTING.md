# Estrategia de Pruebas: mita-dom

Este documento detalla la estrategia de pruebas manuales y automáticas para garantizar la calidad, reactividad y rendimiento de la librería mita-dom.

## 🤖 Pruebas Automáticas (Unit Testing)

Hemos adoptado el *test runner* nativo de Node.js v24 (`node:test`) para mantener un stack moderno y sin dependencias pesadas.

### Ejecución

```bash
node --test
```

### Cobertura Central

1. **Motor Reactivo (`test/signals.test.js`)**:
   - Inicialización, sincronización inmediata, notificación y prevención de duplicados (`Set`).
2. **Fetch Granular Reactivo (`test/resource.test.js`)**:
   - Validación asíncrona de los estados `loading`, `data` y `error`.

> **Nota sobre el Router:** El módulo `router.js` depende de la exclusiva `window.navigation` (Navigation API). Su prueba se realiza mediante QA Manual en entornos de navegador reales, ya que Node.js v24 no posee esta API por defecto.

## 🧑‍💻 Pruebas Manuales (QA Visual, Routing SPA y Componentes)

Levanta el servidor local con `npm run dev` y dirígete a `http://localhost:5173/`.

### Checklist de Pruebas Visuales (Mobile First & Deuda Técnica)

1. **Routing y Single Page Application (SPA)**:
   - Haz clic en el botón "Ver Perfil (Fetch & SPA)" del menú de navegación.
   - **Crucial:** Observa que la página **NO SE RECARGA** (el ícono del navegador no gira). El componente `<mita-perfil>` debe aparecer y las `<mita-tarjeta>` deben desaparecer instantáneamente gracias a la interceptación de la *Navigation API*.
2. **Fetch Granular (UX/DX)**:
   - Al entrar al `/perfil`, deberás ver la animación pulsante de *Cargando datos desde la API...* (gestionada por `recurso.loading`).
   - Tras 1.5 segundos, el esqueleto debe ser reemplazado granularmente por los datos reales de Jane Doe.
3. **Validación de Memory Leaks (Garbage Collection)**:
   - Ingresa a la consola de desarrollo (F12 -> Console).
   - Nuestra refactorización del `disconnectedCallback` en `<mita-tarjeta>` asegura que al navegar de `/` a `/perfil`, la tarjeta destruye sus listeners del estado global, previniendo los *memory leaks* por Closures retenidos.
4. **CSS Mobile First e Inyección Semántica**:
   - Inspecciona el `<mita-perfil>` en móvil (<768px). Comprueba los estilos y acentos de color naranja.
   - Observa que las etiquetas generadas son semánticas (`<h2>`, `<nav>`, `<p>`) y los estilos nunca escapan gracias al CSS `@scope (:scope)`.
