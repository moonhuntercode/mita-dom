import test from 'node:test';
import assert from 'node:assert';
import { crearControlSpam, filtrarColeccion } from '../src/utils/chatGuard.js';

test('crearControlSpam: permite mensajes válidos y bloquea vacíos, duplicados, palabras prohibidas, links y cooldown', () => {
  const guard = crearControlSpam({
    cooldownMs: 500,
    maxLongitud: 50,
    palabrasProhibidas: ['estafa', 'casino'],
    bloquearLinks: true,
    bloquearDuplicados: true
  });

  // 1. Vacío
  assert.strictEqual(guard.evaluarMensaje('   ', 'user1').permitido, false);

  // 2. Primer mensaje válido
  const ok1 = guard.evaluarMensaje('Hola equipo MitaDOM', 'user1');
  assert.strictEqual(ok1.permitido, true);
  assert.strictEqual(ok1.textoLimpio, 'Hola equipo MitaDOM');

  // 3. Cooldown inmediato para el mismo usuario
  const cooldown = guard.evaluarMensaje('Segundo mensaje muy rápido', 'user1');
  assert.strictEqual(cooldown.permitido, false);
  assert.ok(cooldown.motivo.includes('espera'));

  // 4. Otro usuario no sufre el cooldown de user1, pero si manda link o palabra prohibida se bloquea
  const conLink = guard.evaluarMensaje('Visita https://sitio.com', 'user2');
  assert.strictEqual(conLink.permitido, false);
  assert.ok(conLink.motivo.includes('enlaces'));

  const conSpam = guard.evaluarMensaje('Gana en este casino ahora', 'user2');
  assert.strictEqual(conSpam.permitido, false);
  assert.ok(conSpam.motivo.includes('casino'));

  // 5. Reiniciar historial y verificar bloqueo de duplicado consecutivo
  const guardSinCooldown = crearControlSpam({ cooldownMs: 0, bloquearDuplicados: true });
  assert.strictEqual(guardSinCooldown.evaluarMensaje('Mismo texto', 'user3').permitido, true);
  const dup = guardSinCooldown.evaluarMensaje('mismo texto', 'user3');
  assert.strictEqual(dup.permitido, false);
  assert.ok(dup.motivo.includes('duplicado'));
});

test('filtrarColeccion: filtra inmutablemente por búsqueda de texto y categoría', () => {
  const datos = [
    { id: 1, titulo: 'Signals en Profundidad', categoria: 'aprende', autor: 'Victor' },
    { id: 2, titulo: 'Control Anti-Spam en Chats', categoria: 'referencia', autor: 'Victor' },
    { id: 3, titulo: 'Changelog v2.7.0', categoria: 'changelogs', autor: 'Admin' }
  ];

  // Todos
  assert.strictEqual(filtrarColeccion(datos, { busqueda: '', categoria: 'todos' }).length, 3);

  // Por categoría
  const soloRef = filtrarColeccion(datos, { categoria: 'referencia' });
  assert.strictEqual(soloRef.length, 1);
  assert.strictEqual(soloRef[0].id, 2);

  // Por texto + categoría
  const buscaSignal = filtrarColeccion(datos, {
    busqueda: 'signals',
    categoria: 'aprende',
    camposTexto: ['titulo', 'autor']
  });
  assert.strictEqual(buscaSignal.length, 1);
  assert.strictEqual(buscaSignal[0].id, 1);
});
