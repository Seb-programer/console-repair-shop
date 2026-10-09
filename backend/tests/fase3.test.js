// Pruebas de la fase 3: modo producción (web compilada, caché, compresión, cabeceras de
// seguridad), IP real del cliente, límite de intentos de login, mensaje de login genérico,
// política de contraseñas, PUT /reparacion sin diagnóstico y verificar-claves.
// Las que necesitan MySQL se saltan solas si no hay conexión. Dejan la BD y uploads/ como estaban.
process.env.NODE_ENV = 'test';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const express = require('express');
const bcrypt = require('bcryptjs');
const request = require('supertest');

const app = require('../src/app');
const { crearApp } = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/db');
const { ipCliente } = require('../src/utils/ipCliente');
const {
  limiteConsulta, limiteLogin, crearLimiteLogin,
} = require('../src/middleware/limiteIntentos');
const { llegoPorHttps } = require('../src/middleware/seguridad');
const { usuariosConClaveDeEjemplo } = require('../scripts/verificar-claves');
const { HttpError } = require('../src/utils/HttpError');

const SUFIJO = `f3${Date.now()}`;
const MENSAJE_LOGIN = 'Usuario o contraseña incorrectos';
const MENSAJE_429_LOGIN = 'Demasiados intentos fallidos de inicio de sesión. Intenta de nuevo en unos minutos.';

// ---------- Web compilada de prueba (carpeta temporal, no toca frontend/dist) ----------
const DIST = fs.mkdtempSync(path.join(os.tmpdir(), 'consolas-dist-'));
const INDEX = '<!doctype html><html lang="es"><head><script type="module" crossorigin src="/assets/index-abc123.js"></script></head><body><div id="root"></div></body></html>';
const JS = `console.log(${JSON.stringify('x'.repeat(5000))});`;
fs.mkdirSync(path.join(DIST, 'assets'));
fs.writeFileSync(path.join(DIST, 'index.html'), INDEX);
fs.writeFileSync(path.join(DIST, 'assets', 'index-abc123.js'), JS);
fs.writeFileSync(path.join(DIST, 'favicon.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');

const prod = crearApp({ produccion: true, frontendDist: DIST, trustProxy: 'loopback' });

/** Petición simulada con la IP de conexión y cabeceras dadas, "vista" por una app con trust proxy. */
function reqSimulada(par, headers = {}, trustProxy = 'loopback') {
  const a = express();
  if (trustProxy) a.set('trust proxy', trustProxy);
  return { socket: { remoteAddress: par }, headers, app: a, ip: par };
}

let hayBD = false;
const tokens = {};
const creados = { usuarios: [], clientes: [], consolas: [] };
const auth = (rol) => ({ Authorization: `Bearer ${tokens[rol]}` });
const listarUploads = () => fs.readdirSync(config.uploadsDir).filter((f) => f !== '.gitkeep').sort();
let uploadsIniciales;

function prueba(nombre, fn) {
  it(nombre, async (t) => {
    if (!hayBD) return t.skip('MySQL no disponible');
    return fn(t);
  });
}

before(async () => {
  limiteLogin.reiniciar();
  limiteConsulta.reiniciar();
  try {
    await pool.query('SELECT 1 FROM usuarios LIMIT 1');
    hayBD = true;
  } catch (err) {
    // En CI (REQUIERE_BD=1) la base de datos es obligatoria: fallar en vez de saltar.
    if (process.env.REQUIERE_BD === '1') throw err;
    return;
  }
  uploadsIniciales = listarUploads();
  for (const [rol, usuario, password] of [['administrador', 'admin', 'Admin123*'], ['tecnico', 'tecnico', 'Tecnico123*'], ['operario', 'operario', 'Operario123*']]) {
    const r = await request(app).post('/api/auth/login').send({ usuario, password });
    assert.equal(r.status, 200, JSON.stringify(r.body));
    tokens[rol] = r.body.token;
  }
});

after(async () => {
  if (hayBD) {
    for (const id of creados.consolas) await request(app).delete(`/api/consolas/${id}`).set(auth('administrador'));
    if (creados.clientes.length) await pool.query('DELETE FROM clientes WHERE id IN (?)', [creados.clientes]);
    if (creados.usuarios.length) await pool.query('DELETE FROM usuarios WHERE id IN (?)', [creados.usuarios]);
    assert.deepEqual(listarUploads(), uploadsIniciales, 'uploads/ debe quedar como estaba');
  }
  limiteLogin.reiniciar();
  limiteConsulta.reiniciar();
  fs.rmSync(DIST, { recursive: true, force: true });
  await pool.end();
});

describe('fase 3: servir la web compilada (modo producción)', () => {
  it('GET / y rutas de React (/panel/consolas, /consulta) devuelven index.html sin caché', async () => {
    for (const ruta of ['/', '/panel/consolas', '/consulta', '/panel/consolas/15']) {
      const r = await request(prod).get(ruta);
      assert.equal(r.status, 200, ruta);
      assert.match(r.headers['content-type'], /text\/html/);
      assert.equal(r.text, INDEX);
      assert.equal(r.headers['cache-control'], 'no-cache', ruta);
    }
  });

  it('/assets/* con caché larga e immutable, y comprimido con gzip', async () => {
    const r = await request(prod).get('/assets/index-abc123.js').set('Accept-Encoding', 'gzip');
    assert.equal(r.status, 200);
    assert.equal(r.headers['cache-control'], 'public, max-age=31536000, immutable');
    assert.match(r.headers['content-type'], /javascript/);
    assert.equal(r.headers['content-encoding'], 'gzip');
    const fav = await request(prod).get('/favicon.svg');
    assert.equal(fav.headers['cache-control'], 'no-cache');
  });

  it('un /assets inexistente da 404 (no el HTML)', async () => {
    const r = await request(prod).get('/assets/viejo-000.js');
    assert.equal(r.status, 404);
    assert.doesNotMatch(r.text, /<div id="root">/);
  });

  it('/api y /uploads no caen en el fallback: 404 JSON', async () => {
    for (const ruta of ['/api/no-existe', '/api', '/uploads/no-existe.png', '/uploads/']) {
      const r = await request(prod).get(ruta);
      assert.equal(r.status, 404, ruta);
      assert.deepEqual(r.body, { error: 'Ruta no encontrada' }, ruta);
    }
    assert.equal((await request(prod).post('/panel/consolas')).status, 404); // solo GET/HEAD
  });

  it('sin frontend compilado: aviso en consola y 503 con mensaje claro (la API sigue)', async () => {
    const original = console.error;
    const avisos = [];
    console.error = (...a) => avisos.push(a.join(' '));
    let sinDist;
    try {
      sinDist = crearApp({ produccion: true, frontendDist: path.join(DIST, 'no-existe'), trustProxy: 'loopback' });
    } finally {
      console.error = original;
    }
    assert.match(avisos.join('\n'), /npm run build/);
    const r = await request(sinDist).get('/panel');
    assert.equal(r.status, 503);
    assert.match(r.text, /npm run build/);
    assert.equal((await request(sinDist).get('/api/no-existe')).status, 404);
  });

  it('en desarrollo (app por defecto) no se sirve la web: / da 404 JSON', async () => {
    const r = await request(app).get('/');
    assert.equal(r.status, 404);
    assert.deepEqual(r.body, { error: 'Ruta no encontrada' });
  });
});

describe('fase 3: cabeceras de seguridad', () => {
  it('producción: CSP, nosniff, frame, referrer, permissions; sin HSTS por HTTP', async () => {
    const r = await request(prod).get('/');
    const csp = r.headers['content-security-policy'];
    assert.ok(csp, 'falta la CSP');
    for (const d of [
      "default-src 'self'", "script-src 'self'", "style-src 'self' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com", "img-src 'self' data: blob:", "media-src 'self' blob:",
      "connect-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'",
    ]) assert.ok(csp.includes(d), `CSP sin "${d}": ${csp}`);
    assert.doesNotMatch(csp, /unsafe-inline|unsafe-eval|upgrade-insecure-requests/);
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
    assert.equal(r.headers['x-frame-options'], 'DENY');
    assert.equal(r.headers['referrer-policy'], 'strict-origin-when-cross-origin');
    assert.match(r.headers['permissions-policy'], /camera=\(\)/);
    assert.equal(r.headers['strict-transport-security'], undefined);
    assert.equal(r.headers['x-powered-by'], undefined);
  });

  it('HSTS solo si llega por HTTPS a través del proxy local (X-Forwarded-Proto desde loopback)', async () => {
    const r = await request(prod).get('/api/no-existe').set('X-Forwarded-Proto', 'https');
    assert.match(r.headers['strict-transport-security'], /max-age=\d+/);
    // Un equipo de la red local no puede activarlo con la cabecera.
    assert.equal(llegoPorHttps({ secure: false, socket: { remoteAddress: '192.168.1.40' }, headers: { 'x-forwarded-proto': 'https' } }), false);
    assert.equal(llegoPorHttps({ secure: false, socket: { remoteAddress: '::ffff:127.0.0.1' }, headers: { 'x-forwarded-proto': 'https' } }), true);
    assert.equal(llegoPorHttps({ secure: true, socket: { remoteAddress: '10.0.0.2' }, headers: {} }), true);
  });

  it('COOP y Origin-Agent-Cluster solo por HTTPS (por HTTP en la red local el navegador los ignora con error en consola)', async () => {
    const http = await request(prod).get('/');
    assert.equal(http.headers['cross-origin-opener-policy'], undefined);
    assert.equal(http.headers['origin-agent-cluster'], undefined);
    assert.ok(http.headers['content-security-policy']);
    const https = await request(prod).get('/').set('X-Forwarded-Proto', 'https');
    assert.equal(https.headers['cross-origin-opener-policy'], 'same-origin');
    assert.equal(https.headers['origin-agent-cluster'], '?1');
    assert.ok(https.headers['content-security-policy']);
  });

  it('desarrollo: cabeceras básicas pero SIN CSP (Vite usa scripts en línea)', async () => {
    const r = await request(app).get('/api/no-existe');
    assert.equal(r.headers['content-security-policy'], undefined);
    assert.equal(r.headers['x-content-type-options'], 'nosniff');
    assert.equal(r.headers['x-frame-options'], 'DENY');
    assert.equal(r.headers['content-encoding'], undefined);
  });
});

describe('fase 3: IP real del cliente (ipCliente)', () => {
  it('un equipo de la red local no puede falsear su IP con cabeceras', () => {
    const r = reqSimulada('192.168.1.50', {
      'cf-connecting-ip': '1.2.3.4', 'x-forwarded-for': '5.6.7.8', 'x-real-ip': '9.9.9.9',
    });
    assert.equal(ipCliente(r), '192.168.1.50');
    assert.equal(ipCliente(reqSimulada('::ffff:192.168.1.50', { 'cf-connecting-ip': '1.2.3.4' })), '192.168.1.50');
  });

  it('desde cloudflared (loopback) se usa CF-Connecting-IP; si no es una IP válida, se ignora', () => {
    assert.equal(ipCliente(reqSimulada('127.0.0.1', { 'cf-connecting-ip': '203.0.113.9' })), '203.0.113.9');
    assert.equal(ipCliente(reqSimulada('::1', { 'cf-connecting-ip': '2001:db8::7' })), '2001:db8::7');
    assert.equal(ipCliente(reqSimulada('::ffff:127.0.0.1', { 'cf-connecting-ip': 'basura' })), '::ffff:127.0.0.1'.slice(7));
  });

  it('en desarrollo (sin trust proxy) CF-Connecting-IP se ignora aunque llegue por loopback', () => {
    assert.equal(ipCliente(reqSimulada('127.0.0.1', { 'cf-connecting-ip': '203.0.113.9' }, '')), '127.0.0.1');
  });

  it('el límite de consultas no se salta rotando cabeceras desde la red local', () => {
    limiteConsulta.reiniciar();
    const res = { setHeader() {} };
    let ultimo;
    for (let i = 0; i < 11; i += 1) {
      const req = reqSimulada('192.168.1.77', { 'cf-connecting-ip': `1.1.1.${i}`, 'x-forwarded-for': `2.2.2.${i}` });
      limiteConsulta(req, res, (err) => { ultimo = err; });
    }
    assert.equal(ultimo?.status, 429);
    limiteConsulta.reiniciar();
  });

  it('HTTP real "desde cloudflared": el límite de consultas cuenta por CF-Connecting-IP', async () => {
    limiteConsulta.reiniciar();
    const consulta = (ip) => request(prod).post('/api/publico/consulta').set('CF-Connecting-IP', ip).send({});
    for (let i = 0; i < 10; i += 1) assert.equal((await consulta('203.0.113.10')).status, 400);
    const bloqueada = await consulta('203.0.113.10');
    assert.equal(bloqueada.status, 429);
    assert.deepEqual(bloqueada.body, { error: 'Demasiadas consultas. Intenta de nuevo en unos minutos.' });
    assert.equal((await consulta('203.0.113.11')).status, 400); // otro visitante de internet no se ve afectado
    limiteConsulta.reiniciar();
  });
});

describe('fase 3: límite de intentos de login (lógica)', () => {
  const res = () => ({ cabeceras: {}, setHeader(k, v) { this.cabeceras[k] = v; } });
  const estado = (fn) => {
    try { fn(); return 'ok'; } catch (e) { assert.ok(e instanceof HttpError); return e.status; }
  };

  it('5 fallos por IP + usuario → 429 (incluido el 6.º intento); otra IP u otro usuario siguen', () => {
    const lim = crearLimiteLogin();
    const req = reqSimulada('192.168.1.20');
    for (let i = 0; i < 5; i += 1) {
      assert.equal(estado(() => lim.comprobar(req, res(), 'Admin')), 'ok');
      lim.registrarFallo(req, 'Admin');
    }
    const r = res();
    assert.equal(estado(() => lim.comprobar(req, r, 'admin')), 429); // sin distinguir mayúsculas
    assert.ok(Number(r.cabeceras['Retry-After']) > 0);
    assert.equal(estado(() => lim.comprobar(req, res(), 'tecnico')), 'ok');
    assert.equal(estado(() => lim.comprobar(reqSimulada('192.168.1.21'), res(), 'admin')), 'ok');
  });

  it('20 fallos por IP (con usuarios distintos) → 429 para cualquier usuario desde esa IP', () => {
    const lim = crearLimiteLogin();
    const req = reqSimulada('192.168.1.30');
    for (let i = 0; i < 20; i += 1) {
      assert.equal(estado(() => lim.comprobar(req, res(), `u${i}`)), 'ok');
      lim.registrarFallo(req, `u${i}`);
    }
    assert.equal(estado(() => lim.comprobar(req, res(), 'otro')), 429);
    assert.equal(estado(() => lim.comprobar(reqSimulada('192.168.1.31'), res(), 'otro')), 'ok');
    lim.reiniciar();
    assert.equal(estado(() => lim.comprobar(req, res(), 'otro')), 'ok');
  });

  it('un login correcto reinicia el contador de esa IP + usuario', () => {
    const lim = crearLimiteLogin();
    const req = reqSimulada('192.168.1.40');
    for (let i = 0; i < 4; i += 1) lim.registrarFallo(req, 'admin');
    lim.registrarExito(req, 'admin');
    for (let i = 0; i < 4; i += 1) lim.registrarFallo(req, 'admin');
    assert.equal(estado(() => lim.comprobar(req, res(), 'admin')), 'ok');
  });

  it('la ventana vence: pasado el tiempo se puede volver a intentar', async () => {
    const lim = crearLimiteLogin({ maxPorUsuario: 1, ventanaMs: 30 });
    const req = reqSimulada('192.168.1.50');
    lim.registrarFallo(req, 'admin');
    assert.equal(estado(() => lim.comprobar(req, res(), 'admin')), 429);
    await new Promise((r) => { setTimeout(r, 50); });
    assert.equal(estado(() => lim.comprobar(req, res(), 'admin')), 'ok');
  });
});

describe('fase 3: login (con base de datos)', () => {
  const loginCf = (ip, usuario, password) => request(prod).post('/api/auth/login')
    .set('CF-Connecting-IP', ip).send({ usuario, password });

  prueba('HTTP: 5 fallos → 429 con JSON {error} aunque luego la contraseña sea correcta; otra IP entra', async () => {
    limiteLogin.reiniciar();
    for (let i = 0; i < 5; i += 1) {
      const r = await loginCf('198.51.100.7', 'admin', 'mala-clave-1');
      assert.equal(r.status, 401);
      assert.deepEqual(r.body, { error: MENSAJE_LOGIN });
    }
    const bloqueado = await loginCf('198.51.100.7', 'admin', 'Admin123*');
    assert.equal(bloqueado.status, 429);
    assert.deepEqual(bloqueado.body, { error: MENSAJE_429_LOGIN });
    assert.ok(Number(bloqueado.headers['retry-after']) > 0);
    assert.equal((await loginCf('198.51.100.8', 'admin', 'Admin123*')).status, 200);
    limiteLogin.reiniciar();
  });

  prueba('HTTP: un login correcto reinicia el contador de IP + usuario', async () => {
    limiteLogin.reiniciar();
    for (let i = 0; i < 4; i += 1) assert.equal((await loginCf('198.51.100.9', 'admin', 'mala')).status, 401);
    assert.equal((await loginCf('198.51.100.9', 'admin', 'Admin123*')).status, 200);
    for (let i = 0; i < 4; i += 1) assert.equal((await loginCf('198.51.100.9', 'admin', 'mala')).status, 401);
    assert.equal((await loginCf('198.51.100.9', 'admin', 'Admin123*')).status, 200);
    limiteLogin.reiniciar();
  });

  prueba('usuario inactivo con la contraseña correcta recibe el mismo 401 genérico', async () => {
    const datos = { nombre: 'Inactivo F3', usuario: `in_${SUFIJO}`, password: 'Secreta12', rol: 'operario' };
    const c = await request(app).post('/api/usuarios').set(auth('administrador')).send(datos);
    assert.equal(c.status, 201, JSON.stringify(c.body));
    creados.usuarios.push(c.body.id);
    assert.equal((await request(app).delete(`/api/usuarios/${c.body.id}`).set(auth('administrador'))).status, 200);
    const r = await request(app).post('/api/auth/login').send({ usuario: datos.usuario, password: datos.password });
    assert.equal(r.status, 401);
    assert.deepEqual(r.body, { error: MENSAJE_LOGIN });
    const inexistente = await request(app).post('/api/auth/login').send({ usuario: `no_${SUFIJO}`, password: 'x' });
    assert.deepEqual(inexistente.body, { error: MENSAJE_LOGIN });
    limiteLogin.reiniciar();
  });
});

describe('fase 3: política de contraseñas y verificar-claves (con base de datos)', () => {
  const POLITICA = 'La contraseña debe tener al menos 8 caracteres e incluir letras y números';

  prueba('crear y editar usuario exigen 8+ caracteres con letras y números', async () => {
    const base = { nombre: 'Política F3', usuario: `pol_${SUFIJO}`, rol: 'tecnico' };
    for (const password of ['abc123', 'abcdefgh', '12345678']) {
      const r = await request(app).post('/api/usuarios').set(auth('administrador')).send({ ...base, password });
      assert.equal(r.status, 400, password);
      assert.deepEqual(r.body, { error: POLITICA });
    }
    const ok = await request(app).post('/api/usuarios').set(auth('administrador')).send({ ...base, password: 'Taller2026' });
    assert.equal(ok.status, 201, JSON.stringify(ok.body));
    creados.usuarios.push(ok.body.id);

    const mala = await request(app).put(`/api/usuarios/${ok.body.id}`).set(auth('administrador')).send({ password: 'corta1' });
    assert.equal(mala.status, 400);
    assert.deepEqual(mala.body, { error: POLITICA });
    // Editar otros campos sin enviar contraseña sigue funcionando.
    const nombre = await request(app).put(`/api/usuarios/${ok.body.id}`).set(auth('administrador')).send({ nombre: 'Otro nombre' });
    assert.equal(nombre.status, 200);
    const buena = await request(app).put(`/api/usuarios/${ok.body.id}`).set(auth('administrador')).send({ password: 'NuevaClave9' });
    assert.equal(buena.status, 200);
    assert.equal((await request(app).post('/api/auth/login').send({ usuario: base.usuario, password: 'NuevaClave9' })).status, 200);
  });

  prueba('los usuarios del seed con contraseña de ejemplo pueden seguir entrando (no les afecta la política)', async () => {
    const r = await request(app).post('/api/auth/login').send({ usuario: 'operario', password: 'Operario123*' });
    assert.equal(r.status, 200);
  });

  it('verificar-claves detecta las contraseñas del seed y no las demás', async () => {
    const usuarios = [
      { usuario: 'a', password_hash: bcrypt.hashSync('Admin123*', 4) },
      { usuario: 'b', password_hash: bcrypt.hashSync('OtraClave99', 4) },
      { usuario: 'c', password_hash: bcrypt.hashSync('Operario123*', 4) },
    ];
    const afectados = await usuariosConClaveDeEjemplo(usuarios);
    assert.deepEqual(afectados.map((u) => u.usuario), ['a', 'c']);
    assert.deepEqual(await usuariosConClaveDeEjemplo([usuarios[1]]), []);
  });
});

describe('fase 3: PUT /consolas/:id/reparacion conserva el diagnóstico (con base de datos)', () => {
  prueba('sin diagnostico_resultado se conserva; con "" se borra', async () => {
    const c = await request(app).post('/api/clientes').set(auth('operario')).send({ nombre: `Cliente F3 ${SUFIJO}` });
    assert.equal(c.status, 201, JSON.stringify(c.body));
    creados.clientes.push(c.body.id);
    const co = await request(app).post('/api/consolas').set(auth('operario'))
      .field('cliente_id', String(c.body.id)).field('marca', 'Nintendo').field('modelo', 'Switch')
      .field('falla_reportada', 'No carga');
    assert.equal(co.status, 201, JSON.stringify(co.body));
    creados.consolas.push(co.body.id);
    const ruta = `/api/consolas/${co.body.id}/reparacion`;

    let r = await request(app).put(ruta).set(auth('tecnico')).send({ resultado_reparacion: 'pendiente', diagnostico_resultado: 'Puerto USB-C dañado' });
    assert.equal(r.status, 200);
    assert.equal(r.body.diagnostico_resultado, 'Puerto USB-C dañado');

    r = await request(app).put(ruta).set(auth('tecnico')).send({ resultado_reparacion: 'reparada' });
    assert.equal(r.status, 200);
    assert.equal(r.body.resultado_reparacion, 'reparada');
    assert.equal(r.body.diagnostico_resultado, 'Puerto USB-C dañado');

    r = await request(app).put(ruta).set(auth('tecnico')).send({ resultado_reparacion: 'reparada', diagnostico_resultado: '' });
    assert.equal(r.status, 200);
    assert.equal(r.body.diagnostico_resultado, null);
  });
});
