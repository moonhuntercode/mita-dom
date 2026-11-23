import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body><section><article>Semántico</article></section></body></html>`, {
  url: 'http://localhost'
});
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.localStorage = dom.window.localStorage;
global.performance = { now: () => Date.now() };

const {
  crearControladorFetchingPorModo,
  crearAccionServidorIsomorfica,
  ejecutarConsejeroMitaDoc,
  calcularRecomendacionSemVer,
  crearGestorTemaYAnimacionNavegacion,
  crearGestorBitacoraPorHora,
  eliminarEstadoCompartido
} = await import('../src/index.js');

test('Data Fetching por Modo: diferencia "al-hacer-click" (0 llamadas iniciales) de "automatico-al-entrar"', async () => {
  let llamadas = 0;
  const ctrlClick = crearControladorFetchingPorModo({
    nombreEstado: 'test:fetch_click',
    modoDisparo: 'al-hacer-click',
    cargadorAsyncFn: async () => {
      llamadas++;
      return { total: 42 };
    }
  });

  // 1. Al entrar a la vista en modo 'al-hacer-click', NO llama a la red
  const resEntrada = await ctrlClick.alEntrarALaVista();
  assert.strictEqual(resEntrada.omitidoPorModoClick, true);
  assert.strictEqual(llamadas, 0);

  // 2. Solo llama al hacer clic en el botón
  const resClick = await ctrlClick.alHacerClickEnBoton();
  assert.strictEqual(resClick.ok, true);
  assert.strictEqual(llamadas, 1);

  // 3. Cambiar a modo 'automatico-al-entrar' resuelve desde caché
  ctrlClick.cambiarModoDisparo('automatico-al-entrar');
  const resAuto = await ctrlClick.alEntrarALaVista();
  assert.strictEqual(resAuto.desdeCache, true);
});

test('Mita Server Actions (Express + ORM): valida payload y ejecuta controlador de servidor', async () => {
  const crearEmpleoAction = crearAccionServidorIsomorfica(
    'empleos/crearEnMySQL',
    async (payload) => ({ id: 777, ...payload, guardadoEnMySQL: true }),
    {
      validarPayload: (p) => (!p.titulo ? 'El título es obligatorio para el ORM' : null)
    }
  );

  const fallo = await crearEmpleoAction.ejecutar({ titulo: '' });
  assert.strictEqual(fallo.ok, false);

  const exito = await crearEmpleoAction.ejecutar({ titulo: 'Desarrollador Node + Express' });
  assert.strictEqual(exito.ok, true);
  assert.strictEqual(exito.datos.id, 777);
  assert.strictEqual(crearEmpleoAction.estado.get().ejecucionesExitosas, 1);
});

test('Mita Doc Advisor, SemVer Advisor, Paletas de Colores y Bitácora por Hora', () => {
  const consejo = ejecutarConsejeroMitaDoc({ latenciaUltimoRenderMs: 3.5 });
  assert.ok(consejo.puntajeSalud >= 85);
  assert.ok(consejo.aciertos.length >= 2);

  const semverMinor = calcularRecomendacionSemVer({
    versionActual: '2.7.0',
    hayCambiosEnCodigo: true,
    agregaNuevaFuncionalidadOExport: true
  });
  assert.strictEqual(semverMinor.versionRecomendada, '2.8.0');

  const semverMajor = calcularRecomendacionSemVer({
    versionActual: '2.7.0',
    hayCambiosEnCodigo: true,
    rompeCompatibilidadAnterior: true
  });
  assert.strictEqual(semverMajor.versionRecomendada, '3.0.0');

  const tema = crearGestorTemaYAnimacionNavegacion({ nombreEstado: 'test:tema_nav' });
  const paleta = tema.cambiarPaletaDeColores('esmeralda-bolivia');
  assert.strictEqual(paleta.id, 'esmeralda-bolivia');
  assert.strictEqual(document.documentElement.getAttribute('data-mita-palette'), 'esmeralda-bolivia');

  tema.cambiarAnimacionDeNavegacion('slide-lateral');
  assert.strictEqual(document.documentElement.getAttribute('data-mita-nav-anim'), 'slide-lateral');

  const bitacora = crearGestorBitacoraPorHora({ nombreEstado: 'test:bitacora_hora' });
  const antes = bitacora.listarCopiasPorHora().length;
  bitacora.registrarNuevaCopiaPorHora({
    version: 'v2.7.1-snap',
    tituloHito: 'Snapshot horario de prueba',
    mejoras: ['Verificación completa']
  });
  assert.strictEqual(bitacora.listarCopiasPorHora().length, antes + 1);

  eliminarEstadoCompartido('test:tema_nav');
  eliminarEstadoCompartido('test:bitacora_hora');
});
