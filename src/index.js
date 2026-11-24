// @ts-check
/**
 * mita-dom - Librería Principal
 */

// 1. Motor Lógico (Signals, Router, Resources, Components)
export { MitaElement } from './core/mitaElement.js';
export {
  Signal,
  SignalDerivado,
  crearEstadoGlobal,
  crearEstadoLocal,
  crearEfecto,
  sinRastrear,
  crearEstadoCompartido,
  obtenerEstadoCompartido,
  listarEstadosCompartidos,
  eliminarEstadoCompartido
} from './core/signals.js';
export { renderCondicional, vincularTexto } from './core/render.js';
export { rutaActual, navegarA } from './core/router.js';
export { crearRecurso } from './core/resource.js';
export { definirComponente } from './core/componentes.js';
export { MitaTween, Easings } from './core/mitaTween.js';
export { MitaAnim } from './core/mitaAnim.js';
export { MitaRouter } from './core/mitaRouter.js';
export { MitaMeta, renderizarVistaUniversal } from './core/ssr.js';
export {
  congelarProfundamenteInmutable,
  crearEstadoReactivoInmutable,
  leerEstadoInmutable,
  mutarEstadoConHistorial,
  obtenerHistorialDeMutaciones,
  renderizarSiSeCumpleCondicion,
  medirPresupuestoDeRenderizado,
  crearAmbitoConLimpiezaAutomatica,
  ejecutarSuiteVerificacionMita
} from './core/rustGuard.js';
export {
  obtenerUrlImagenCientifico,
  CIENTIFICOS_DEMO,
  pasarPropsAElemento,
  leerPropsDeElemento,
  renderizarVistaDiferida,
  crearFormularioReactivoConSignals
} from './core/propsYDefer.js';
export {
  CATALOGO_DIAGNOSTICOS_AGENTE,
  emitirDiagnosticoAgente,
  obtenerDiagnosticosAgente,
  limpiarDiagnosticosAgente,
  crearMemoAsincrono,
  crearEstadoVinculado,
  crearEstadoOptimistaConRollback,
  crearFuncionServidor,
  crearFuncionServidorEnVivo,
  ESTRATEGIAS_RENDER_MITA,
  definirEstrategiaRenderRuta,
  cambiarEstrategiaRender,
  obtenerMapaEstrategiasRender
} from './core/asyncGraph.js';

// Auto-definir componentes del framework
import { MitaRouter } from './core/mitaRouter.js';
if (typeof customElements !== 'undefined') {
  if (!customElements.get('mita-router')) {
    customElements.define('mita-router', MitaRouter);
  }
}

// 2. Utilidades de Seguridad, Moderación (Chat Anti-Spam), Filtración y Resiliencia
export { sanitizarTexto } from './seguridad.js';
export { mitaResult } from './utils/result.js';
export { crearControlSpam, filtrarColeccion } from './utils/chatGuard.js';
export { crearFormularioReusable, crearControladorAuth } from './utils/formBuilder.js';
export { crearGestorConsentimiento } from './utils/consentimiento.js';
export { simularComandoCliMita } from './utils/cliSimulator.js';
export {
  crearControladorCrudCategorias,
  crearControladorEstrategiaPorVista,
  crearGestorGamificacionLectura
} from './utils/crudCategorias.js';
export {
  obtenerHuellaDispositivoLocal,
  crearControladorPaginacion,
  crearFetcherConCacheYEstados,
  crearGestorPerfilesYDispositivo,
  crearControladorSalaChatYGrupos,
  crearSistemaModeracionAnuncios
} from './utils/uiModeracionYComunidad.js';
export {
  crearControladorFetchingPorModo,
  crearAccionServidorIsomorfica,
  ejecutarConsejeroMitaDoc,
  calcularRecomendacionSemVer,
  PALETAS_COLORES_MITA,
  crearGestorTemaYAnimacionNavegacion,
  crearGestorBitacoraPorHora
} from './utils/fullstackYDevtools.js';
import { telemetry, enableAIDevMode } from './core/telemetry.js';
export { telemetry, enableAIDevMode };

// 3. Plugins y DX
export { mitaHmrPlugin } from './plugins/vite.js';

// 4. Utilidades de DX y Telemetría
import { checkMitaDomVersion } from './core/versionCheck.js';
export { checkMitaDomVersion };

if (typeof window !== 'undefined') {
  // Configurar Mita Linter & Profiler global
  telemetry.init();
  
  // @ts-ignore
  window.mita = {
    profile: () => telemetry.profile(),
    diagnose: () => telemetry.profile(), // Alias por compatibilidad
    clear: () => telemetry.clear(),
    raw: () => telemetry.raw()
  };
  
  // Anuncio del profiler (silencioso en entornos de test/CI)
  const esEntornoTest =
    typeof process !== 'undefined' &&
    Boolean(process.env?.VITEST || process.env?.NODE_TEST_CONTEXT || process.env?.NODE_ENV === 'test');
  if (!esEntornoTest) {
    console.info('🤖 [Mita Profiler] Activo. Usa `mita.profile()` para diagnosticar latencias y cuellos de botella.');
  }

  // Retrasamos unos segundos para no afectar el LCP (Time to Interactive)
  setTimeout(() => checkMitaDomVersion(), 3000);
}
