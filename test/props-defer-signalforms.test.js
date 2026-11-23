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
  obtenerUrlImagenCientifico,
  CIENTIFICOS_DEMO,
  pasarPropsAElemento,
  leerPropsDeElemento,
  renderizarVistaDiferida,
  crearFormularioReactivoConSignals
} = await import('../src/index.js');

test('Pasar Props a un Componente (React.dev Avatar & Científicos adaptado a Mita-DOM Light DOM)', () => {
  assert.strictEqual(CIENTIFICOS_DEMO.length, 3);
  assert.strictEqual(
    obtenerUrlImagenCientifico({ name: 'Katsuko Saruhashi', imageId: 'YfeOqp2' }),
    'https://react.dev/images/docs/scientists/YfeOqp2s.jpg'
  );

  class MitaAvatarTest extends MitaElement {
    render() {
      const props = leerPropsDeElemento(this, {
        size: 80,
        person: { name: 'Científico', imageId: 'YfeOqp2' }
      });
      this.innerHTML = `<img class="avatar" src="${obtenerUrlImagenCientifico(props.person)}" alt="${props.person.name}" width="${props.size}" height="${props.size}" />`;
    }
  }
  if (!customElements.get('mita-avatar-test')) {
    customElements.define('mita-avatar-test', MitaAvatarTest);
  }

  const avatar = document.createElement('mita-avatar-test');
  document.body.appendChild(avatar);

  // Pasar props como objeto rico (igual que en React <Avatar size={100} person={{ name: 'Katsuko Saruhashi', imageId: 'YfeOqp2' }} />)
  pasarPropsAElemento(avatar, {
    size: 100,
    person: { name: 'Katsuko Saruhashi', imageId: 'YfeOqp2' }
  });

  const img = avatar.querySelector('img');
  assert.strictEqual(img.getAttribute('alt'), 'Katsuko Saruhashi');
  assert.strictEqual(img.getAttribute('width'), '100');
  assert.ok(img.getAttribute('src').includes('YfeOqp2s.jpg'));

  avatar.remove();
});

test('Vistas Diferidas (@defer de Angular.dev): muestra @placeholder, luego @loading y finalmente el contenido', async () => {
  const caja = document.createElement('section');
  document.body.appendChild(caja);

  const deferCtrl = renderizarVistaDiferida({
    contenedor: caja,
    disparador: 'interaccion',
    plantillaPlaceholder: () => '<button id="btn-defer">Cargar Comentarios (@placeholder)</button>',
    plantillaCargando: () => '<p>⏳ Cargando (@loading)...</p>',
    cargarContenidoDiferido: async () => '<article id="defer-done">✅ Comentarios Diferidos Listos</article>'
  });

  // 1. Inicia en fase @placeholder
  assert.strictEqual(deferCtrl.estado.get().fase, 'placeholder');
  assert.ok(caja.querySelector('#btn-defer'));

  // 2. Al interactuar (click), dispara la carga y monta el resultado
  await deferCtrl.dispararCargaAhora();
  assert.strictEqual(deferCtrl.estado.get().fase, 'completado');
  assert.ok(caja.querySelector('#defer-done'));

  // 3. Reiniciar a placeholder
  deferCtrl.reiniciarAPlaceholder();
  assert.strictEqual(deferCtrl.estado.get().fase, 'placeholder');

  deferCtrl.limpiar();
  caja.remove();
});

test('Signal Forms (Angular.dev Signal Forms): valida cada campo reactivamente en tiempo real', () => {
  const formSig = crearFormularioReactivoConSignals({
    nombre: { valorInicial: '', requerido: true, minLongitud: 3 },
    correo: { valorInicial: '', requerido: true, patronRegex: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' }
  });

  assert.strictEqual(formSig.estado.get().esFormularioValido, false);

  formSig.establecerValorCampo('nombre', 'Vi');
  assert.strictEqual(formSig.estado.get().campos.nombre.esValido, false);

  formSig.establecerValorCampo('nombre', 'Victor Code');
  formSig.establecerValorCampo('correo', 'victor@mitadom.bo');
  assert.strictEqual(formSig.estado.get().esFormularioValido, true);

  const envio = formSig.procesarEnvio();
  assert.strictEqual(envio.ok, true);
  assert.strictEqual(envio.valores.nombre, 'Victor Code');
});
