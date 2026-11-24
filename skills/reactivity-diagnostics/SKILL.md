---
name: mita-reactivity-diagnostics
description: Guía oficial de auto-reparación de diagnósticos reactivos de MitaDOM para Agentes IA y desarrolladores (inspirada en Solid 2.0 Agent Repair Guides).
---

# 🤖 MitaDOM Reactivity Diagnostics — Agent Repair Guide

Cuando MitaDOM emite un código `[MITA_*]` en consola o mediante `obtenerDiagnosticosAgente()`, busca su sección aquí y aplica el patrón recomendado sin romper el Light DOM ni introducir `display: none`.

---

## `#mita_lectura_sin_rastreo` (`MITA_LECTURA_SIN_RASTREO` / Solid `STRICT_READ_UNTRACKED`)

- **Síntoma:** Se llamó `signal.get()` una sola vez fuera de un ámbito reactivo y el DOM quedó congelado.
- **Corrección:** Mueve la lectura dentro de `crearEfecto(() => ...)`, `this.vincularTexto(signal, selector, fn)` o `this.escucharEstado(signal, cb)`.

```js
// ❌ Incorrecto
this.querySelector('#total').textContent = total.get();

// ✅ Correcto (auto-limpiado en disconnectedCallback)
this.vincularTexto(total, '#total', (n) => `Bs. ${n}`);
```

---

## `#mita_espera_prolongada` (`MITA_ESPERA_PROLONGADA` / Solid `LONG_HOLD`)

- **Síntoma:** Un `crearMemoAsincrono()` superó `umbralEsperaProlongadaMs` manteniendo datos previos (*stale*).
- **Corrección:**
  1. Muestra retroalimentación visual cuando `recurso.estaPendiente()` sea `true` (ej. clase `.stale` o indicador `Actualizando...`).
  2. Revisa latencia de tu endpoint Express/MySQL o habilita caché en `crearControladorFetchingPorModo()`.

---

## `#mita_cascada_asincrona` (`MITA_CASCADA_ASINCRONA` / Solid `ASYNC_WATERFALL`)

- **Síntoma:** Múltiples `await` secuenciales independientes al montar una vista.
- **Corrección:** Ejecuta consultas independientes en paralelo con `Promise.all([fetchA(), fetchB()])` o consolídalas en una sola `crearFuncionServidor()`.

---

## `#mita_bucle_efecto` (`MITA_BUCLE_EFECTO` / Solid `EFFECT_LOOP`)

- **Síntoma:** Un `crearEfecto()` llama `.set()` sobre el mismo Signal que lee.
- **Corrección:** Usa `signal.derivar(fn)` para estado de solo lectura o `crearEstadoVinculado(leerFuente, calcular)` (estilo Angular `linkedSignal`) si el valor derivado también debe ser editable por el usuario.

---

## `#mita_sin_limpieza_dom` (`MITA_SIN_LIMPIEZA_DOM` / Solid `MISSING_CLEANUP`)

- **Síntoma:** Suscripciones, `setInterval`, `EventSource` o listeners creados en un Web Component sin liberar al desmontar.
- **Corrección:** Registra toda función `detener()` con `this.registrarLimpieza(detener)` o usa `this.escucharEstado()`, `this.vincularTexto()` y `this.mostrarSi()`.

---

## `#mita_render_duplicado` (`MITA_RENDER_DUPLICADO`)

- **Síntoma:** Llamar `this.render()` manualmente dentro de `alMontar()` cuando `MitaElement` ya ejecuta el ciclo oficial `alCrear() → alAntesDeRenderizar() → render() → alMontar()`.
- **Corrección:** Inicializa tus Signals en `alCrear()`, pinta el HTML base en `render()` y conecta tus listeners/Signals en `alMontar()` sin invocar `this.render()` de nuevo.
