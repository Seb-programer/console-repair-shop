// Pruebas de integración contra MySQL real (consolas_db con el seed cargado).
// Se saltan automáticamente si no hay conexión a la base de datos.
process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const app = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/db');

// PNG 1x1 válido.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const SUFIJO = `t${Date.now()}`;

let hayBD = false;
const tokens = {};
const creados = { usuarios: [], clientes: [], articulos: [], ventas: [], consolas: [] };

function prueba(nombre, fn) {
  it(nombre, async (t) => {
    if (!hayBD) return t.skip('MySQL no disponible');
    return fn(t);
  });
}

const auth = (rol) => ({ Authorization: `Bearer ${tokens[rol]}` });
const archivosEnUploads = () => fs.readdirSync(config.uploadsDir).filter((f) => f !== '.gitkeep').length;

async function login(usuario, password) {
  const r = await request(app).post('/api/auth/login').send({ usuario, password });
  return r;
}

before(async () => {
  try {
    await pool.query('SELECT 1 FROM usuarios LIMIT 1');
    hayBD = true;
  } catch (err) {
    // En CI (REQUIERE_BD=1) la base de datos es obligatoria: fallar en vez de saltar.
    if (process.env.REQUIERE_BD === '1') throw err;
    hayBD = false;
    return;
  }
  for (const [rol, usuario, password] of [
    ['administrador', 'admin', 'Admin123*'],
    ['tecnico', 'tecnico', 'Tecnico123*'],
    ['operario', 'operario', 'Operario123*'],
  ]) {
    const r = await login(usuario, password);
    assert.equal(r.status, 200, `login de ${usuario}: ${JSON.stringify(r.body)}`);
    tokens[rol] = r.body.token;
  }
});

after(async () => {
  if (hayBD) {
    // Limpieza de datos de prueba (orden respetando las FK).
    if (creados.ventas.length) await pool.query('DELETE FROM ventas WHERE id IN (?)', [creados.ventas]);
    if (creados.consolas.length) await pool.query('DELETE FROM consolas WHERE id IN (?)', [creados.consolas]);
    if (creados.articulos.length) await pool.query('DELETE FROM articulos WHERE id IN (?)', [creados.articulos]);
    if (creados.clientes.length) await pool.query('DELETE FROM clientes WHERE id IN (?)', [creados.clientes]);
    if (creados.usuarios.length) await pool.query('DELETE FROM usuarios WHERE id IN (?)', [creados.usuarios]);
  }
  await pool.end();
});

describe('integración: autenticación y usuarios', () => {
  prueba('login correcto devuelve token y usuario sin hash', async () => {
    const r = await login('admin', 'Admin123*');
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body.usuario).sort(), ['id', 'nombre', 'rol', 'usuario']);
    const me = await request(app).get('/api/auth/me').set(auth('administrador'));
    assert.equal(me.body.usuario, 'admin');
  });

  prueba('login con contraseña incorrecta → 401', async () => {
    assert.equal((await login('admin', 'mala')).status, 401);
  });

  prueba('admin crea usuario; duplicado → 409; inactivo no puede iniciar sesión', async () => {
    const datos = { nombre: 'Prueba', usuario: `u_${SUFIJO}`, password: 'Secreta1', rol: 'operario' };
    const r = await request(app).post('/api/usuarios').set(auth('administrador')).send(datos);
    assert.equal(r.status, 201);
    assert.equal(r.body.password_hash, undefined);
    creados.usuarios.push(r.body.id);

    assert.equal((await request(app).post('/api/usuarios').set(auth('administrador')).send(datos)).status, 409);
    assert.equal((await request(app).post('/api/usuarios').set(auth('administrador')).send({ ...datos, usuario: 'otro', rol: 'jefe' })).status, 400);

    assert.equal((await login(datos.usuario, 'Secreta1')).status, 200);
    const del = await request(app).delete(`/api/usuarios/${r.body.id}`).set(auth('administrador'));
    assert.equal(del.status, 200);
    assert.equal((await login(datos.usuario, 'Secreta1')).status, 401);
  });

  prueba('el admin no puede desactivarse a sí mismo', async () => {
    const me = await request(app).get('/api/auth/me').set(auth('administrador'));
    const r = await request(app).delete(`/api/usuarios/${me.body.id}`).set(auth('administrador'));
    assert.equal(r.status, 400);
    const r2 = await request(app).put(`/api/usuarios/${me.body.id}`).set(auth('administrador')).send({ activo: false });
    assert.equal(r2.status, 400);
  });

  prueba('técnico y operario no gestionan usuarios (403)', async () => {
    assert.equal((await request(app).get('/api/usuarios').set(auth('tecnico'))).status, 403);
    assert.equal((await request(app).get('/api/usuarios').set(auth('operario'))).status, 403);
  });
});

describe('integración: clientes, consolas y procedimientos', () => {
  let clienteId;
  let consolaId;

  prueba('operario crea cliente (documento vacío → null); técnico no puede (403)', async () => {
    const r = await request(app).post('/api/clientes').set(auth('operario'))
      .send({ nombre: `Cliente ${SUFIJO}`, documento: '', telefono: '3001234567' });
    assert.equal(r.status, 201);
    assert.equal(r.body.documento, null);
    clienteId = r.body.id;
    creados.clientes.push(clienteId);

    assert.equal((await request(app).post('/api/clientes').set(auth('tecnico')).send({ nombre: 'X' })).status, 403);
    const busca = await request(app).get('/api/clientes').query({ q: SUFIJO }).set(auth('tecnico'));
    assert.equal(busca.status, 200);
    assert.equal(busca.body.length, 1);
  });

  prueba('operario recibe consola con fotos (multipart)', async () => {
    const r = await request(app).post('/api/consolas').set(auth('operario'))
      .field('cliente_id', String(clienteId))
      .field('marca', 'Sony')
      .field('modelo', 'PS5')
      .field('falla_reportada', 'No da imagen')
      .attach('fotos', PNG, 'frente.png')
      .attach('fotos', PNG, 'atras.png');
    assert.equal(r.status, 201, JSON.stringify(r.body));
    consolaId = r.body.id;
    creados.consolas.push(consolaId);
    assert.equal(r.body.estado, 'en_espera');
    assert.equal(r.body.fotos.length, 2);
    assert.match(r.body.fotos[0].ruta, /^\/uploads\/.+\.png$/);

    const img = await request(app).get(r.body.fotos[0].ruta);
    assert.equal(img.status, 200);
  });

  prueba('si la petición falla después de subir, los archivos se borran', async () => {
    const antes = archivosEnUploads();
    const r = await request(app).post('/api/consolas').set(auth('operario'))
      .field('cliente_id', '999999999')
      .field('marca', 'Sony').field('modelo', 'PS4').field('falla_reportada', 'x')
      .attach('fotos', PNG, 'a.png');
    assert.equal(r.status, 404);
    assert.equal(archivosEnUploads(), antes);
  });

  prueba('rechaza archivos que no son imagen (400)', async () => {
    const r = await request(app).post(`/api/consolas/${consolaId}/fotos`).set(auth('operario'))
      .attach('fotos', Buffer.from('hola'), { filename: 'virus.txt', contentType: 'text/plain' });
    assert.equal(r.status, 400);
  });

  prueba('rechaza un texto renombrado a .png aunque declare image/png (400) y no deja el archivo', async () => {
    const antes = archivosEnUploads();
    const r = await request(app).post(`/api/consolas/${consolaId}/fotos`).set(auth('operario'))
      .attach('fotos', PNG, 'buena.png')
      .attach('fotos', Buffer.from('no soy una imagen'), { filename: 'falsa.png', contentType: 'image/png' });
    assert.equal(r.status, 400);
    assert.equal(archivosEnUploads(), antes);
  });

  prueba('operario no puede cambiar estado (403); técnico sí y queda asignado', async () => {
    assert.equal((await request(app).patch(`/api/consolas/${consolaId}/estado`).set(auth('operario')).send({ estado: 'en_proceso' })).status, 403);
    assert.equal((await request(app).patch(`/api/consolas/${consolaId}/estado`).set(auth('tecnico')).send({ estado: 'arreglada' })).status, 400);
    const r = await request(app).patch(`/api/consolas/${consolaId}/estado`).set(auth('tecnico')).send({ estado: 'en_proceso' });
    assert.equal(r.status, 200);
    assert.equal(r.body.estado, 'en_proceso');
    assert.equal(r.body.tecnico_nombre !== null, true);
  });

  prueba('procedimiento con foto finaliza la consola y fija fecha; volver a en_proceso la limpia', async () => {
    const r = await request(app).post(`/api/consolas/${consolaId}/procedimientos`).set(auth('tecnico'))
      .field('descripcion', 'Cambio de pasta térmica')
      .field('estado_resultante', 'finalizado')
      .attach('fotos', PNG, 'proc.png');
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.consola.estado, 'finalizado');
    assert.notEqual(r.body.consola.fecha_finalizacion, null);
    assert.equal(r.body.consola.procedimientos.length, 1);
    assert.equal(r.body.consola.procedimientos[0].fotos.length, 1);

    const r2 = await request(app).patch(`/api/consolas/${consolaId}/estado`).set(auth('administrador')).send({ estado: 'en_proceso' });
    assert.equal(r2.body.fecha_finalizacion, null);
  });

  prueba('listado filtra por estado e incluye nombre de cliente', async () => {
    const r = await request(app).get('/api/consolas').query({ estado: 'en_proceso', q: SUFIJO }).set(auth('tecnico'));
    assert.equal(r.status, 200);
    assert.equal(r.body.length, 1);
    assert.equal(r.body[0].cliente_nombre, `Cliente ${SUFIJO}`);
  });

  prueba('dashboard responde con conteos por estado y ventas del día', async () => {
    const r = await request(app).get('/api/dashboard').set(auth('tecnico'));
    assert.equal(r.status, 200);
    assert.deepEqual(Object.keys(r.body.consolas_por_estado).sort(), ['en_espera', 'en_proceso', 'finalizado']);
    assert.ok(r.body.ultimas_consolas.length <= 5);
    assert.equal(typeof r.body.ventas_hoy.total, 'number');
  });

  prueba('solo admin elimina consolas y se borran sus archivos', async () => {
    const det = await request(app).get(`/api/consolas/${consolaId}`).set(auth('operario'));
    const rutas = [...det.body.fotos, ...det.body.procedimientos.flatMap((p) => p.fotos)].map((f) => f.ruta);
    assert.equal(rutas.length, 3);

    assert.equal((await request(app).delete(`/api/consolas/${consolaId}`).set(auth('operario'))).status, 403);
    assert.equal((await request(app).delete(`/api/consolas/${consolaId}`).set(auth('administrador'))).status, 200);
    rutas.forEach((ruta) => assert.equal(fs.existsSync(path.join(config.uploadsDir, path.basename(ruta))), false));
    assert.equal((await request(app).get(`/api/consolas/${consolaId}`).set(auth('operario'))).status, 404);
  });
});

describe('integración: artículos y ventas', () => {
  let articuloId;

  prueba('solo admin crea artículos', async () => {
    assert.equal((await request(app).post('/api/articulos').set(auth('operario')).send({ nombre: 'X', precio: 1, stock: 1 })).status, 403);
    const r = await request(app).post('/api/articulos').set(auth('administrador'))
      .field('nombre', `Mando ${SUFIJO}`).field('precio', '19.99').field('stock', '5')
      .attach('foto', PNG, 'mando.png');
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.precio, 19.99);
    assert.match(r.body.foto, /^\/uploads\//);
    articuloId = r.body.id;
    creados.articulos.push(articuloId);
  });

  prueba('venta usa el precio del servidor, calcula total y descuenta stock', async () => {
    const r = await request(app).post('/api/ventas').set(auth('operario'))
      .send({ items: [{ articulo_id: articuloId, cantidad: 2, precio_unitario: 0.01 }, { articulo_id: articuloId, cantidad: 1 }] });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    creados.ventas.push(r.body.id);
    assert.equal(r.body.total, 59.97);
    assert.equal(r.body.items[0].cantidad, 3);

    const [[art]] = await pool.query('SELECT stock FROM articulos WHERE id = ?', [articuloId]);
    assert.equal(art.stock, 2);
  });

  prueba('stock insuficiente → 409 y no modifica nada', async () => {
    const r = await request(app).post('/api/ventas').set(auth('administrador'))
      .send({ items: [{ articulo_id: articuloId, cantidad: 3 }] });
    assert.equal(r.status, 409);
    const [[art]] = await pool.query('SELECT stock FROM articulos WHERE id = ?', [articuloId]);
    assert.equal(art.stock, 2);
  });

  prueba('cantidades inválidas → 400; técnico no vende (403)', async () => {
    assert.equal((await request(app).post('/api/ventas').set(auth('operario')).send({ items: [{ articulo_id: articuloId, cantidad: -1 }] })).status, 400);
    assert.equal((await request(app).post('/api/ventas').set(auth('operario')).send({ items: [] })).status, 400);
    assert.equal((await request(app).post('/api/ventas').set(auth('tecnico')).send({ items: [{ articulo_id: articuloId, cantidad: 1 }] })).status, 403);
    assert.equal((await request(app).get('/api/ventas').set(auth('tecnico'))).status, 403);
  });

  prueba('artículo desactivado no aparece en el catálogo salvo todos=1 para admin', async () => {
    assert.equal((await request(app).delete(`/api/articulos/${articuloId}`).set(auth('administrador'))).status, 200);
    const op = await request(app).get('/api/articulos').query({ q: SUFIJO, todos: 1 }).set(auth('operario'));
    assert.equal(op.body.length, 0);
    const ad = await request(app).get('/api/articulos').query({ q: SUFIJO, todos: 1 }).set(auth('administrador'));
    assert.equal(ad.body.length, 1);
    const venta = await request(app).post('/api/ventas').set(auth('operario')).send({ items: [{ articulo_id: articuloId, cantidad: 1 }] });
    assert.equal(venta.status, 400);
  });

  prueba('detalle y listado de ventas', async () => {
    const r = await request(app).get(`/api/ventas/${creados.ventas[0]}`).set(auth('operario'));
    assert.equal(r.status, 200);
    assert.equal(r.body.items[0].subtotal, 59.97);
    const l = await request(app).get('/api/ventas').set(auth('administrador'));
    assert.ok(l.body.some((v) => v.id === creados.ventas[0]));
  });

  after(async () => {
    if (!hayBD || !articuloId) return;
    const [[art]] = await pool.query('SELECT foto FROM articulos WHERE id = ?', [articuloId]);
    if (art?.foto) fs.rmSync(path.join(config.uploadsDir, path.basename(art.foto)), { force: true });
  });
});
