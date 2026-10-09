// Pruebas de integración de la fase 2 (página pública, galería, negocio, reparación y repuestos).
// Requieren MySQL con consolas_db y la migración 002_fase2.sql; se saltan si no hay conexión.
// Dejan la BD y uploads/ como estaban.
process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const request = require('supertest');

const app = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/db');
const { limiteConsulta } = require('../src/middleware/limiteIntentos');

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
// Cabeceras mínimas válidas: MP4 ("ftyp" en bytes 4-7) y WEBM (EBML 1A45DFA3).
const MP4 = Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42'), Buffer.alloc(64)]);
const WEBM = Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3]), Buffer.alloc(64)]);
const SUFIJO = `f2${Date.now()}`;
// Documento único de prueba (solo dígitos) y su versión "con formato".
const DOC = String(Date.now()).slice(-10);
const DOC_FORMATEADO = `${DOC.slice(0, 1)}.${DOC.slice(1, 4)}.${DOC.slice(4, 7)}-${DOC.slice(7)}`;
const DOC_SIN_CONSOLAS = `9${DOC.slice(1)}`;
const DOC_LEGADO = `8${DOC.slice(1)}`; // guardado "a la antigua" con puntos, directo en BD
const NO_ENCONTRADO = { error: 'No encontramos consolas registradas con ese documento' };

let hayBD = false;
const tokens = {};
const creados = { clientes: [], consolas: [], galeria: [] };
let uploadsIniciales;
let negocioOriginal;
let logoOriginal; // { nombre, contenido } si el negocio ya tenía logo

const auth = (rol) => ({ Authorization: `Bearer ${tokens[rol]}` });
const listarUploads = () => fs.readdirSync(config.uploadsDir).filter((f) => f !== '.gitkeep').sort();
const existeArchivo = (ruta) => fs.existsSync(path.join(config.uploadsDir, path.basename(ruta)));
const consultar = (documento) => request(app).post('/api/publico/consulta').send({ documento });

function prueba(nombre, fn) {
  it(nombre, async (t) => {
    if (!hayBD) return t.skip('MySQL no disponible o sin la migración 002');
    return fn(t);
  });
}

before(async () => {
  try {
    await pool.query('SELECT 1 FROM galeria LIMIT 1');
    hayBD = true;
  } catch (err) {
    // En CI (REQUIERE_BD=1) la base de datos es obligatoria: fallar en vez de saltar.
    if (process.env.REQUIERE_BD === '1') throw err;
    return;
  }
  for (const [rol, usuario, password] of [
    ['administrador', 'admin', 'Admin123*'],
    ['tecnico', 'tecnico', 'Tecnico123*'],
    ['operario', 'operario', 'Operario123*'],
  ]) {
    const r = await request(app).post('/api/auth/login').send({ usuario, password });
    assert.equal(r.status, 200);
    tokens[rol] = r.body.token;
  }
  uploadsIniciales = listarUploads();
  [[negocioOriginal]] = await pool.query('SELECT * FROM negocio WHERE id = 1');
  if (negocioOriginal?.logo && existeArchivo(negocioOriginal.logo)) {
    const nombre = path.basename(negocioOriginal.logo);
    logoOriginal = { nombre, contenido: fs.readFileSync(path.join(config.uploadsDir, nombre)) };
  }
  limiteConsulta.reiniciar();
});

after(async () => {
  if (hayBD) {
    // Consolas por la API para que se borren también sus archivos.
    for (const id of creados.consolas) {
      await request(app).delete(`/api/consolas/${id}`).set(auth('administrador'));
    }
    for (const id of creados.galeria) {
      await request(app).delete(`/api/galeria/${id}`).set(auth('administrador'));
    }
    if (creados.clientes.length) await pool.query('DELETE FROM clientes WHERE id IN (?)', [creados.clientes]);

    // Restaura el negocio (fila y archivo de logo).
    const [[negocioActual]] = await pool.query('SELECT logo FROM negocio WHERE id = 1');
    if (negocioActual?.logo && negocioActual.logo !== negocioOriginal?.logo) {
      fs.rmSync(path.join(config.uploadsDir, path.basename(negocioActual.logo)), { force: true });
    }
    if (negocioOriginal) {
      const { id, actualizado_en: actualizado, ...campos } = negocioOriginal;
      const cols = Object.keys(campos);
      await pool.query(
        `UPDATE negocio SET ${cols.map((c) => `${c} = ?`).join(', ')}, actualizado_en = ? WHERE id = ?`,
        [...cols.map((c) => campos[c]), actualizado, id],
      );
    }
    if (logoOriginal) fs.writeFileSync(path.join(config.uploadsDir, logoOriginal.nombre), logoOriginal.contenido);

    assert.deepEqual(listarUploads(), uploadsIniciales, 'uploads/ debe quedar como estaba');
  }
  limiteConsulta.reiniciar();
  await pool.end();
});

describe('fase 2: reparación, repuestos y notas internas', () => {
  let clienteId;
  let consolaId;
  let repuestoId;

  prueba('preparación: cliente con documento con formato (se guarda normalizado) y consola', async () => {
    const c = await request(app).post('/api/clientes').set(auth('operario')).send({
      nombre: `Ana María Pérez ${SUFIJO}`, documento: DOC_FORMATEADO, telefono: '3015550101',
      email: `ana${SUFIJO}@correo.co`, direccion: `Calle Secreta ${SUFIJO}`,
    });
    assert.equal(c.status, 201, JSON.stringify(c.body));
    assert.equal(c.body.documento, DOC);
    clienteId = c.body.id;
    creados.clientes.push(clienteId);

    const r = await request(app).post('/api/consolas').set(auth('operario'))
      .field('cliente_id', String(clienteId)).field('marca', 'Sony').field('modelo', 'PS5')
      .field('numero_serie', `SN-${SUFIJO}-XYZ9`).field('falla_reportada', 'No da imagen')
      .field('observaciones_recepcion', `OBS-PRIVADA-${SUFIJO}`)
      .attach('fotos', PNG, 'recepcion.png');
    assert.equal(r.status, 201, JSON.stringify(r.body));
    consolaId = r.body.id;
    creados.consolas.push(consolaId);
    assert.equal(r.body.resultado_reparacion, 'pendiente');
    assert.equal(r.body.necesita_repuestos, 0);
    assert.deepEqual(r.body.repuestos, []);
  });

  prueba('procedimiento público y procedimiento interno (interno=1)', async () => {
    const pub = await request(app).post(`/api/consolas/${consolaId}/procedimientos`).set(auth('tecnico'))
      .field('descripcion', 'Limpieza general').field('estado_resultante', 'en_proceso')
      .attach('fotos', PNG, 'proc.png');
    assert.equal(pub.status, 201, JSON.stringify(pub.body));
    const int = await request(app).post(`/api/consolas/${consolaId}/procedimientos`).set(auth('tecnico'))
      .send({ descripcion: `NOTA-INTERNA-${SUFIJO}`, estado_resultante: 'en_proceso', interno: true });
    assert.equal(int.status, 201);
    const procs = int.body.consola.procedimientos;
    assert.deepEqual(procs.map((p) => p.interno), [0, 1]);
    assert.equal((await request(app).post(`/api/consolas/${consolaId}/procedimientos`).set(auth('tecnico'))
      .send({ descripcion: 'x', estado_resultante: 'en_proceso', interno: 'quizá' })).status, 400);
  });

  prueba('reparación: operario 403; ENUM inválido 400; técnico guarda el reporte', async () => {
    const ruta = `/api/consolas/${consolaId}/reparacion`;
    const datos = { resultado_reparacion: 'reparada', diagnostico_resultado: 'Se cambió el HDMI', necesita_repuestos: false };
    assert.equal((await request(app).put(ruta).set(auth('operario')).send(datos)).status, 403);
    assert.equal((await request(app).put(ruta).set(auth('tecnico')).send({ ...datos, resultado_reparacion: 'arreglada' })).status, 400);
    assert.equal((await request(app).put('/api/consolas/999999999/reparacion').set(auth('tecnico')).send(datos)).status, 404);
    const r = await request(app).put(ruta).set(auth('tecnico')).send(datos);
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.resultado_reparacion, 'reparada');
    assert.equal(r.body.diagnostico_resultado, 'Se cambió el HDMI');
    assert.equal(r.body.necesita_repuestos, 0);
  });

  prueba('si un técnico reporta una consola sin técnico, se le asigna', async () => {
    await pool.query('UPDATE consolas SET tecnico_id = NULL WHERE id = ?', [consolaId]);
    const me = await request(app).get('/api/auth/me').set(auth('tecnico'));
    const r = await request(app).put(`/api/consolas/${consolaId}/reparacion`).set(auth('tecnico'))
      .send({ resultado_reparacion: 'reparada', diagnostico_resultado: 'Se cambió el HDMI' });
    assert.equal(r.body.tecnico_id, me.body.id);
  });

  prueba('repuestos: operario solo ve; validaciones; crear pone necesita_repuestos = 1', async () => {
    const base = `/api/consolas/${consolaId}/repuestos`;
    const repuesto = { nombre: 'Puerto HDMI', cantidad: 1, costo_estimado: 35000, notas: `NOTA-REP-${SUFIJO}` };
    assert.equal((await request(app).post(base).set(auth('operario')).send(repuesto)).status, 403);
    for (const malo of [{ cantidad: 0 }, { cantidad: 1.5 }, { costo_estimado: -1 }, { estado: 'perdido' }, { nombre: '' }]) {
      const r = await request(app).post(base).set(auth('tecnico')).send({ ...repuesto, ...malo });
      assert.equal(r.status, 400, JSON.stringify(malo));
    }
    assert.equal((await request(app).post('/api/consolas/999999999/repuestos').set(auth('tecnico')).send(repuesto)).status, 404);

    const r = await request(app).post(base).set(auth('tecnico')).send(repuesto);
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.estado, 'pendiente');
    assert.equal(r.body.costo_estimado, 35000);
    repuestoId = r.body.id;

    const lista = await request(app).get(base).set(auth('operario'));
    assert.equal(lista.status, 200);
    assert.equal(lista.body.length, 1);
    const det = await request(app).get(`/api/consolas/${consolaId}`).set(auth('operario'));
    assert.equal(det.body.necesita_repuestos, 1);
    assert.equal(det.body.repuestos[0].nombre, 'Puerto HDMI');
  });

  prueba('repuestos: editar (técnico), operario 403, ENUM inválido 400, de otra consola 404', async () => {
    const ruta = `/api/consolas/${consolaId}/repuestos/${repuestoId}`;
    assert.equal((await request(app).put(ruta).set(auth('operario')).send({ estado: 'pedido' })).status, 403);
    assert.equal((await request(app).put(ruta).set(auth('tecnico')).send({ estado: 'perdido' })).status, 400);
    assert.equal((await request(app).put(`/api/consolas/999999999/repuestos/${repuestoId}`).set(auth('tecnico')).send({ estado: 'pedido' })).status, 404);
    const r = await request(app).put(ruta).set(auth('tecnico')).send({ estado: 'pedido', cantidad: '2' });
    assert.equal(r.status, 200);
    assert.equal(r.body.estado, 'pedido');
    assert.equal(r.body.cantidad, 2);
    assert.equal(r.body.nombre, 'Puerto HDMI');
  });

  prueba('GET /consolas incluye resultado_reparacion y necesita_repuestos', async () => {
    const r = await request(app).get('/api/consolas').query({ q: SUFIJO }).set(auth('operario'));
    assert.equal(r.body.length, 1);
    assert.equal(r.body[0].resultado_reparacion, 'reparada');
    assert.equal(r.body[0].necesita_repuestos, 1);
  });

  describe('consulta pública', () => {
    prueba('devuelve solo datos permitidos: sin contacto, documento, serie completa, observaciones, usuarios ni notas internas', async () => {
      limiteConsulta.reiniciar();
      const r = await consultar(DOC_FORMATEADO);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.deepEqual(Object.keys(r.body).sort(), ['cliente', 'consolas']);
      assert.deepEqual(r.body.cliente, { nombre_corto: 'Ana' });
      assert.equal(r.body.consolas.length, 1);
      const c = r.body.consolas[0];
      assert.deepEqual(Object.keys(c).sort(), [
        'color', 'diagnostico_resultado', 'estado', 'falla_reportada', 'fecha_finalizacion', 'fecha_ingreso', 'fotos',
        'id', 'marca', 'modelo', 'necesita_repuestos', 'procedimientos', 'repuestos', 'resultado_reparacion', 'serie_final',
      ]);
      assert.equal(c.serie_final, 'XYZ9');
      assert.equal(c.resultado_reparacion, 'reparada');
      assert.equal(c.necesita_repuestos, true);
      assert.deepEqual(c.repuestos, [{ nombre: 'Puerto HDMI', cantidad: 2, costo_estimado: 35000, estado: 'pedido' }]);
      assert.equal(c.fotos.length, 1);
      assert.deepEqual(Object.keys(c.fotos[0]).sort(), ['descripcion', 'ruta']);
      assert.equal(c.procedimientos.length, 1);
      assert.equal(c.procedimientos[0].descripcion, 'Limpieza general');
      assert.deepEqual(Object.keys(c.procedimientos[0]).sort(), ['creado_en', 'descripcion', 'estado_resultante', 'fotos']);
      assert.equal(c.procedimientos[0].fotos.length, 1);
      assert.equal(typeof c.procedimientos[0].fotos[0], 'string');

      const json = JSON.stringify(r.body);
      const [usuarios] = await pool.query('SELECT nombre, usuario FROM usuarios');
      const prohibidos = [
        DOC, '3015550101', `ana${SUFIJO}@correo.co`, `Calle Secreta ${SUFIJO}`, `SN-${SUFIJO}`, `OBS-PRIVADA-${SUFIJO}`,
        `NOTA-INTERNA-${SUFIJO}`, `NOTA-REP-${SUFIJO}`, 'María', 'Pérez',
        ...usuarios.map((u) => u.nombre), '"tecnico_id"', '"recibido_por"', '"interno"', '"telefono"', '"email"',
        '"documento"', '"direccion"', '"numero_serie"', '"observaciones_recepcion"', '"notas"',
      ];
      for (const p of prohibidos) assert.ok(!json.includes(p), `la respuesta pública no debe incluir ${p}`);
    });

    prueba('acepta el documento con espacios/puntos/guiones y encuentra documentos antiguos guardados con puntos', async () => {
      limiteConsulta.reiniciar();
      assert.equal((await consultar(DOC)).status, 200);
      assert.equal((await consultar(` ${DOC.slice(0, 5)} ${DOC.slice(5)} `)).status, 200);

      const [cl] = await pool.query('INSERT INTO clientes (nombre, documento) VALUES (?, ?)',
        [`Legado ${SUFIJO}`, `${DOC_LEGADO.slice(0, 3)}.${DOC_LEGADO.slice(3, 6)}.${DOC_LEGADO.slice(6)}`]);
      creados.clientes.push(cl.insertId);
      const [co] = await pool.query(
        `INSERT INTO consolas (cliente_id, marca, modelo, falla_reportada, recibido_por)
         SELECT ?, 'Nintendo', 'Switch', 'No carga', id FROM usuarios WHERE usuario = 'operario'`,
        [cl.insertId],
      );
      creados.consolas.push(co.insertId);
      const r = await consultar(DOC_LEGADO);
      assert.equal(r.status, 200, JSON.stringify(r.body));
      assert.equal(r.body.cliente.nombre_corto, 'Legado');
      assert.equal(r.body.consolas[0].serie_final, null);
    });

    prueba('mismo 404 para documento inexistente y para cliente sin consolas; 400 sin documento', async () => {
      limiteConsulta.reiniciar();
      const c = await request(app).post('/api/clientes').set(auth('operario'))
        .send({ nombre: `Sin consolas ${SUFIJO}`, documento: DOC_SIN_CONSOLAS });
      assert.equal(c.status, 201);
      creados.clientes.push(c.body.id);

      const inexistente = await consultar('000000000000001');
      const sinConsolas = await consultar(DOC_SIN_CONSOLAS);
      assert.equal(inexistente.status, 404);
      assert.equal(sinConsolas.status, 404);
      assert.deepEqual(inexistente.body, NO_ENCONTRADO);
      assert.deepEqual(sinConsolas.body, inexistente.body);
      assert.equal((await consultar('')).status, 400);
      assert.equal((await consultar('. - .')).status, 400);
    });

    prueba('429 tras 10 consultas en la ventana', async () => {
      limiteConsulta.reiniciar();
      for (let i = 0; i < 10; i += 1) assert.equal((await consultar('000000000000001')).status, 404);
      const r = await consultar(DOC);
      assert.equal(r.status, 429);
      assert.deepEqual(r.body, { error: 'Demasiadas consultas. Intenta de nuevo en unos minutos.' });
      limiteConsulta.reiniciar();
    });
  });

  prueba('repuestos: borrar (técnico); operario 403; inexistente 404', async () => {
    const ruta = `/api/consolas/${consolaId}/repuestos/${repuestoId}`;
    assert.equal((await request(app).delete(ruta).set(auth('operario'))).status, 403);
    assert.equal((await request(app).delete(ruta).set(auth('tecnico'))).status, 200);
    assert.equal((await request(app).delete(ruta).set(auth('tecnico'))).status, 404);
  });
});

describe('fase 2: galería', () => {
  let videoId;
  let fotoId;

  prueba('operario y técnico no gestionan la galería (403) y no se escribe ningún archivo', async () => {
    const antes = listarUploads();
    for (const rol of ['operario', 'tecnico']) {
      assert.equal((await request(app).get('/api/galeria').set(auth(rol))).status, 403);
      const r = await request(app).post('/api/galeria').set(auth(rol)).attach('archivo', MP4, 'video.mp4');
      assert.equal(r.status, 403);
      assert.equal((await request(app).put('/api/galeria/1').set(auth(rol)).send({ visible: 0 })).status, 403);
      assert.equal((await request(app).delete('/api/galeria/1').set(auth(rol))).status, 403);
    }
    assert.deepEqual(listarUploads(), antes);
  });

  prueba('subida de video MP4 válido → 201 tipo video (deducido del contenido)', async () => {
    const r = await request(app).post('/api/galeria').set(auth('administrador'))
      .field('titulo', `Video ${SUFIJO}`).field('orden', '5')
      .attach('archivo', MP4, { filename: 'trabajo.mp4', contentType: 'video/mp4' });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    videoId = r.body.id;
    creados.galeria.push(videoId);
    assert.equal(r.body.tipo, 'video');
    assert.equal(r.body.visible, 1);
    assert.equal(r.body.orden, 5);
    assert.match(r.body.ruta, /^\/uploads\/.+\.mp4$/);
    assert.ok(existeArchivo(r.body.ruta));
  });

  prueba('subida de WEBM y de imagen → tipo video / foto', async () => {
    const w = await request(app).post('/api/galeria').set(auth('administrador'))
      .attach('archivo', WEBM, { filename: 'clip.webm', contentType: 'video/webm' });
    assert.equal(w.status, 201, JSON.stringify(w.body));
    creados.galeria.push(w.body.id);
    assert.equal(w.body.tipo, 'video');

    const f = await request(app).post('/api/galeria').set(auth('administrador'))
      .field('titulo', `Foto ${SUFIJO}`).field('visible', '0')
      .attach('archivo', PNG, 'antes-despues.png');
    assert.equal(f.status, 201, JSON.stringify(f.body));
    fotoId = f.body.id;
    creados.galeria.push(fotoId);
    assert.equal(f.body.tipo, 'foto');
    assert.equal(f.body.visible, 0);
  });

  prueba('archivo falso como .mp4 → 400 y no queda en uploads/; sin archivo → 400; tipo no permitido → 400', async () => {
    const antes = listarUploads();
    const falso = await request(app).post('/api/galeria').set(auth('administrador'))
      .attach('archivo', Buffer.from('esto no es un video, solo texto plano'), { filename: 'falso.mp4', contentType: 'video/mp4' });
    assert.equal(falso.status, 400);
    assert.match(falso.body.error, /falso\.mp4/);
    // Un PNG que dice ser MP4 tampoco pasa.
    const disfrazado = await request(app).post('/api/galeria').set(auth('administrador'))
      .attach('archivo', PNG, { filename: 'disfrazado.mp4', contentType: 'video/mp4' });
    assert.equal(disfrazado.status, 400);
    const avi = await request(app).post('/api/galeria').set(auth('administrador'))
      .attach('archivo', MP4, { filename: 'video.avi', contentType: 'video/x-msvideo' });
    assert.equal(avi.status, 400);
    assert.equal((await request(app).post('/api/galeria').set(auth('administrador')).field('titulo', 'x')).status, 400);
    assert.deepEqual(listarUploads(), antes);
  });

  prueba('imagen de más de 5 MB → 400 aunque el límite de video sea 100 MB', async () => {
    const antes = listarUploads();
    const grande = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)]);
    const r = await request(app).post('/api/galeria').set(auth('administrador')).attach('archivo', grande, 'grande.png');
    assert.equal(r.status, 400);
    assert.match(r.body.error, /5 MB/);
    assert.deepEqual(listarUploads(), antes);
  });

  prueba('pública: solo visibles, sin subido_por; admin ve todos', async () => {
    const pub = await request(app).get('/api/publico/galeria');
    assert.equal(pub.status, 200);
    assert.ok(pub.body.some((g) => g.id === videoId));
    assert.ok(!pub.body.some((g) => g.id === fotoId));
    assert.ok(pub.body.every((g) => g.subido_por === undefined && g.visible === undefined));
    const adm = await request(app).get('/api/galeria').set(auth('administrador'));
    assert.ok(adm.body.some((g) => g.id === fotoId));
  });

  prueba('editar: visible, orden y título; validaciones; 404', async () => {
    const r = await request(app).put(`/api/galeria/${fotoId}`).set(auth('administrador'))
      .send({ visible: true, orden: 1, titulo: 'Nuevo título' });
    assert.equal(r.status, 200);
    assert.deepEqual([r.body.visible, r.body.orden, r.body.titulo, r.body.tipo], [1, 1, 'Nuevo título', 'foto']);
    assert.equal((await request(app).put(`/api/galeria/${fotoId}`).set(auth('administrador')).send({ orden: -2 })).status, 400);
    assert.equal((await request(app).put('/api/galeria/999999999').set(auth('administrador')).send({ orden: 1 })).status, 404);
    const pub = await request(app).get('/api/publico/galeria');
    assert.ok(pub.body.some((g) => g.id === fotoId));
  });

  prueba('borrar elimina el registro y el archivo', async () => {
    const [[fila]] = await pool.query('SELECT ruta FROM galeria WHERE id = ?', [videoId]);
    assert.equal((await request(app).delete(`/api/galeria/${videoId}`).set(auth('administrador'))).status, 200);
    assert.equal(existeArchivo(fila.ruta), false);
    assert.equal((await request(app).delete(`/api/galeria/${videoId}`).set(auth('administrador'))).status, 404);
  });
});

describe('fase 2: negocio y catálogo público', () => {
  prueba('técnico y operario no acceden a /negocio (403)', async () => {
    for (const rol of ['tecnico', 'operario']) {
      assert.equal((await request(app).get('/api/negocio').set(auth(rol))).status, 403);
      assert.equal((await request(app).put('/api/negocio').set(auth(rol)).send({ nombre: 'X' })).status, 403);
    }
  });

  prueba('admin edita con logo; whatsapp se normaliza; la pública lo refleja', async () => {
    const r = await request(app).put('/api/negocio').set(auth('administrador'))
      .field('eslogan', `Eslogan ${SUFIJO}`).field('whatsapp', '+57 300-123 4567')
      .field('instagram', 'https://instagram.com/prueba')
      .attach('logo', PNG, 'logo.png');
    assert.equal(r.status, 200, JSON.stringify(r.body));
    assert.equal(r.body.whatsapp, '573001234567');
    assert.equal(r.body.nombre, negocioOriginal.nombre); // campos no enviados se conservan
    assert.match(r.body.logo, /^\/uploads\/.+\.png$/);
    assert.ok(existeArchivo(r.body.logo));

    const pub = await request(app).get('/api/publico/negocio');
    assert.equal(pub.status, 200);
    assert.equal(pub.body.eslogan, `Eslogan ${SUFIJO}`);
    assert.equal(pub.body.logo, r.body.logo);
  });

  prueba('reemplazar el logo borra el anterior; quitar_logo lo borra; validaciones 400', async () => {
    const antes = (await request(app).get('/api/negocio').set(auth('administrador'))).body.logo;
    const r = await request(app).put('/api/negocio').set(auth('administrador')).attach('logo', PNG, 'logo2.png');
    assert.equal(r.status, 200);
    assert.notEqual(r.body.logo, antes);
    assert.equal(existeArchivo(antes), false);

    const q = await request(app).put('/api/negocio').set(auth('administrador')).field('quitar_logo', '1');
    assert.equal(q.body.logo, null);
    assert.equal(existeArchivo(r.body.logo), false);

    const subidos = listarUploads();
    for (const malo of [{ nombre: '' }, { whatsapp: '12ab' }, { email: 'no-es-correo' }, { facebook: 'facebook.com/x' }]) {
      assert.equal((await request(app).put('/api/negocio').set(auth('administrador')).send(malo)).status, 400, JSON.stringify(malo));
    }
    const falso = await request(app).put('/api/negocio').set(auth('administrador'))
      .attach('logo', Buffer.from('texto'), { filename: 'logo.png', contentType: 'image/png' });
    assert.equal(falso.status, 400);
    assert.deepEqual(listarUploads(), subidos);
  });

  prueba('artículos públicos: solo activos, con disponible y sin stock exacto', async () => {
    const r = await request(app).get('/api/publico/articulos');
    assert.equal(r.status, 200);
    for (const a of r.body) {
      assert.deepEqual(Object.keys(a).sort(), ['categoria', 'descripcion', 'disponible', 'foto', 'id', 'nombre', 'precio']);
      assert.equal(typeof a.disponible, 'boolean');
    }
    const [[{ total }]] = await pool.query('SELECT COUNT(*) AS total FROM articulos WHERE activo = 1');
    assert.equal(r.body.length, Math.min(total, 500));
  });
});
