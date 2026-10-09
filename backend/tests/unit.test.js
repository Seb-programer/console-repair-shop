// Pruebas de lógica que NO necesitan base de datos.
process.env.NODE_ENV = 'test';

const { describe, it, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const app = require('../src/app');
const { pool } = require('../src/config/db');
const { autorizar } = require('../src/middleware/auth');
const { traducirError } = require('../src/middleware/errores');
const v = require('../src/utils/validacion');
const { HttpError } = require('../src/utils/HttpError');
const ventas = require('../src/services/ventas.service');
const consolas = require('../src/services/consolas.service');
const { datosCliente } = require('../src/controllers/clientes.controller');
const { datosArticulo } = require('../src/controllers/articulos.controller');
const { datosRecepcion } = require('../src/controllers/consolas.controller');

after(() => pool.end());

/** Ejecuta un middleware y devuelve el error (o undefined) que pasa a next. */
function ejecutar(middleware, usuario) {
  let recibido = 'no-llamado';
  middleware({ usuario }, {}, (err) => { recibido = err; });
  return recibido;
}

function estadoError(fn) {
  try {
    fn();
  } catch (err) {
    assert.ok(err instanceof HttpError, `se esperaba HttpError y llegó ${err}`);
    return err.status;
  }
  return assert.fail('Se esperaba un error');
}

describe('autorizar(...roles)', () => {
  const matriz = [
    // [roles permitidos, rol del usuario, ¿permitido?]
    [['administrador'], 'administrador', true],
    [['administrador'], 'tecnico', false],
    [['administrador'], 'operario', false],
    [['operario', 'administrador'], 'operario', true],
    [['operario', 'administrador'], 'tecnico', false],
    [['tecnico', 'administrador'], 'tecnico', true],
    [['tecnico', 'administrador'], 'operario', false],
  ];
  for (const [roles, rol, permitido] of matriz) {
    it(`${rol} ${permitido ? 'puede' : 'NO puede'} acceder a [${roles}]`, () => {
      const err = ejecutar(autorizar(...roles), { id: 1, rol });
      if (permitido) assert.equal(err, undefined);
      else assert.equal(err.status, 403);
    });
  }

  it('sin usuario autenticado devuelve 401', () => {
    assert.equal(ejecutar(autorizar('administrador'), undefined).status, 401);
  });
});

describe('validaciones', () => {
  it('textoObligatorio rechaza vacíos y recorta', () => {
    assert.equal(estadoError(() => v.textoObligatorio('  ', 'nombre')), 400);
    assert.equal(estadoError(() => v.textoObligatorio(undefined, 'nombre')), 400);
    assert.equal(v.textoObligatorio('  Ana ', 'nombre'), 'Ana');
    assert.equal(estadoError(() => v.textoObligatorio('x'.repeat(11), 'nombre', 10)), 400);
  });

  it('textoOpcional convierte vacío en null', () => {
    assert.equal(v.textoOpcional('', 'documento'), null);
    assert.equal(v.textoOpcional('   ', 'documento'), null);
    assert.equal(v.textoOpcional(null, 'documento'), null);
  });

  it('enumValido solo acepta valores del ENUM', () => {
    assert.equal(v.enumValido('en_proceso', v.ESTADOS_CONSOLA, 'estado'), 'en_proceso');
    assert.equal(estadoError(() => v.enumValido('reparado', v.ESTADOS_CONSOLA, 'estado')), 400);
    assert.equal(estadoError(() => v.enumValido('root', v.ROLES, 'rol')), 400);
  });

  it('enteroPositivo exige enteros > 0', () => {
    assert.equal(v.enteroPositivo('3', 'cantidad'), 3);
    for (const malo of [0, -1, 1.5, '2.5', 'abc', '', null]) {
      assert.equal(estadoError(() => v.enteroPositivo(malo, 'cantidad')), 400, `valor ${malo}`);
    }
  });

  it('enteroNoNegativo acepta 0 y rechaza negativos/decimales', () => {
    assert.equal(v.enteroNoNegativo('0', 'stock'), 0);
    assert.equal(estadoError(() => v.enteroNoNegativo(-1, 'stock')), 400);
    assert.equal(estadoError(() => v.enteroNoNegativo(1.2, 'stock')), 400);
  });

  it('precioValido exige positivo con máximo 2 decimales', () => {
    assert.equal(v.precioValido('19.99', 'precio'), 19.99);
    assert.equal(v.precioValido(0.1 + 0.2, 'precio'), 0.3);
    for (const malo of [0, -5, '1.234', 'gratis', '']) {
      assert.equal(estadoError(() => v.precioValido(malo, 'precio')), 400, `valor ${malo}`);
    }
  });

  it('booleano interpreta JSON y multipart', () => {
    assert.equal(v.booleano('1', 'activo'), true);
    assert.equal(v.booleano('false', 'activo'), false);
    assert.equal(v.booleano(true, 'activo'), true);
    assert.equal(estadoError(() => v.booleano('quizá', 'activo')), 400);
  });

  it('validarPassword: mínimo 8 caracteres, con letras y números (fase 3)', () => {
    for (const mala of ['123', 'Abc1234', 'abcdefgh', '12345678', '********']) {
      assert.equal(estadoError(() => v.validarPassword(mala)), 400, mala);
    }
    assert.equal(v.validarPassword('Secreta1'), 'Secreta1');
    assert.equal(v.validarPassword('contraseña9'), 'contraseña9');
    assert.equal(estadoError(() => v.validarPassword(`a1${'x'.repeat(71)}`)), 400); // > 72
  });

  it('datosCliente: documento vacío pasa a null y valida email', () => {
    const d = datosCliente({ nombre: 'Ana', documento: '  ', email: '' });
    assert.equal(d.documento, null);
    assert.equal(d.email, null);
    assert.equal(estadoError(() => datosCliente({ nombre: 'Ana', email: 'no-es-correo' })), 400);
    assert.equal(estadoError(() => datosCliente({})), 400);
  });

  it('datosArticulo valida precio y stock', () => {
    const d = datosArticulo({ nombre: 'Mando', precio: '25.5', stock: '3' });
    assert.deepEqual([d.precio, d.stock], [25.5, 3]);
    assert.equal(estadoError(() => datosArticulo({ nombre: 'Mando', precio: '-1', stock: '3' })), 400);
    assert.equal(estadoError(() => datosArticulo({ nombre: 'Mando', precio: '10', stock: '1.5' })), 400);
  });

  it('datosRecepcion exige cliente, marca, modelo y falla', () => {
    assert.equal(estadoError(() => datosRecepcion({ marca: 'Sony', modelo: 'PS5', falla_reportada: 'x' })), 400);
    const d = datosRecepcion({ cliente_id: '4', marca: 'Sony', modelo: 'PS5', falla_reportada: 'No enciende' });
    assert.equal(d.cliente_id, 4);
    assert.equal(d.numero_serie, null);
  });
});

describe('ventas: normalización y cálculo de totales', () => {
  it('rechaza ítems vacíos o inválidos', () => {
    assert.equal(estadoError(() => ventas.normalizarItems([])), 400);
    assert.equal(estadoError(() => ventas.normalizarItems(undefined)), 400);
    assert.equal(estadoError(() => ventas.normalizarItems([{ articulo_id: 1, cantidad: 0 }])), 400);
    assert.equal(estadoError(() => ventas.normalizarItems([{ articulo_id: 1, cantidad: 1.5 }])), 400);
    assert.equal(estadoError(() => ventas.normalizarItems([{ articulo_id: 'x', cantidad: 1 }])), 400);
  });

  it('agrupa artículos repetidos', () => {
    const items = ventas.normalizarItems([
      { articulo_id: 1, cantidad: 2 }, { articulo_id: '2', cantidad: '1' }, { articulo_id: 1, cantidad: 3 },
    ]);
    assert.deepEqual(items, [{ articulo_id: 1, cantidad: 5 }, { articulo_id: 2, cantidad: 1 }]);
  });

  it('calcula subtotales y total con el precio del servidor sin errores de coma flotante', () => {
    const precios = new Map([[1, 0.1], [2, 19.99], [3, 1500]]);
    const { detalle, total } = ventas.calcularTotales(
      [{ articulo_id: 1, cantidad: 3 }, { articulo_id: 2, cantidad: 3 }, { articulo_id: 3, cantidad: 1 }],
      precios,
    );
    assert.deepEqual(detalle.map((d) => d.subtotal), [0.3, 59.97, 1500]);
    assert.deepEqual(detalle.map((d) => d.precio_unitario), [0.1, 19.99, 1500]);
    assert.equal(total, 1560.27);
  });

  it('verificarDisponibilidad: inexistente 404, inactivo 400, sin stock 409', () => {
    const arts = new Map([
      [1, { id: 1, nombre: 'Mando', stock: 2, activo: 1 }],
      [2, { id: 2, nombre: 'Viejo', stock: 9, activo: 0 }],
    ]);
    assert.equal(estadoError(() => ventas.verificarDisponibilidad([{ articulo_id: 9, cantidad: 1 }], arts)), 404);
    assert.equal(estadoError(() => ventas.verificarDisponibilidad([{ articulo_id: 2, cantidad: 1 }], arts)), 400);
    assert.equal(estadoError(() => ventas.verificarDisponibilidad([{ articulo_id: 1, cantidad: 3 }], arts)), 409);
    ventas.verificarDisponibilidad([{ articulo_id: 1, cantidad: 2 }], arts);
  });
});

describe('consolas: cambio de estado', () => {
  const tecnico = { id: 7, rol: 'tecnico' };
  const admin = { id: 1, rol: 'administrador' };

  it('un técnico queda asignado; un admin no cambia el técnico', () => {
    assert.equal(consolas.calcularCambioEstado({ estadoActual: 'en_espera', nuevoEstado: 'en_proceso', usuario: tecnico }).tecnicoId, 7);
    assert.equal(consolas.calcularCambioEstado({ estadoActual: 'en_espera', nuevoEstado: 'en_proceso', usuario: admin }).tecnicoId, undefined);
  });

  it('finalizar fija la fecha, re-finalizar la conserva y volver a otro estado la limpia', () => {
    const c = (estadoActual, nuevoEstado) => consolas.calcularCambioEstado({ estadoActual, nuevoEstado, usuario: admin }).finalizacion;
    assert.equal(c('en_proceso', 'finalizado'), 'fijar');
    assert.equal(c('finalizado', 'finalizado'), 'conservar');
    assert.equal(c('finalizado', 'en_proceso'), 'limpiar');
  });

  it('genera SQL parametrizado', () => {
    const cambio = consolas.calcularCambioEstado({ estadoActual: 'en_espera', nuevoEstado: 'finalizado', usuario: tecnico });
    assert.deepEqual(consolas.sqlCambioEstado(cambio), {
      sets: 'estado = ?, tecnico_id = ?, fecha_finalizacion = NOW()',
      params: ['finalizado', 7],
    });
  });
});

describe('traducción de errores', () => {
  const caso = (err) => traducirError(err).status;
  it('mapea errores conocidos', () => {
    assert.equal(caso(Object.assign(new Error(), { code: 'ER_DUP_ENTRY', sqlMessage: "Duplicate entry 'x' for key 'uq_clientes_documento'" })), 409);
    assert.equal(traducirError({ code: 'ER_DUP_ENTRY', sqlMessage: "for key 'uq_clientes_documento'" }).mensaje, 'Ya existe un cliente con ese documento');
    assert.equal(caso({ code: 'ER_ROW_IS_REFERENCED_2' }), 409);
    assert.equal(caso({ errno: 4025, code: 'ER_CONSTRAINT_FAILED' }), 400);
    assert.equal(caso(new multer.MulterError('LIMIT_FILE_SIZE')), 400);
    assert.equal(caso(new multer.MulterError('LIMIT_FILE_COUNT')), 400);
    assert.equal(caso(new Error('detalle interno')), 500);
    assert.equal(traducirError(new Error('detalle interno')).mensaje, 'Error interno del servidor');
  });
});

describe('app sin base de datos', () => {
  it('404 en rutas desconocidas con JSON en español', async () => {
    const r = await request(app).get('/api/no-existe');
    assert.equal(r.status, 404);
    assert.deepEqual(r.body, { error: 'Ruta no encontrada' });
  });

  it('401 sin token y con token inválido', async () => {
    assert.equal((await request(app).get('/api/clientes')).status, 401);
    const r = await request(app).get('/api/clientes').set('Authorization', 'Bearer basura');
    assert.equal(r.status, 401);
    const vencido = jwt.sign({ id: 1, rol: 'administrador' }, 'otro-secreto');
    assert.equal((await request(app).get('/api/dashboard').set('Authorization', `Bearer ${vencido}`)).status, 401);
  });

  it('login valida campos obligatorios antes de consultar la BD', async () => {
    const r = await request(app).post('/api/auth/login').send({ usuario: 'admin' });
    assert.equal(r.status, 400);
    assert.match(r.body.error, /password/);
  });

  it('JSON mal formado devuelve 400 sin stack trace', async () => {
    const r = await request(app).post('/api/auth/login').set('Content-Type', 'application/json').send('{"usuario":');
    assert.equal(r.status, 400);
    assert.equal(Object.keys(r.body).join(), 'error');
  });
});

describe('subida: verificación del contenido real (magic bytes)', () => {
  const { tipoReal } = require('../src/middleware/upload');
  it('reconoce JPG, PNG y WEBP y rechaza texto o cabeceras cortas', () => {
    assert.equal(tipoReal(Buffer.from([0xff, 0xd8, 0xff, 0xe0])), 'image/jpeg');
    assert.equal(tipoReal(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])), 'image/png');
    assert.equal(tipoReal(Buffer.from('RIFF\u0000\u0000\u0000\u0000WEBP', 'latin1')), 'image/webp');
    assert.equal(tipoReal(Buffer.from('hola, soy texto')), null);
    assert.equal(tipoReal(Buffer.from([0xff, 0xd8])), null);
    assert.equal(tipoReal(Buffer.alloc(0)), null);
  });
});

// ---------------------------------------------------------------------------
// Fase 2
// ---------------------------------------------------------------------------
describe('fase 2: validaciones nuevas', () => {
  const { datosRepuesto } = require('../src/controllers/repuestos.controller');
  const { datosNegocio } = require('../src/controllers/negocio.controller');
  const { datosGaleria } = require('../src/controllers/galeria.controller');
  const { datosReparacion } = require('../src/controllers/consolas.controller');

  it('normalizarDocumento quita espacios, puntos y guiones', () => {
    assert.equal(v.normalizarDocumento(' 1.012.345-678 '), '1012345678');
    assert.equal(v.normalizarDocumento('10 12 34'), '101234');
    assert.equal(v.normalizarDocumento('...'), null);
    assert.equal(v.normalizarDocumento(''), null);
  });

  it('datosCliente guarda el documento normalizado', () => {
    assert.equal(datosCliente({ nombre: 'Ana', documento: '1.012.345.678' }).documento, '1012345678');
  });

  it('montoOpcional: vacío → null, ≥ 0 con 2 decimales', () => {
    assert.equal(v.montoOpcional('', 'costo'), null);
    assert.equal(v.montoOpcional('0', 'costo'), 0);
    assert.equal(v.montoOpcional('12.5', 'costo'), 12.5);
    for (const malo of [-1, 'abc', '1.234']) assert.equal(estadoError(() => v.montoOpcional(malo, 'costo')), 400);
  });

  it('urlOpcional exige http(s)', () => {
    assert.equal(v.urlOpcional('https://instagram.com/taller', 'instagram'), 'https://instagram.com/taller');
    assert.equal(v.urlOpcional('', 'instagram'), null);
    assert.equal(estadoError(() => v.urlOpcional('javascript:alert(1)', 'instagram')), 400);
  });

  it('datosRepuesto: cantidad entero > 0, costo ≥ 0, estado del ENUM; por defecto pendiente', () => {
    const d = datosRepuesto({ nombre: 'Ventilador', cantidad: '2' });
    assert.deepEqual(d, { nombre: 'Ventilador', cantidad: 2, costo_estimado: null, estado: 'pendiente', notas: null });
    assert.equal(estadoError(() => datosRepuesto({ nombre: 'X', cantidad: 0 })), 400);
    assert.equal(estadoError(() => datosRepuesto({ nombre: 'X', cantidad: 1.5 })), 400);
    assert.equal(estadoError(() => datosRepuesto({ nombre: 'X', cantidad: 1, costo_estimado: -1 })), 400);
    assert.equal(estadoError(() => datosRepuesto({ nombre: 'X', cantidad: 1, estado: 'perdido' })), 400);
    assert.equal(estadoError(() => datosRepuesto({ cantidad: 1 })), 400);
    assert.deepEqual(datosRepuesto({ estado: 'pedido' }, { parcial: true }), { estado: 'pedido' });
  });

  it('datosReparacion valida el ENUM y necesita_repuestos opcional', () => {
    assert.equal(estadoError(() => datosReparacion({ resultado_reparacion: 'arreglada' })), 400);
    assert.equal(estadoError(() => datosReparacion({})), 400);
    const d = datosReparacion({ resultado_reparacion: 'no_reparable', diagnostico_resultado: ' Placa dañada ' });
    assert.deepEqual(d, { resultado: 'no_reparable', diagnostico: 'Placa dañada', necesitaRepuestos: undefined });
    assert.equal(datosReparacion({ resultado_reparacion: 'reparada', necesita_repuestos: 'true' }).necesitaRepuestos, true);
  });

  it('datosNegocio: whatsapp solo dígitos (limpia +, espacios y guiones), vacío → null', () => {
    assert.equal(datosNegocio({ whatsapp: '+57 300-123 4567' }).whatsapp, '573001234567');
    assert.equal(datosNegocio({ whatsapp: '' }).whatsapp, null);
    assert.equal(estadoError(() => datosNegocio({ whatsapp: '300abc' })), 400);
    assert.equal(estadoError(() => datosNegocio({ nombre: '' })), 400);
    assert.deepEqual(datosNegocio({}), {});
  });

  it('datosGaleria: orden entero ≥ 0 y visible booleano', () => {
    assert.deepEqual(datosGaleria({ orden: '3', visible: '0' }), { orden: 3, visible: 0 });
    assert.equal(estadoError(() => datosGaleria({ orden: '-1' })), 400);
    assert.equal(estadoError(() => datosGaleria({ visible: 'tal vez' })), 400);
  });
});

describe('fase 2: privacidad de la consulta pública (sin BD)', () => {
  const publico = require('../src/services/publico.service');

  it('primerNombre y serieFinal', () => {
    assert.equal(publico.primerNombre('  Juan Carlos Pérez '), 'Juan');
    assert.equal(publico.serieFinal('SN-ABCDEF1234'), '1234');
    assert.equal(publico.serieFinal('1234'), null); // mostrarla sería mostrar la serie completa
    assert.equal(publico.serieFinal(null), null);
  });

  it('consolaPublica solo devuelve campos permitidos y omite procedimientos internos', () => {
    const consola = {
      id: 1, cliente_id: 9, marca: 'Sony', modelo: 'PS5', color: 'Blanco', numero_serie: 'SN-ABCDEF1234',
      accesorios: 'Mando', falla_reportada: 'No enciende', observaciones_recepcion: 'SECRETO', estado: 'en_proceso',
      recibido_por: 2, tecnico_id: 3, fecha_ingreso: 'f1', fecha_finalizacion: null, resultado_reparacion: 'pendiente',
      diagnostico_resultado: 'Fuente', necesita_repuestos: 1, documento: '123', telefono: '300', email: 'a@b.co',
    };
    const r = publico.consolaPublica(consola, {
      repuestos: [{ id: 5, consola_id: 1, nombre: 'Fuente', cantidad: 1, costo_estimado: 50, estado: 'pedido', notas: 'interna', registrado_por: 3 }],
      fotos: [{ id: 1, consola_id: 1, ruta: '/uploads/a.png', descripcion: null, subido_por: 2 }],
      procedimientos: [
        { id: 10, consola_id: 1, descripcion: 'Limpieza', estado_resultante: 'en_proceso', interno: 0, creado_en: 'f2', tecnico_id: 3 },
        { id: 11, consola_id: 1, descripcion: 'NOTA INTERNA', estado_resultante: 'en_proceso', interno: 1, creado_en: 'f3' },
      ],
      fotosProcedimiento: [{ procedimiento_id: 10, ruta: '/uploads/p.png' }, { procedimiento_id: 11, ruta: '/uploads/i.png' }],
    });
    assert.deepEqual(Object.keys(r).sort(), [
      'color', 'diagnostico_resultado', 'estado', 'falla_reportada', 'fecha_finalizacion', 'fecha_ingreso', 'fotos',
      'id', 'marca', 'modelo', 'necesita_repuestos', 'procedimientos', 'repuestos', 'resultado_reparacion', 'serie_final',
    ]);
    assert.equal(r.serie_final, '1234');
    assert.equal(r.necesita_repuestos, true);
    assert.deepEqual(r.repuestos, [{ nombre: 'Fuente', cantidad: 1, costo_estimado: 50, estado: 'pedido' }]);
    assert.deepEqual(r.fotos, [{ ruta: '/uploads/a.png', descripcion: null }]);
    assert.deepEqual(r.procedimientos, [
      { descripcion: 'Limpieza', estado_resultante: 'en_proceso', creado_en: 'f2', fotos: ['/uploads/p.png'] },
    ]);
    const json = JSON.stringify(r);
    for (const prohibido of ['SECRETO', 'NOTA INTERNA', 'SN-ABCDEF1234', 'interna', 'i.png', 'a@b.co']) {
      assert.ok(!json.includes(prohibido), `no debe incluir ${prohibido}`);
    }
  });
});

describe('fase 2: subida de videos (magic bytes)', () => {
  const { tipoReal } = require('../src/middleware/upload');
  it('reconoce MP4 (ftyp en bytes 4-7) y WEBM (1A45DFA3)', () => {
    assert.equal(tipoReal(Buffer.concat([Buffer.from([0, 0, 0, 0x18]), Buffer.from('ftypmp42')])), 'video/mp4');
    assert.equal(tipoReal(Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81])), 'video/webm');
    assert.equal(tipoReal(Buffer.from('no soy un video mp4')), null);
  });
});

describe('fase 2: límite de intentos', () => {
  const { crearLimitador, limiteConsulta } = require('../src/middleware/limiteIntentos');

  it('permite `maximo` peticiones por IP y luego responde 429; reiniciar() lo limpia', () => {
    const lim = crearLimitador({ maximo: 2, ventanaMs: 60000, mensaje: 'Demasiadas' });
    const res = { setHeader() {} };
    const pasar = (ip) => {
      let e;
      lim({ ip }, res, (err) => { e = err; });
      return e;
    };
    assert.equal(pasar('1.1.1.1'), undefined);
    assert.equal(pasar('1.1.1.1'), undefined);
    assert.equal(pasar('1.1.1.1').status, 429);
    assert.equal(pasar('2.2.2.2'), undefined); // otra IP tiene su propio contador
    lim.reiniciar();
    assert.equal(pasar('1.1.1.1'), undefined);
  });

  it('POST /api/publico/consulta: 10 intentos y el 11.º → 429 con el mensaje de la especificación', async () => {
    limiteConsulta.reiniciar();
    for (let i = 0; i < 10; i += 1) {
      // Sin documento → 400 sin tocar la BD, pero cuenta como intento.
      assert.equal((await request(app).post('/api/publico/consulta').send({})).status, 400);
    }
    const r = await request(app).post('/api/publico/consulta').send({ documento: '123' });
    assert.equal(r.status, 429);
    assert.deepEqual(r.body, { error: 'Demasiadas consultas. Intenta de nuevo en unos minutos.' });
    assert.ok(Number(r.headers['retry-after']) > 0);
    limiteConsulta.reiniciar();
  });

  it('las rutas de administración nuevas exigen autenticación (401)', async () => {
    for (const [metodo, ruta] of [['get', '/api/negocio'], ['put', '/api/negocio'], ['get', '/api/galeria'],
      ['post', '/api/galeria'], ['put', '/api/consolas/1/reparacion'], ['get', '/api/consolas/1/repuestos']]) {
      assert.equal((await request(app)[metodo](ruta)).status, 401, `${metodo} ${ruta}`);
    }
  });
});
