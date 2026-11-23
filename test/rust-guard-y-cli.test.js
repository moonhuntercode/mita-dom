import test from 'node:test';
import assert from 'node:assert';
import { JSDOM } from 'jsdom';

const dom = new JSDOM(`<!DOCTYPE html><html><head></head><body></body></html>`, { url: 'http://localhost' });
global.window = dom.window;
global.document = dom.window.document;
global.HTMLElement = dom.window.HTMLElement;
global.customElements = dom.window.customElements;
global.localStorage = dom.window.localStorage;
global.performance = { now: () => Date.now() };

const {
  crearEstadoReactivoInmutable,
  leerEstadoInmutable,
  mutarEstadoConHistorial,
  obtenerHistorialDeMutaciones,
  renderizarSiSeCumpleCondicion,
  medirPresupuestoDeRenderizado,
  crearAmbitoConLimpiezaAutomatica,
  ejecutarSuiteVerificacionMita,
  simularComandoCliMita,
  crearGestorConsentimiento,
  crearControladorCrudCategorias,
  crearControladorEstrategiaPorVista,
  crearGestorGamificacionLectura,
  eliminarEstadoCompartido
} = await import('../src/index.js');

test('Rust Borrow Checker (&T y &mut T): congela lecturas y registra historial de motivos en mutaciones', () => {
  const estado = crearEstadoReactivoInmutable('test:cuenta_rust', {
    usuario: 'Victor Code',
    permisos: { admin: true }
  });

  const lectura = leerEstadoInmutable(estado);
  assert.throws(() => {
    lectura.usuario = 'Hacker';
  }, TypeError);
  assert.throws(() => {
    lectura.permisos.admin = false;
  }, TypeError);

  mutarEstadoConHistorial(estado, { usuario: 'Victor Code BO' }, 'Actualización oficial de perfil');
  assert.strictEqual(leerEstadoInmutable(estado).usuario, 'Victor Code BO');

  const historial = obtenerHistorialDeMutaciones(estado);
  assert.strictEqual(historial.length, 1);
  assert.strictEqual(historial[0].motivo, 'Actualización oficial de perfil');
});

test('RAII Ownership Scope: libera Signals, Efectos, Eventos DOM y Timers al hacer drop y bloquea Use-After-Free', () => {
  const signal = crearEstadoReactivoInmutable('test:raii_scope', { clicks: 0 });
  const ambito = crearAmbitoConLimpiezaAutomatica('<mi-componente-seguro>');
  const boton = document.createElement('button');

  let clicksDom = 0;
  ambito.vincularSignalConLimpieza(signal, () => {});
  ambito.ejecutarEfectoConLimpieza(() => {
    signal.get();
  });
  ambito.escucharEventoDomConLimpieza(boton, 'click', () => {
    clicksDom++;
  });
  ambito.programarIntervaloConLimpieza(() => {}, 5000);

  boton.click();
  assert.strictEqual(clicksDom, 1);
  assert.strictEqual(ambito.auditarSaludDeMemoria().recursosActivosCount, 4);

  // Ejecutar drop (liberarMemoriaCompleta)
  const liberados = ambito.liberarMemoriaCompleta();
  assert.strictEqual(liberados, 4);
  assert.strictEqual(signal.suscriptores.size, 0);

  // El listener del botón ya fue removido
  boton.click();
  assert.strictEqual(clicksDom, 1);

  // Intentar registrar otro recurso tras drop lanza error Use-After-Free
  assert.throws(() => {
    ambito.vincularSignalConLimpieza(signal, () => {});
  }, /Use-After-Free/);
});

test('renderizarSiSeCumpleCondicion, medirPresupuestoDeRenderizado y ejecutarSuiteVerificacionMita', () => {
  const estado = crearEstadoReactivoInmutable('test:cond_verbose', { visible: true });
  const caja = document.createElement('section');

  const detener = renderizarSiSeCumpleCondicion({
    estadoReactivo: estado,
    contenedorDom: caja,
    condicionParaMostrar: (s) => s.visible,
    plantillaHtmlSiSeCumple: () => '<p>Visible</p>',
    plantillaHtmlSiNoSeCumple: () => '<p>Oculto</p>'
  });

  assert.ok(caja.innerHTML.includes('Visible'));
  mutarEstadoConHistorial(estado, { visible: false }, 'Ocultar vista');
  assert.ok(caja.innerHTML.includes('Oculto'));
  detener();

  const perf = medirPresupuestoDeRenderizado('calculo-rapido', () => 10 * 10, 16);
  assert.strictEqual(perf.resultado, 100);
  assert.strictEqual(perf.dentroDePresupuesto, true);

  const suite = ejecutarSuiteVerificacionMita();
  assert.strictEqual(suite.todoVerde, true);
  assert.strictEqual(suite.totalAprobados, suite.totalTests);
});

test('Mita CLI Simulator y Gestor de Consentimiento Auto-Administrable (Términos + Guía en la Nube)', () => {
  const genComp = simularComandoCliMita('mita g component TarjetaOferta');
  assert.strictEqual(genComp.tipo, 'component');
  assert.strictEqual(genComp.archivos.length, 3);
  assert.ok(genComp.archivos[0].contenido.includes('crearAmbitoConLimpiezaAutomatica'));

  const genStore = simularComandoCliMita('mita g store empleos');
  assert.strictEqual(genStore.tipo, 'store');

  const doctor = simularComandoCliMita('mita doctor');
  assert.strictEqual(doctor.tipo, 'doctor');

  // Auto-administración de Términos, Cookies y Guía en la Nube
  const consent = crearGestorConsentimiento({ nombreEstado: 'test:consent_autoadmin' });
  consent.actualizarTerminosYPoliticas({
    textoTerminos: 'Nuevos términos editados por Admin v2.8',
    versionTerminos: '2026-11-22-v2',
    urlGuiaNube: 'https://mitadom.bo/docs/privacidad'
  });

  const snap = consent.exportarSnapshotNube();
  assert.strictEqual(snap.textoTerminos, 'Nuevos términos editados por Admin v2.8');
  assert.strictEqual(snap.urlGuiaNube, 'https://mitadom.bo/docs/privacidad');

  consent.revocarConsentimiento();
  consent.importarSnapshotNube({
    versionTerminos: '2026-11-22-cloud',
    preferenciasUsuario: { decidido: true, terminosAceptados: true, cookiesAnaliticas: true }
  });
  assert.strictEqual(consent.estado.get().versionTerminos, '2026-11-22-cloud');
  assert.strictEqual(consent.estado.get().cookiesAnaliticas, true);

  eliminarEstadoCompartido('test:consent_autoadmin');
});

test('CRUD Multi-Categoría, Control Granular de Estrategia por Vista y Gamificación/Resaltado de Lectura', async () => {
  // 1. CRUD Multi-Categoría
  const crud = crearControladorCrudCategorias({ nombreEstado: 'test:crud_cat' });
  const creado = crud.crearNuevoRegistro({
    titulo: 'Curso Avanzado MitaDOM SSR',
    categoria: 'cursos',
    descripcion: 'Islas y Signals',
    valorNumerico: 250,
    destacado: true
  });
  assert.strictEqual(creado.categoria, 'cursos');

  crud.aplicarFiltrosDeBusqueda({ textoBusqueda: 'Avanzado', categoriaActiva: 'cursos' });
  assert.strictEqual(crud.listarRegistrosFiltrados().length, 1);

  crud.actualizarRegistroExistente(creado.id, { valorNumerico: 300 }, 'Subida de precio');
  assert.strictEqual(crud.listarRegistrosFiltrados()[0].valorNumerico, 300);

  crud.eliminarRegistroPorId(creado.id, 'Curso archivado');
  assert.strictEqual(crud.listarRegistrosFiltrados().length, 0);

  // 2. Control Granular de Estrategia por Vista
  const vistas = crearControladorEstrategiaPorVista({ nombreEstado: 'test:vistas_modo' });
  vistas.cambiarModoDeVistaEnCaliente('/empleos', 'hybrid');
  assert.strictEqual(vistas.obtenerConfiguracionDeVista('/empleos').modo, 'hybrid');

  vistas.activarODesactivarVista('/empleos', false);
  const resDesactivada = await vistas.renderizarVistaConConfiguracion('/empleos', class {});
  assert.strictEqual(resDesactivada.modoAplicado, 'disabled');

  // 3. Gamificación y Resaltado de Lectura
  const gamif = crearGestorGamificacionLectura({ nombreEstado: 'test:gamif_docs' });
  gamif.marcarDocumentoComoLeido('signals_profundo', 45);
  gamif.agregarResaltadoDeTexto('signals_profundo', 'Signals', 'amarillo');

  const htmlConMark = gamif.aplicarResaltadosEnHtml('signals_profundo', '<p>Los Signals son rápidos</p>');
  assert.ok(htmlConMark.includes('<mark class="docs-user-highlight highlight-amarillo"'));

  const resumen = gamif.obtenerResumenGamificacion(10);
  assert.strictEqual(resumen.leidosCount, 2);
  assert.strictEqual(resumen.puntosXP, 115);

  eliminarEstadoCompartido('test:crud_cat');
  eliminarEstadoCompartido('test:vistas_modo');
  eliminarEstadoCompartido('test:gamif_docs');
});
