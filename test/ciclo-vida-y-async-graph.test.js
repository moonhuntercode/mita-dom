import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost/' });
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.customElements = dom.window.customElements;
globalThis.CustomEvent = dom.window.CustomEvent;
globalThis.Event = dom.window.Event;

const {
  MitaElement,
  crearEstadoLocal,
  crearEfecto,
  sinRastrear,
  crearMemoAsincrono,
  crearEstadoVinculado,
  crearEstadoOptimistaConRollback,
  crearFuncionServidor,
  crearFuncionServidorEnVivo,
  definirEstrategiaRenderRuta,
  cambiarEstrategiaRender,
  obtenerMapaEstrategiasRender,
  emitirDiagnosticoAgente,
  obtenerDiagnosticosAgente,
  limpiarDiagnosticosAgente
} = await import('../src/index.js');

test('MitaElement: ejecuta ciclo de vida completo en orden exacto y auto-limpia en disconnectedCallback', () => {
  const orden = [];

  class TarjetaCicloTest extends MitaElement {
    static get observedAttributes() {
      return ['color-acento'];
    }

    alCrear() {
      orden.push('alCrear');
      this.contador = crearEstadoLocal(1);
    }

    alAntesDeRenderizar() {
      orden.push('alAntesDeRenderizar');
    }

    render() {
      orden.push('render');
      this.innerHTML = `<section><strong class="valor"></strong></section>`;
    }

    alMontar() {
      orden.push('alMontar');
      this.vincularTexto(this.contador, '.valor', (n) => `Valor: ${n}`);
    }

    alCambiarProp(prop, antes, ahora) {
      orden.push(`alCambiarProp:${prop}:${antes}->${ahora}`);
    }

    alActualizar(motivo) {
      orden.push(`alActualizar:${motivo}`);
    }

    alDesmontar() {
      orden.push('alDesmontar');
    }
  }

  if (!customElements.get('tarjeta-ciclo-test')) {
    customElements.define('tarjeta-ciclo-test', TarjetaCicloTest);
  }

  const el = document.createElement('tarjeta-ciclo-test');
  document.body.appendChild(el);

  assert.equal(el.querySelector('.valor').textContent, 'Valor: 1');
  el.contador.set(5);
  assert.equal(el.querySelector('.valor').textContent, 'Valor: 5');

  el.setAttribute('color-acento', 'teal');
  el.solicitarActualizacion('refresco-manual');

  const snapMontado = el.obtenerCicloDeVida();
  assert.equal(snapMontado.montado, true);
  assert.equal(snapMontado.limpiezasPendientes, 1);

  el.remove();
  const snapDesmontado = el.obtenerCicloDeVida();
  assert.equal(snapDesmontado.montado, false);
  assert.equal(snapDesmontado.limpiezasPendientes, 0);

  assert.deepEqual(orden, [
    'alCrear',
    'alAntesDeRenderizar',
    'render',
    'alMontar',
    'alCambiarProp:colorAcento:null->teal',
    'render',
    'alActualizar:refresco-manual',
    'alDesmontar'
  ]);
});

test('crearMemoAsincrono + crearEstadoVinculado: cascada estilo Solid 2.0 + Angular linkedSignal sin race conditions', async () => {
  limpiarDiagnosticosAgente();
  const departamento = crearEstadoLocal('Santa Cruz');

  const catalogo = {
    'Santa Cruz': ['Santa Cruz de la Sierra', 'Montero'],
    Cochabamba: ['Cochabamba', 'Quillacollo']
  };

  const ciudades = crearMemoAsincrono(
    async () => {
      const dep = departamento.get();
      const delay = dep === 'Santa Cruz' ? 40 : 5;
      await new Promise((r) => setTimeout(r, delay));
      return catalogo[dep];
    },
    { valorInicial: [], umbralEsperaProlongadaMs: 15, nombre: 'ciudadesBolivia' }
  );

  const ciudadSeleccionada = crearEstadoVinculado(
    () => ciudades.estado.get().valor || [],
    (lista) => lista[0] || ''
  );

  // Disparamos cambio rápido antes de que termine Santa Cruz (simula race condition)
  await new Promise((r) => setTimeout(r, 20));
  assert.equal(ciudades.esperaProlongada(), true); // Dispara LONG_HOLD (>15ms)
  assert.ok(obtenerDiagnosticosAgente().some((d) => d.codigo === 'MITA_ESPERA_PROLONGADA'));

  departamento.set('Cochabamba');
  await new Promise((r) => setTimeout(r, 60));

  // Debe ganar la última respuesta (Cochabamba), nunca la vieja (Santa Cruz)
  assert.deepEqual(ciudades.valor(), ['Cochabamba', 'Quillacollo']);
  assert.equal(ciudadSeleccionada.get(), 'Cochabamba');

  // El usuario puede sobrescribir el linkedSignal manualmente
  ciudadSeleccionada.set('Quillacollo');
  assert.equal(ciudadSeleccionada.get(), 'Quillacollo');

  ciudadSeleccionada.destruir();
  ciudades.destruir();
});

test('crearEstadoOptimistaConRollback: confirma en éxito y revierte automáticamente al fallar el servidor', async () => {
  const stock = crearEstadoOptimistaConRollback(10);

  const fallo = await stock.aplicarConServidor(9, async () => {
    throw new Error('Error de conexión MySQL');
  });
  assert.equal(fallo.ok, false);
  assert.equal(fallo.rollback, true);
  assert.equal(stock.valor(), 10);
  assert.equal(stock.estado.get().seHizoRollback, true);

  const exito = await stock.aplicarConServidor(9, async () => 9);
  assert.equal(exito.ok, true);
  assert.equal(stock.valor(), 9);
  stock.destruir();
});

test('crearFuncionServidor + crearFuncionServidorEnVivo (live async function*): RPC y streaming SSE reactivo', async () => {
  const crearPlato = crearFuncionServidor(
    'menu/crearPlato',
    async (payload) => ({ id: 99, ...payload }),
    { validar: (p) => (!p.nombre ? 'Nombre requerido' : null) }
  );

  const errVal = await crearPlato.ejecutar({ nombre: '' });
  assert.equal(errVal.ok, false);
  assert.equal(errVal.error, 'Nombre requerido');

  const ok = await crearPlato.ejecutar({ nombre: 'Majadito' });
  assert.equal(ok.ok, true);
  assert.equal(ok.datos.id, 99);

  const stream = crearFuncionServidorEnVivo('cocina/ticks', async function* (mesa) {
    yield { mesa, paso: 'recibido' };
    yield { mesa, paso: 'listo' };
  });

  await stream.iniciar(7);
  assert.equal(stream.estado.get().ticks, 2);
  assert.deepEqual(stream.ultimoValor(), { mesa: 7, paso: 'listo' });

  crearPlato.destruir();
  stream.destruir();
});

test('definirEstrategiaRenderRuta + cambiarEstrategiaRender + emitirDiagnosticoAgente', () => {
  limpiarDiagnosticosAgente();
  definirEstrategiaRenderRuta('/empleos', 'SSR');
  const cambiada = cambiarEstrategiaRender('/empleos', 'RESUMABLE', { cacheSegundos: 120 });
  assert.equal(cambiada.estrategia, 'RESUMABLE');
  assert.equal(cambiada.cacheSegundos, 120);
  assert.ok(obtenerMapaEstrategiasRender().some((r) => r.ruta === '/empleos' && r.estrategia === 'RESUMABLE'));

  const diag = emitirDiagnosticoAgente('MITA_LECTURA_SIN_RASTREO', {
    origen: '<mi-componente>:14',
    silencioso: true
  });
  assert.equal(diag.equivalenteSolid2, 'STRICT_READ_UNTRACKED');
  assert.ok(diag.guiaAgente.includes('skills/reactivity-diagnostics/SKILL.md#mita_lectura_sin_rastreo'));
});

test('sinRastrear() evita suscripciones no deseadas y crearMemoAsincrono no entra en bucle tras LONG_HOLD', async () => {
  const disparador = crearEstadoLocal('A');
  const ignorado = crearEstadoLocal(1);
  let ejecucionesEfecto = 0;

  const detener = crearEfecto(() => {
    disparador.get();
    sinRastrear(() => ignorado.get());
    ejecucionesEfecto += 1;
  });

  ignorado.set(2);
  assert.equal(ejecucionesEfecto, 1); // No debe re-ejecutarse por `ignorado`
  disparador.set('B');
  assert.equal(ejecucionesEfecto, 2);
  detener();

  // Confirmar que tras superar umbralEsperaProlongadaMs la promesa termina limpia (0 bucles)
  let llamadasAsync = 0;
  const memoLento = crearMemoAsincrono(
    async () => {
      llamadasAsync += 1;
      await new Promise((r) => setTimeout(r, 40));
      return 'OK_SIN_BUCLE';
    },
    { umbralEsperaProlongadaMs: 10, nombre: 'test:antiBucle' }
  );

  await new Promise((r) => setTimeout(r, 90));
  assert.equal(llamadasAsync, 1);
  assert.equal(memoLento.valor(), 'OK_SIN_BUCLE');
  assert.equal(memoLento.estaPendiente(), false);
  assert.equal(memoLento.esperaProlongada(), false);
  memoLento.destruir();
});

test('Subpath Exports en package.json apuntan a módulos existentes y signals respeta modo silencioso en tests', () => {
  const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'));

  const subpaths = ['./signals', './async', './rust', './ssr', './props', './element', './ui', './devtools'];
  for (const sub of subpaths) {
    assert.ok(pkg.exports[sub], `Falta subpath export ${sub} en package.json`);
    const targetPath = path.join(rootDir, pkg.exports[sub]);
    assert.equal(fs.existsSync(targetPath), true, `No existe archivo destino para ${sub}: ${targetPath}`);
  }

  // En entorno de tests, crearEstadoLocal no debe inundar console.info salvo debug: true
  const infoOriginal = console.info;
  let llamadasInfo = 0;
  console.info = () => {
    llamadasInfo += 1;
  };
  try {
    const sigSilencioso = crearEstadoLocal(0);
    sigSilencioso.set(1);
    assert.equal(llamadasInfo, 0);

    const sigDebug = crearEstadoLocal(0, { debug: true });
    sigDebug.set(2);
    assert.equal(llamadasInfo, 1);
  } finally {
    console.info = infoOriginal;
  }
});
