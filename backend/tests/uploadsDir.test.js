// Carpeta de subidas configurable (UPLOADS_DIR) y prioridad del entorno sobre backend/.env.
// Cada archivo de prueba corre en su propio proceso, así que UPLOADS_DIR se fija antes de cargar la app
// y apunta a una carpeta temporal (que aún no existe: debe crearse al arrancar).
// Las pruebas con BD se saltan si no hay conexión. No tocan backend/uploads y no dejan filas en la BD.
const fs = require('fs');
const os = require('os');
const path = require('path');

const TMP_BASE = fs.mkdtempSync(path.join(os.tmpdir(), 'consolas-uploads-'));
const TMP_UPLOADS = path.join(TMP_BASE, 'subidas-demo');
process.env.NODE_ENV = 'test';
process.env.UPLOADS_DIR = TMP_UPLOADS;

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('child_process');
const request = require('supertest');
const dotenv = require('dotenv');

const app = require('../src/app');
const config = require('../src/config/env');
const { pool } = require('../src/config/db');

const BACKEND_DIR = path.join(__dirname, '..');
const UPLOADS_POR_DEFECTO = path.join(BACKEND_DIR, 'uploads');
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const SUFIJO = `ud${Date.now()}`;

const listar = (dir) => (fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f !== '.gitkeep').sort() : []);
const uploadsRealesIniciales = listar(UPLOADS_POR_DEFECTO);

let hayBD = false;
let token;
const creadosGaleria = [];
const auth = () => ({ Authorization: `Bearer ${token}` });

function prueba(nombre, fn) {
  it(nombre, async (t) => {
    if (!hayBD) return t.skip('MySQL no disponible');
    return fn(t);
  });
}

/** Carga config/env en un proceso nuevo con el entorno dado y devuelve los valores que interesan. */
function configEnProcesoNuevo(entorno) {
  const codigo = `const c = require(${JSON.stringify(path.join(BACKEND_DIR, 'src', 'config', 'env.js'))});
    process.stdout.write(JSON.stringify({ db: c.db.database, port: c.port, host: c.host, uploadsDir: c.uploadsDir }));`;
  const env = { ...process.env, ...entorno };
  for (const [k, v] of Object.entries(entorno)) if (v === undefined) delete env[k];
  return JSON.parse(execFileSync(process.execPath, ['-e', codigo], { env, cwd: os.tmpdir() }).toString());
}

before(async () => {
  try {
    await pool.query('SELECT 1 FROM galeria LIMIT 1');
    hayBD = true;
  } catch (err) {
    if (process.env.REQUIERE_BD === '1') throw err;
    return;
  }
  const r = await request(app).post('/api/auth/login').send({ usuario: 'admin', password: 'Admin123*' });
  assert.equal(r.status, 200);
  token = r.body.token;
});

after(async () => {
  try {
    if (hayBD) {
      for (const id of creadosGaleria) {
        await request(app).delete(`/api/galeria/${id}`).set(auth());
      }
      if (creadosGaleria.length) await pool.query('DELETE FROM galeria WHERE id IN (?)', [creadosGaleria]);
    }
    assert.deepEqual(listar(UPLOADS_POR_DEFECTO), uploadsRealesIniciales, 'backend/uploads no debe cambiar');
  } finally {
    fs.rmSync(TMP_BASE, { recursive: true, force: true });
    await pool.end();
  }
});

describe('UPLOADS_DIR: resolución de la ruta', () => {
  it('sin valor (o vacío) usa backend/uploads; relativa se resuelve desde backend/; absoluta se respeta', () => {
    const { resolverUploadsDir } = config;
    assert.equal(resolverUploadsDir(undefined), UPLOADS_POR_DEFECTO);
    assert.equal(resolverUploadsDir('  '), UPLOADS_POR_DEFECTO);
    assert.equal(resolverUploadsDir('uploads-demo'), path.join(BACKEND_DIR, 'uploads-demo'));
    assert.equal(resolverUploadsDir('../otra/carpeta'), path.resolve(BACKEND_DIR, '..', 'otra', 'carpeta'));
    assert.equal(resolverUploadsDir(TMP_UPLOADS), TMP_UPLOADS);
  });

  it('la app usa la carpeta de UPLOADS_DIR y la crea al arrancar', () => {
    assert.equal(config.uploadsDir, TMP_UPLOADS);
    assert.ok(fs.statSync(TMP_UPLOADS).isDirectory());
  });
});

describe('variables de entorno con prioridad sobre backend/.env', () => {
  it('DB_NAME, PORT, HOST y UPLOADS_DIR del entorno ganan; sin ellas, valores de .env o por defecto', () => {
    const demo = configEnProcesoNuevo({
      DB_NAME: 'consolas_demo', PORT: '5180', HOST: '0.0.0.0', UPLOADS_DIR: 'uploads-demo',
    });
    assert.deepEqual(demo, {
      db: 'consolas_demo',
      port: 5180,
      host: '0.0.0.0',
      uploadsDir: path.join(BACKEND_DIR, 'uploads-demo'), // relativa a backend/, aunque el cwd sea otro
    });

    const normal = configEnProcesoNuevo({ DB_NAME: undefined, PORT: undefined, HOST: undefined, UPLOADS_DIR: undefined });
    const archivoEnv = path.join(BACKEND_DIR, '.env');
    const deEnv = fs.existsSync(archivoEnv) ? dotenv.parse(fs.readFileSync(archivoEnv)) : {};
    assert.equal(normal.db, deEnv.DB_NAME || 'consolas_db');
    assert.equal(normal.port, Number(deEnv.PORT) || 3001);
    assert.equal(normal.host, deEnv.HOST || '127.0.0.1');
    assert.equal(normal.uploadsDir, config.resolverUploadsDir(deEnv.UPLOADS_DIR));
  });
});

describe('UPLOADS_DIR: subir, servir y borrar archivos', () => {
  prueba('la subida se guarda en UPLOADS_DIR, se sirve por /uploads y al borrarla desaparece de allí', async () => {
    const r = await request(app).post('/api/galeria').set(auth())
      .field('titulo', `UPLOADS_DIR ${SUFIJO}`).field('visible', '0')
      .attach('archivo', PNG, 'demo.png');
    assert.equal(r.status, 201, JSON.stringify(r.body));
    creadosGaleria.push(r.body.id);
    assert.match(r.body.ruta, /^\/uploads\/.+\.png$/);
    const nombre = path.basename(r.body.ruta);

    assert.deepEqual(listar(TMP_UPLOADS), [nombre]);
    assert.deepEqual(listar(UPLOADS_POR_DEFECTO), uploadsRealesIniciales, 'no debe escribirse en backend/uploads');

    const servido = await request(app).get(r.body.ruta);
    assert.equal(servido.status, 200);
    assert.equal(servido.headers['content-type'], 'image/png');
    assert.ok(Buffer.from(servido.body).equals(PNG));

    const del = await request(app).delete(`/api/galeria/${r.body.id}`).set(auth());
    assert.equal(del.status, 200, JSON.stringify(del.body));
    creadosGaleria.pop();
    assert.deepEqual(listar(TMP_UPLOADS), []);
    assert.equal((await request(app).get(r.body.ruta)).status, 404);
  });

  prueba('un archivo con contenido falso se valida y se borra de UPLOADS_DIR', async () => {
    const r = await request(app).post('/api/galeria').set(auth())
      .attach('archivo', Buffer.from('no soy una imagen'), { filename: 'falso.png', contentType: 'image/png' });
    assert.equal(r.status, 400);
    assert.deepEqual(listar(TMP_UPLOADS), []);
  });
});
