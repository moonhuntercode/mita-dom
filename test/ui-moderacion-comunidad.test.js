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
  crearControladorPaginacion,
  crearFetcherConCacheYEstados,
  crearGestorPerfilesYDispositivo,
  crearControladorSalaChatYGrupos,
  crearSistemaModeracionAnuncios,
  eliminarEstadoCompartido
} = await import('../src/index.js');

test('UI Paginación y Data Fetching con Caché: pagina colecciones y ahorra peticiones repetidas', async () => {
  const pag = crearControladorPaginacion({ tamanoPaginaInicial: 2 });
  const items = ['A', 'B', 'C', 'D', 'E'];

  const p1 = pag.obtenerItemsDePagina(items);
  assert.deepStrictEqual(p1.itemsPagina, ['A', 'B']);
  assert.strictEqual(p1.totalPaginas, 3);

  pag.paginaSiguiente(items.length);
  const p2 = pag.obtenerItemsDePagina(items);
  assert.deepStrictEqual(p2.itemsPagina, ['C', 'D']);

  const fetcher = crearFetcherConCacheYEstados({ tiempoCacheMs: 30000 });
  let ejecucionesRed = 0;
  const loader = async () => {
    ejecucionesRed++;
    return { items: [1, 2, 3] };
  };

  const r1 = await fetcher.cargarRecurso('api:anuncios', loader);
  assert.strictEqual(r1.desdeCache, false);
  assert.strictEqual(ejecucionesRed, 1);

  const r2 = await fetcher.cargarRecurso('api:anuncios', loader);
  assert.strictEqual(r2.desdeCache, true);
  assert.strictEqual(ejecucionesRed, 1);
  assert.strictEqual(fetcher.estado.get().ahorroRequestsCount, 1);
});

test('Perfiles sin Cuenta, Huella de Dispositivo Local, Regla de 15 Días y Bloqueo de Dispositivo', () => {
  localStorage.clear();
  const perfiles = crearGestorPerfilesYDispositivo({ nombreEstado: 'test:perfiles_disp' });

  // 1. Por defecto no exige registrar cuenta y asigna badge "⚠️ No Verificado"
  assert.strictEqual(perfiles.estado.get().configAdmin.aceptarRegistrosDeCuenta, false);

  const t0 = 1700000000000;
  const p1 = perfiles.crearOActualizarPerfilSinCuenta({
    nombre: 'Carlos Bolivia',
    empresa: 'Transporte Sur',
    ahoraTs: t0
  });
  assert.strictEqual(p1.ok, true);
  assert.strictEqual(p1.perfil.badge, '⚠️ No Verificado');

  // 2. Intentar cambiar el nombre 2 días después falla por la regla de 15 días en el mismo dispositivo
  const dosDiasDespues = t0 + 2 * 24 * 60 * 60 * 1000;
  const p2 = perfiles.crearOActualizarPerfilSinCuenta({
    nombre: 'Otro Nombre',
    ahoraTs: dosDiasDespues
  });
  assert.strictEqual(p2.ok, false);
  assert.ok(p2.motivo.includes('15 días'));

  // 3. Si el Admin desactiva la restricción de 15 días, permite el cambio de inmediato
  perfiles.configurarReglasAdminPerfiles({ restringirCambioNombreQuinceDias: false });
  const p3 = perfiles.crearOActualizarPerfilSinCuenta({
    nombre: 'Carlos Renovado',
    ahoraTs: dosDiasDespues
  });
  assert.strictEqual(p3.ok, true);

  // 4. Exportar datos del usuario en JSON
  const exp = perfiles.exportarDatosUsuarioJson();
  assert.strictEqual(exp.perfilActivo.nombre, 'Carlos Renovado');

  eliminarEstadoCompartido('test:perfiles_disp');
});

test('Chat y Grupos: bloquea entrada hasta aceptar la ventana de reglas y aplica cooldown de 3 segundos', () => {
  localStorage.clear();
  const chat = crearControladorSalaChatYGrupos({
    nombreEstado: 'test:chat_gate',
    intervaloSegundosInicial: 3
  });

  // 1. Intentar entrar a 'grupo-empleos' sin haber aceptado abre la ventana y no deja entrar
  const intento = chat.intentarEntrarASalaOChat('grupo-empleos');
  assert.strictEqual(intento.accesoPermitido, false);
  assert.strictEqual(intento.requiereAceptarVentana, true);

  // 2. Intentar enviar mensaje sin aceptar ventana falla
  const msgFallido = chat.enviarMensajeConCooldown({
    salaId: 'grupo-empleos',
    autor: 'Pedro',
    texto: 'Hola grupo'
  });
  assert.strictEqual(msgFallido.ok, false);

  // 3. Aceptar ventana de reglas permite entrar y enviar el primer mensaje
  chat.aceptarReglasYEntrarASala('grupo-empleos');
  const t0 = 1700000000000;
  const msg1 = chat.enviarMensajeConCooldown({
    salaId: 'grupo-empleos',
    autor: 'Pedro',
    texto: 'Primer mensaje válido',
    ahoraTs: t0
  });
  assert.strictEqual(msg1.ok, true);

  // 4. Enviar otro mensaje 1 segundo después es bloqueado por el cooldown de 3 segundos
  const msg2 = chat.enviarMensajeConCooldown({
    salaId: 'grupo-empleos',
    autor: 'Pedro',
    texto: 'Mensaje muy rápido',
    ahoraTs: t0 + 1000
  });
  assert.strictEqual(msg2.ok, false);
  assert.ok(msg2.motivo.includes('3s'));

  // 5. Después de 3.1 segundos se envía normalmente
  const msg3 = chat.enviarMensajeConCooldown({
    salaId: 'grupo-empleos',
    autor: 'Pedro',
    texto: 'Segundo mensaje tras 3s',
    ahoraTs: t0 + 3100
  });
  assert.strictEqual(msg3.ok, true);

  eliminarEstadoCompartido('test:chat_gate');
});

test('Moderación de Anuncios: CRUD obligatorio de Categorías, bloqueo de "DC" (mayús/minús/ambos), reportes con pruebas y borrado por empresa/usuario', () => {
  localStorage.clear();
  const perfiles = crearGestorPerfilesYDispositivo({ nombreEstado: 'test:perfiles_mod' });
  const mod = crearSistemaModeracionAnuncios({
    nombreEstado: 'test:anuncios_mod',
    gestorPerfiles: perfiles
  });

  // 1. Rechaza categoría que no existe en el CRUD de Categorías
  const sinCat = mod.publicarAnuncio({
    titulo: 'Oferta Chofer',
    descripcion: 'Licencia categoría C',
    categoria: 'categoria_fantasma'
  });
  assert.strictEqual(sinCat.ok, false);

  // 2. Crear nueva categoría en el CRUD y verificar que bloquea la palabra prohibida "DC" / "dc" / "Dc"
  mod.crearCategoria({ id: 'transporte', nombre: '🚚 Transporte y Logística' });

  const conDC = mod.publicarAnuncio({
    titulo: 'Busco socio en dc urgente',
    descripcion: 'Contacto directo',
    categoria: 'transporte'
  });
  assert.strictEqual(conDC.ok, false);
  assert.ok(conDC.motivo.includes('DC'));

  // 3. Publicar anuncio limpio asigna badge "⚠️ No Verificado" por defecto
  const limpio = mod.publicarAnuncio({
    titulo: 'Chofer Repartidor La Paz',
    descripcion: 'Reparto de mercadería en camión',
    categoria: 'transporte',
    autorNombre: 'Juan Perez',
    empresa: 'Logística Andina'
  });
  assert.strictEqual(limpio.ok, true);
  assert.strictEqual(limpio.anuncio.badgeVerificacion, '⚠️ No Verificado');

  // 4. Reportar anuncio con justificación + pruebas notifica al Admin
  const rep = mod.reportarAnuncioConPruebas({
    idAnuncio: limpio.anuncio.id,
    reportadoPor: 'Usuaria María',
    justificacion: 'Piden depósito adelantado por WhatsApp',
    pruebasEvidencia: 'Captura #4412 adjunta del chat'
  });
  assert.strictEqual(rep.ok, true);
  assert.strictEqual(mod.estado.get().reportesYNotificacionesAdmin.length, 1);

  // 5. Borrar granularmente todas las publicaciones de la empresa "Logística Andina"
  const borrados = mod.borrarPublicacionesPorUsuarioOEmpresa('Logística Andina');
  assert.strictEqual(borrados, 1);

  eliminarEstadoCompartido('test:perfiles_mod');
  eliminarEstadoCompartido('test:anuncios_mod');
});
