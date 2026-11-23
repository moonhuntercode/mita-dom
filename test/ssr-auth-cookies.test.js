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
  MitaElement,
  MitaMeta,
  renderizarVistaUniversal,
  crearFormularioReusable,
  crearControladorAuth,
  crearGestorConsentimiento,
  eliminarEstadoCompartido
} = await import('../src/index.js');

test('renderizarVistaUniversal + MitaMeta: soporta SSR, SSG, Hybrid (Islands stripping) y CSR/SPA', async () => {
  class VistaHibrida {
    static meta_title = 'Título SSR MitaDOM';
    static meta_description = 'Descripción SEO isomórfica';

    async onInit() {
      this.inicializado = true;
    }

    render() {
      return `
        <section>
          <header mita-server="only">Solo Servidor</header>
          <mi-isla mita-client="only"><span>Contenido eliminado en SSR</span></mi-isla>
        </section>
      `;
    }
  }

  // 1. Modo Hybrid / SSR
  const resHybrid = await renderizarVistaUniversal(VistaHibrida, { url: '/inicio', modo: 'hybrid' });
  assert.strictEqual(resHybrid.modoAplicado, 'hybrid');
  assert.ok(resHybrid.head.includes('<title>Título SSR MitaDOM</title>'));
  assert.ok(resHybrid.head.includes('Descripción SEO isomórfica'));
  // Verifica que mita-client="only" fue vaciado por el servidor
  assert.ok(resHybrid.body.includes('<mi-isla mita-client="only"></mi-isla>'));

  // 2. Modo SSG
  const resSSG = await renderizarVistaUniversal(VistaHibrida, { url: '/inicio', modo: 'ssg' });
  assert.strictEqual(resSSG.modoAplicado, 'ssg');
  assert.ok(resSSG.head.includes('window.__MITA_SSG__ = true'));

  // 3. Modo CSR / SPA (por opción o query param ?mita_mode=csr)
  const resCSR = await renderizarVistaUniversal(VistaHibrida, { url: '/inicio?mita_mode=csr', modo: 'hybrid' });
  assert.strictEqual(resCSR.modoAplicado, 'csr');
  assert.ok(resCSR.body.includes('data-mita-mode="csr"'));

  // 4. Uso directo de MitaMeta.useHead
  MitaMeta.useHead({ title: 'SEO Directo', meta: [{ name: 'author', content: 'Victor Code' }] });
  assert.strictEqual(MitaMeta.obtenerEstado().title, 'SEO Directo');
});

test('Island Architecture: MitaElement con mita-server="only" no re-ejecuta render() en el cliente', () => {
  let rendersEjecutados = 0;
  class IslaServidor extends MitaElement {
    render() {
      rendersEjecutados++;
      this.innerHTML = '<p>Re-render cliente</p>';
    }
  }
  if (!customElements.get('isla-servidor-test')) {
    customElements.define('isla-servidor-test', IslaServidor);
  }

  const el = document.createElement('isla-servidor-test');
  el.setAttribute('mita-server', 'only');
  el.innerHTML = '<p>HTML intacto del servidor</p>';
  document.body.appendChild(el);

  assert.strictEqual(rendersEjecutados, 0);
  assert.strictEqual(el.innerHTML, '<p>HTML intacto del servidor</p>');
  el.remove();
});

test('crearFormularioReusable + crearControladorAuth: valida campos, exige Términos en registro y alterna Login/Registro/Logout con renderCondicional', () => {
  localStorage.clear();
  const contenedor = document.createElement('section');
  document.body.appendChild(contenedor);

  const auth = crearControladorAuth({ nombreEstado: 'test:auth_flow' });
  const detener = auth.montarFlujoCondicional(contenedor);

  // 1. Inicia en modo Login
  assert.ok(contenedor.querySelector('#mita-auth-login-form'));

  // 2. Cambiar a modo Registro
  contenedor.querySelector('button[data-auth-action="toggle-mode"]').click();
  assert.ok(contenedor.querySelector('#mita-auth-register-form'));

  // 3. Intentar registrar sin aceptar Términos lanza error
  assert.throws(
    () => auth.registrar({ fullname: 'Victor', email: 'v@mita.bo', password: '123456', aceptoTerminos: false }),
    /Términos y Condiciones/
  );

  // 4. Registrar aceptando Términos monta la vista de Sesión Activa
  auth.registrar({ fullname: 'Victor Code', email: 'victor@mita.bo', password: '123456', aceptoTerminos: true });
  assert.strictEqual(auth.estado.get().autenticado, true);
  assert.ok(contenedor.innerHTML.includes('Sesión Activa: Victor Code'));

  // 5. Cerrar sesión regresa al formulario de Login
  contenedor.querySelector('button[data-auth-action="logout"]').click();
  assert.strictEqual(auth.estado.get().autenticado, false);
  assert.ok(contenedor.querySelector('#mita-auth-login-form'));

  // 6. Uso directo de crearFormularioReusable
  const formCustom = crearFormularioReusable({
    id: 'custom-form-test',
    fields: [{ name: 'campo', label: 'Campo', required: true }]
  });
  assert.ok(formCustom.render().includes('custom-form-test'));

  detener();
  eliminarEstadoCompartido('test:auth_flow');
  contenedor.remove();
});

test('crearGestorConsentimiento: bloquea analíticas sin consentimiento y las registra tras aceptar Cookies y Términos', () => {
  localStorage.clear();
  const gestor = crearGestorConsentimiento({ nombreEstado: 'test:consentimiento' });

  // 1. Bloqueado por defecto
  const intento1 = gestor.registrarAnalitica('vista_pagina', { ruta: '/docs' });
  assert.strictEqual(intento1.enviado, false);
  assert.strictEqual(gestor.estado.get().eventosAnalitica.length, 0);

  // 2. Modo solo esenciales sigue bloqueando analíticas
  gestor.soloEsenciales();
  const intento2 = gestor.registrarAnalitica('vista_pagina', { ruta: '/docs' });
  assert.strictEqual(intento2.enviado, false);

  // 3. Aceptar todo habilita analíticas
  gestor.aceptarTodo();
  const intento3 = gestor.registrarAnalitica('compra_completada', { monto: 120 });
  assert.strictEqual(intento3.enviado, true);
  assert.strictEqual(gestor.estado.get().eventosAnalitica.length, 1);

  // 4. Revocar limpia eventos y bloquea de nuevo
  gestor.revocarConsentimiento();
  assert.strictEqual(gestor.estado.get().eventosAnalitica.length, 0);
  eliminarEstadoCompartido('test:consentimiento');
});
