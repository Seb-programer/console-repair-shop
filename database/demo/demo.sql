-- =====================================================================
-- Consolas App - Datos de DEMOSTRACION (video de portafolio)
-- Base: consolas_demo  (NUNCA consolas_db)
-- Ejecutar DESPUES de schema.sql con el nombre de base cambiado a
-- consolas_demo. Sustituye a seed.sql. Se puede ejecutar varias veces:
-- vacia las tablas de consolas_demo y las vuelve a llenar.
-- Fechas relativas a NOW(): la demo siempre parece "reciente".
-- Datos inventados: nombres, documentos 100000000x, telefonos 300000xxxx,
-- correos @example.com. Fotos: /uploads/demo-* (carpeta database/demo/fotos).
--
-- Usuarios (hashes bcrypt reales, cost 10, verificados con compareSync):
--   admin    / Demo1234  (administrador) - Camilo Vargas
--   tecnico  / Demo1234  (tecnico)       - Andrés Rojas
--   operario / Demo1234  (operario)      - Valentina Díaz
-- =====================================================================

USE consolas_demo;
SET NAMES utf8mb4;

-- Vaciar (orden indiferente con FK desactivadas; TRUNCATE reinicia AUTO_INCREMENT)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE detalle_venta;
TRUNCATE TABLE ventas;
TRUNCATE TABLE galeria;
TRUNCATE TABLE repuestos_consola;
TRUNCATE TABLE fotos_procedimiento;
TRUNCATE TABLE procedimientos;
TRUNCATE TABLE fotos_consola;
TRUNCATE TABLE consolas;
TRUNCATE TABLE articulos;
TRUNCATE TABLE clientes;
TRUNCATE TABLE negocio;
TRUNCATE TABLE usuarios;
SET FOREIGN_KEY_CHECKS = 1;

START TRANSACTION;

-- Usuarios --------------------------------------------------------------
INSERT INTO usuarios (id, nombre, usuario, password_hash, rol, activo, creado_en) VALUES
  (1, 'Camilo Vargas',  'admin',    '$2b$10$TVTRjUU.Z9y1Gs22Aw9pA.kEMbB5NAyybRxyt7hItON3qoSZddTuG', 'administrador', 1, NOW() - INTERVAL 60 DAY),
  (2, 'Andrés Rojas',   'tecnico',  '$2b$10$8wvRNvNLQRMLGrBl5F8VOuPL/M5pl.HSPAH887/b17X90mAFmJIS6', 'tecnico',       1, NOW() - INTERVAL 60 DAY),
  (3, 'Valentina Díaz', 'operario', '$2b$10$fYREBr.Dk0tG.g3P9fdugu9kWM8cUZawlc71e5m17.3xSZdGCm4Y6', 'operario',      1, NOW() - INTERVAL 45 DAY);

-- Negocio (fila unica id = 1) --------------------------------------------
INSERT INTO negocio (id, nombre, eslogan, descripcion, direccion, telefono, whatsapp, email, horario,
                     facebook, instagram, tiktok, logo) VALUES
  (1, 'Consolas Pro Service',
      'Tu consola en las mejores manos',
      'Somos un taller especializado en mantenimiento y reparación de consolas PlayStation, Xbox y Nintendo en Bogotá. Hacemos diagnóstico honesto, usamos repuestos de calidad y te mostramos el avance de tu equipo en línea, con fotos de cada procedimiento. También vendemos controles, accesorios y consolas reacondicionadas con garantía.',
      'Cra. 13 # 00-00, Local 104, Chapinero, Bogotá',
      '3000000000',
      '573000000000',
      'contacto@example.com',
      'Lunes a viernes 9:00 a. m. – 7:00 p. m. · Sábados 9:00 a. m. – 3:00 p. m.',
      'https://www.facebook.com/example',
      'https://www.instagram.com/example',
      'https://www.tiktok.com/@example',
      '/uploads/demo-logo.png');

-- Clientes --------------------------------------------------------------
INSERT INTO clientes (id, nombre, documento, telefono, email, direccion, creado_en) VALUES
  (1, 'Laura Martínez Gómez',    '1000000001', '3000000101', 'laura.martinez@example.com',  'Cra. 15 # 00-24, Usaquén, Bogotá',   NOW() - INTERVAL 21 DAY),
  (2, 'Juan Camilo Pérez',       '1000000002', '3000000102', 'juan.perez@example.com',      'Calle 72 # 00-15, Bogotá',           NOW() - INTERVAL 12 DAY),
  (3, 'Daniela Ospina Restrepo', '1000000003', '3000000103', 'daniela.ospina@example.com',  NULL,                                 NOW() - INTERVAL 17 DAY),
  (4, 'Carlos Andrés Muñoz',     '1000000004', '3000000104', 'carlos.munoz@example.com',    'Av. Suba # 00-40, Bogotá',           NOW() - INTERVAL 9 DAY),
  (5, 'Mariana Castillo',        '1000000005', '3000000105', 'mariana.castillo@example.com', NULL,                                NOW() - INTERVAL 15 DAY),
  (6, 'Felipe Ramírez Ortiz',    '1000000006', '3000000106', NULL,                          'Calle 26 # 00-10, Teusaquillo',      NOW() - INTERVAL 3 DAY),
  (7, 'Sofía Herrera Peña',      '1000000007', '3000000107', 'sofia.herrera@example.com',   'Cra. 7 # 00-55, Bogotá',             NOW() - INTERVAL 4 DAY),
  (8, 'Nicolás Gutiérrez',       NULL,         '3000000108', NULL,                          NULL,                                 NOW() - INTERVAL 1 DAY);

-- Consolas --------------------------------------------------------------
-- en_espera: 6, 7, 9 | en_proceso: 1, 4, 8 | finalizado: 2, 3, 5, 10
INSERT INTO consolas (id, cliente_id, marca, modelo, numero_serie, color, accesorios, falla_reportada,
                      observaciones_recepcion, estado, recibido_por, tecnico_id, fecha_ingreso, fecha_finalizacion,
                      resultado_reparacion, diagnostico_resultado, necesita_repuestos) VALUES
  (1, 1, 'Sony', 'PlayStation 5', 'CFI1015A-S01K4827', 'Blanco',
      'Control DualSense, cable de poder, base vertical',
      'No da imagen por HDMI. Enciende, la luz se pone blanca, pero el televisor dice "sin señal".',
      'Puerto HDMI con pines visiblemente doblados. Rayón leve en la tapa izquierda.',
      'en_proceso', 3, 2, NOW() - INTERVAL 5 DAY - INTERVAL 2 HOUR, NULL,
      'pendiente',
      'Puerto HDMI dañado: pines doblados y soldadura fracturada, probablemente por un tirón del cable. Se reemplazará el puerto en cuanto llegue el repuesto; el resto de la consola funciona correctamente.',
      1),
  (2, 2, 'Nintendo', 'Switch OLED', 'XTW70045821963', 'Blanco',
      'Joy-Con izquierdo y derecho, dock, cargador',
      'Drift en el joystick izquierdo: el personaje camina solo hacia arriba.',
      'Pantalla sin rayones. Dock en buen estado.',
      'finalizado', 3, 2, NOW() - INTERVAL 11 DAY - INTERVAL 4 HOUR, NOW() - INTERVAL 6 DAY,
      'reparada',
      'Se reemplazó el joystick analógico del Joy-Con izquierdo y se recalibraron ambos controles. Probado 30 minutos sin drift.',
      1),
  (3, 3, 'Sony', 'PlayStation 4 Slim', 'CUH2215A-E07731', 'Negro',
      'Cable de poder',
      'Se sobrecalienta y el ventilador suena muy fuerte; a veces se apaga sola jugando.',
      'Mucho polvo visible en las rejillas de ventilación.',
      'finalizado', 3, 2, NOW() - INTERVAL 16 DAY - INTERVAL 1 HOUR, NOW() - INTERVAL 12 DAY,
      'reparada',
      'Disipador obstruido con polvo y pasta térmica seca. Se hizo limpieza profunda y cambio de pasta térmica. En prueba de estrés la temperatura máxima bajó de 89 °C a 68 °C.',
      1),
  (4, 4, 'Microsoft', 'Xbox Series X', '0F00382745219', 'Negro',
      'Control inalámbrico, cable HDMI',
      'No lee discos: el disco gira pero muestra "disco no reconocido". Los juegos digitales funcionan.',
      'Sin golpes. El cliente trae dos discos de prueba.',
      'en_proceso', 1, 2, NOW() - INTERVAL 8 DAY - INTERVAL 5 HOUR, NULL,
      'pendiente',
      'El lector óptico gira pero el láser no logra enfocar: lente desgastado. Se recomienda reemplazar el lector completo.',
      1),
  (5, 5, 'Microsoft', 'Xbox One', '0412559833017', 'Negro',
      'Cable de poder',
      'No enciende. Dejó de funcionar después de un apagón.',
      'Fuente externa incluida. Olor a quemado leve al abrir.',
      'finalizado', 3, 1, NOW() - INTERVAL 14 DAY - INTERVAL 3 HOUR, NOW() - INTERVAL 9 DAY,
      'no_reparable',
      'La fuente funciona, pero hay un corto en la línea principal de la APU causado por la descarga eléctrica. La reparación no es viable: el costo supera el valor de la consola. Se devuelve armada y sin costo de reparación.',
      0),
  (6, 6, 'Sony', 'PS Vita', 'PCH2010-4419820', 'Negro',
      'Cargador, estuche',
      'La pantalla táctil no responde en la parte inferior.',
      'Mica protectora rayada.',
      'en_espera', 3, NULL, NOW() - INTERVAL 2 DAY - INTERVAL 1 HOUR, NULL,
      'pendiente', NULL, 0),
  (7, 7, 'Nintendo', 'Switch', 'XAW10077120458', 'Gris',
      'Consola sin Joy-Con, cargador original',
      'No carga: el indicador de batería no aparece al conectar el cargador.',
      'Puerto USB-C con algo de suciedad.',
      'en_espera', 3, NULL, NOW() - INTERVAL 1 DAY - INTERVAL 3 HOUR, NULL,
      'pendiente', NULL, 0),
  (8, 7, 'Microsoft', 'Xbox Series S', '0A11274409352', 'Blanco',
      'Control inalámbrico, cable de poder',
      'Ventilador ruidoso: hace un zumbido fuerte al arrancar los juegos.',
      'Consola en buen estado físico.',
      'en_proceso', 3, 2, NOW() - INTERVAL 3 DAY - INTERVAL 6 HOUR, NULL,
      'pendiente',
      'El rodamiento del ventilador está desgastado. Se lubricó de forma temporal; se recomienda cambiar el ventilador.',
      1),
  (9, 8, 'Sony', 'PlayStation 4 Pro', 'CUH7215B-B01563', 'Negro',
      'Control DualShock 4, cable de poder',
      'Se apaga sola después de una hora de juego y el ventilador suena como turbina.',
      NULL,
      'en_espera', 1, NULL, NOW() - INTERVAL 4 HOUR, NULL,
      'pendiente', NULL, 0),
  (10, 1, 'Nintendo', 'Switch Lite', 'XJW10031184622', 'Turquesa',
      'Cargador',
      'Drift en el joystick izquierdo.',
      'Carcasa con desgaste normal de uso.',
      'finalizado', 3, 2, NOW() - INTERVAL 20 DAY - INTERVAL 2 HOUR, NOW() - INTERVAL 17 DAY,
      'reparada',
      'Se cambió el joystick analógico izquierdo. Funciona perfectamente.',
      1);

-- Fotos de recepcion --------------------------------------------------------
INSERT INTO fotos_consola (id, consola_id, ruta, descripcion, subido_por, creado_en) VALUES
  (1,  1, '/uploads/demo-consola-ps5.jpg',            'Vista general al recibirla',        3, NOW() - INTERVAL 5 DAY - INTERVAL 2 HOUR),
  (2,  1, '/uploads/demo-consola-ps5-hdmi.jpg',       'Puerto HDMI con pines doblados',    3, NOW() - INTERVAL 5 DAY - INTERVAL 2 HOUR),
  (3,  2, '/uploads/demo-consola-switch-oled.jpg',    'Consola con sus dos Joy-Con',       3, NOW() - INTERVAL 11 DAY - INTERVAL 4 HOUR),
  (4,  3, '/uploads/demo-consola-ps4-slim.jpg',       'Estado al recibirla',               3, NOW() - INTERVAL 16 DAY - INTERVAL 1 HOUR),
  (5,  4, '/uploads/demo-consola-xbox-series-x.jpg',  'Vista general',                     1, NOW() - INTERVAL 8 DAY - INTERVAL 5 HOUR),
  (6,  5, '/uploads/demo-consola-xbox-one.jpg',       'Estado al recibirla',               3, NOW() - INTERVAL 14 DAY - INTERVAL 3 HOUR),
  (7,  6, '/uploads/demo-consola-ps-vita.jpg',        'Vista frontal',                     3, NOW() - INTERVAL 2 DAY - INTERVAL 1 HOUR),
  (8,  7, '/uploads/demo-consola-switch.jpg',         'Consola sin Joy-Con',               3, NOW() - INTERVAL 1 DAY - INTERVAL 3 HOUR),
  (9,  8, '/uploads/demo-consola-xbox-series-s.jpg',  'Vista general',                     3, NOW() - INTERVAL 3 DAY - INTERVAL 6 HOUR),
  (10, 9, '/uploads/demo-consola-ps4-pro.jpg',        'Estado al recibirla',               1, NOW() - INTERVAL 4 HOUR),
  (11, 10, '/uploads/demo-consola-switch-lite.jpg',   'Estado al recibirla',               3, NOW() - INTERVAL 20 DAY - INTERVAL 2 HOUR);

-- Procedimientos ----------------------------------------------------------
-- interno = 1: nota interna, no aparece en la consulta publica.
INSERT INTO procedimientos (id, consola_id, tecnico_id, descripcion, estado_resultante, interno, creado_en) VALUES
  -- Consola 1: PS5 de Laura (escena de la consulta publica)
  (1, 1, 2, 'Revisión inicial: la consola enciende y el ventilador gira, pero no hay señal de video en ningún televisor. Se desarma para inspeccionar la placa.',
      'en_proceso', 0, NOW() - INTERVAL 4 DAY - INTERVAL 3 HOUR),
  (2, 1, 2, 'Diagnóstico: el puerto HDMI tiene pines doblados y una soldadura fracturada. Hay que reemplazar el puerto; ya pedimos el repuesto.',
      'en_proceso', 0, NOW() - INTERVAL 3 DAY - INTERVAL 5 HOUR),
  (3, 1, 2, 'Nota interna: pedir el puerto HDMI original al proveedor de Chapinero; el genérico que tenemos en stock falló en la última prueba. Revisar también el chip retimer antes de cerrar.',
      'en_proceso', 1, NOW() - INTERVAL 3 DAY - INTERVAL 4 HOUR),
  (4, 1, 2, 'Mientras llega el repuesto se hizo limpieza del ventilador y del disipador. Temperaturas normales en la prueba.',
      'en_proceso', 0, NOW() - INTERVAL 1 DAY - INTERVAL 2 HOUR),
  -- Consola 2: Switch OLED (finalizada, reparada)
  (5, 2, 2, 'Diagnóstico: joystick analógico izquierdo desgastado. Se pide el repuesto.',
      'en_proceso', 0, NOW() - INTERVAL 10 DAY),
  (6, 2, 2, 'Se reemplazó el joystick izquierdo y se calibraron ambos Joy-Con. Prueba de 30 minutos sin drift. Lista para entregar.',
      'finalizado', 0, NOW() - INTERVAL 6 DAY),
  -- Consola 3: PS4 Slim (finalizada, reparada)
  (7, 3, 2, 'Se desarma: disipador obstruido con polvo y pasta térmica completamente seca.',
      'en_proceso', 0, NOW() - INTERVAL 15 DAY),
  (8, 3, 2, 'Limpieza profunda, cambio de pasta térmica y prueba de estrés de 30 minutos: 68 °C máximo. Ventilador silencioso.',
      'finalizado', 0, NOW() - INTERVAL 12 DAY),
  -- Consola 4: Xbox Series X (en proceso)
  (9, 4, 2, 'Diagnóstico: el lector gira pero el láser no enfoca. Lente desgastado; se cotiza el lector completo.',
      'en_proceso', 0, NOW() - INTERVAL 7 DAY),
  (10, 4, 2, 'Nota interna: el cliente pregunta si conviene cambiar solo el láser. Cotizarle ambas opciones; recomendamos el lector completo.',
      'en_proceso', 1, NOW() - INTERVAL 6 DAY - INTERVAL 20 HOUR),
  -- Consola 5: Xbox One (finalizada, no reparable)
  (11, 5, 1, 'Revisión: la fuente entrega voltaje correcto. Se detecta corto en la línea principal de la APU.',
      'en_proceso', 0, NOW() - INTERVAL 12 DAY),
  (12, 5, 1, 'Se confirma daño en la APU por la descarga eléctrica. La reparación no es viable económicamente; se informa al cliente y se devuelve la consola armada.',
      'finalizado', 0, NOW() - INTERVAL 9 DAY),
  -- Consola 8: Xbox Series S (en proceso)
  (13, 8, 2, 'El ventilador tiene el rodamiento desgastado. Se lubricó de forma temporal y se pidió un ventilador nuevo.',
      'en_proceso', 0, NOW() - INTERVAL 2 DAY - INTERVAL 4 HOUR),
  (14, 8, 2, 'Nota interna: la cliente autorizó el cambio del ventilador por WhatsApp.',
      'en_proceso', 1, NOW() - INTERVAL 2 DAY - INTERVAL 1 HOUR),
  -- Consola 10: Switch Lite de Laura (finalizada, reparada)
  (15, 10, 2, 'Se cambió el joystick analógico izquierdo y se calibró. Prueba superada.',
      'finalizado', 0, NOW() - INTERVAL 17 DAY);

INSERT INTO fotos_procedimiento (id, procedimiento_id, ruta, creado_en) VALUES
  (1, 1,  '/uploads/demo-proc-ps5-desarme.jpg',      NOW() - INTERVAL 4 DAY - INTERVAL 3 HOUR),
  (2, 2,  '/uploads/demo-proc-ps5-hdmi.jpg',         NOW() - INTERVAL 3 DAY - INTERVAL 5 HOUR),
  (3, 4,  '/uploads/demo-proc-ps5-limpieza.jpg',     NOW() - INTERVAL 1 DAY - INTERVAL 2 HOUR),
  (4, 6,  '/uploads/demo-proc-switch-joystick.jpg',  NOW() - INTERVAL 6 DAY),
  (5, 8,  '/uploads/demo-proc-ps4-pasta.jpg',        NOW() - INTERVAL 12 DAY),
  (6, 9,  '/uploads/demo-proc-xbox-lector.jpg',      NOW() - INTERVAL 7 DAY),
  (7, 11, '/uploads/demo-proc-xbox-one-placa.jpg',   NOW() - INTERVAL 12 DAY);

-- Repuestos -------------------------------------------------------------
INSERT INTO repuestos_consola (id, consola_id, nombre, cantidad, costo_estimado, estado, notas, registrado_por, creado_en) VALUES
  (1, 1, 'Puerto HDMI 2.1 para PS5',            1,  45000.00, 'pedido',     'Pedido al proveedor; llega en 2 días hábiles.', 2, NOW() - INTERVAL 3 DAY - INTERVAL 5 HOUR),
  (2, 2, 'Joystick analógico para Joy-Con',     1,  35000.00, 'conseguido', NULL,                                            2, NOW() - INTERVAL 10 DAY),
  (3, 3, 'Pasta térmica de alto rendimiento',   1,  25000.00, 'conseguido', 'Tomada del inventario del taller.',             2, NOW() - INTERVAL 15 DAY),
  (4, 4, 'Lector óptico completo Xbox Series X', 1, 180000.00, 'pedido',     'Llega en 5 días hábiles.',                      2, NOW() - INTERVAL 7 DAY),
  (5, 4, 'Cable flex del lector',               1,  15000.00, 'pendiente',  'Confirmar si el cliente aprueba el cambio.',    2, NOW() - INTERVAL 7 DAY),
  (6, 8, 'Ventilador para Xbox Series S',       1,  65000.00, 'pendiente',  NULL,                                            2, NOW() - INTERVAL 2 DAY - INTERVAL 4 HOUR),
  (7, 10, 'Joystick analógico para Switch Lite', 1, 35000.00, 'conseguido', NULL,                                            2, NOW() - INTERVAL 19 DAY);

-- Catalogo (stock = existencias DESPUES de las ventas de abajo) -------------
INSERT INTO articulos (id, nombre, descripcion, categoria, precio, stock, foto, activo, creado_en) VALUES
  (1,  'Control DualSense blanco',           'Control inalámbrico original para PS5 con retroalimentación háptica y gatillos adaptativos.', 'Controles', 349900.00, 4, '/uploads/demo-art-dualsense.jpg', 1, NOW() - INTERVAL 40 DAY),
  (2,  'Control inalámbrico Xbox',           'Control para Xbox Series X|S, Xbox One y PC. Conexión Bluetooth y USB-C.',                     'Controles', 289900.00, 3, '/uploads/demo-art-control-xbox.jpg', 1, NOW() - INTERVAL 40 DAY),
  (3,  'Par de Joy-Con neón',                'Joy-Con izquierdo azul y derecho rojo para Nintendo Switch.',                                  'Controles', 379900.00, 0, '/uploads/demo-art-joycon.jpg', 1, NOW() - INTERVAL 38 DAY),
  (4,  'Cable HDMI 2.1 de 2 m',              'Compatible con 4K a 120 Hz y HDR. Ideal para PS5 y Xbox Series X.',                            'Cables',     39900.00, 19, '/uploads/demo-art-hdmi.jpg', 1, NOW() - INTERVAL 38 DAY),
  (5,  'Cargador USB-C para Nintendo Switch', 'Cargador de 39 W compatible con el modo TV del dock.',                                       'Cables',     69900.00, 7, '/uploads/demo-art-cargador-switch.jpg', 1, NOW() - INTERVAL 35 DAY),
  (6,  'Pasta térmica de alto rendimiento',  'Jeringa de 4 g. La misma que usamos en nuestros mantenimientos.',                             'Repuestos',  25000.00, 15, '/uploads/demo-art-pasta.jpg', 1, NOW() - INTERVAL 35 DAY),
  (7,  'Joystick analógico de reemplazo',    'Módulo analógico para Joy-Con y Switch Lite. Solución definitiva al drift.',                  'Repuestos',  35000.00, 12, '/uploads/demo-art-joystick.jpg', 1, NOW() - INTERVAL 30 DAY),
  (8,  'Ventilador para PS4 Slim',           'Ventilador de reemplazo silencioso para PS4 Slim (CUH-2000).',                                'Repuestos',  79900.00, 0, '/uploads/demo-art-ventilador-ps4.jpg', 1, NOW() - INTERVAL 30 DAY),
  (9,  'PS4 Slim 500 GB reacondicionada',    'Revisada y con mantenimiento completo. Incluye un control y garantía de 3 meses.',             'Consolas reacondicionadas', 1150000.00, 1, '/uploads/demo-art-ps4-slim.jpg', 1, NOW() - INTERVAL 25 DAY),
  (10, 'Nintendo Switch Lite reacondicionada', 'Joysticks nuevos, batería revisada y garantía de 3 meses.',                                 'Consolas reacondicionadas', 790000.00, 1, '/uploads/demo-art-switch-lite.jpg', 1, NOW() - INTERVAL 25 DAY),
  (11, 'Estuche rígido para Nintendo Switch', 'Protege la consola y guarda hasta 10 juegos. Compatible con Switch y Switch OLED.',          'Accesorios',  59900.00, 9, '/uploads/demo-art-estuche-switch.jpg', 1, NOW() - INTERVAL 20 DAY),
  (12, 'Audífonos gamer con micrófono',      'Sonido envolvente y micrófono plegable. Conexión de 3,5 mm para controles y PC.',             'Accesorios', 119900.00, 5, '/uploads/demo-art-audifonos.jpg', 1, NOW() - INTERVAL 20 DAY);

-- Ventas (coherentes con el stock anterior) -------------------------------
INSERT INTO ventas (id, cliente_id, usuario_id, total, fecha) VALUES
  (1, 2,    3,  389800.00, NOW() - INTERVAL 6 DAY - INTERVAL 3 HOUR),
  (2, NULL, 3,  509700.00, NOW() - INTERVAL 2 DAY - INTERVAL 5 HOUR),
  (3, 8,    1, 1499900.00, NOW() - INTERVAL 2 HOUR);

INSERT INTO detalle_venta (id, venta_id, articulo_id, cantidad, precio_unitario, subtotal) VALUES
  (1, 1, 1,  1,  349900.00,  349900.00),
  (2, 1, 4,  1,   39900.00,   39900.00),
  (3, 2, 3,  1,  379900.00,  379900.00),
  (4, 2, 11, 1,   59900.00,   59900.00),
  (5, 2, 5,  1,   69900.00,   69900.00),
  (6, 3, 9,  1, 1150000.00, 1150000.00),
  (7, 3, 1,  1,  349900.00,  349900.00);

-- Galeria (solo fotos; la 7 esta oculta para mostrar el interruptor) -------
INSERT INTO galeria (id, tipo, ruta, titulo, descripcion, orden, visible, subido_por, creado_en) VALUES
  (1, 'foto', '/uploads/demo-galeria-mantenimiento-ps4.jpg', 'Mantenimiento de PS4',          'Limpieza profunda y cambio de pasta térmica: de 89 °C a 68 °C.',          1, 1, 1, NOW() - INTERVAL 18 DAY),
  (2, 'foto', '/uploads/demo-galeria-joystick-switch.jpg',   'Adiós al drift',                'Cambio de joystick analógico en Joy-Con y Switch Lite.',                   2, 1, 1, NOW() - INTERVAL 16 DAY),
  (3, 'foto', '/uploads/demo-galeria-hdmi-ps5.jpg',          'Puerto HDMI de PS5',            'Reemplazo del puerto con microsoldadura de precisión.',                    3, 1, 1, NOW() - INTERVAL 14 DAY),
  (4, 'foto', '/uploads/demo-galeria-xbox-series-x.jpg',     'Xbox Series X',                 'Cambio de lector óptico: vuelve a leer todos los discos.',                 4, 1, 1, NOW() - INTERVAL 12 DAY),
  (5, 'foto', '/uploads/demo-galeria-ps5-entregada.jpg',     'PS5 lista para entregar',       'Cada consola se prueba al menos dos horas antes de entregarla.',           5, 1, 1, NOW() - INTERVAL 10 DAY),
  (6, 'foto', '/uploads/demo-galeria-switch-lite.jpg',       'Switch Lite como nueva',        'Cambio de carcasa y joysticks.',                                            6, 1, 1, NOW() - INTERVAL 8 DAY),
  (7, 'foto', '/uploads/demo-galeria-taller.jpg',            'Insumos de calidad',            'Usamos pasta térmica de alto rendimiento en todos los mantenimientos.',   7, 0, 1, NOW() - INTERVAL 5 DAY);

COMMIT;
