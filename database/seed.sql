-- =====================================================================
-- Consolas App - Datos iniciales y de ejemplo
-- Ejecutar DESPUES de schema.sql (que deja las tablas vacias).
-- Hashes bcrypt reales (cost 10) generados con bcryptjs y verificados
-- con compareSync.
--   admin    / Admin123*     (administrador)
--   tecnico  / Tecnico123*   (tecnico)
--   operario / Operario123*  (operario)
-- CAMBIA estas contrasenas en cualquier entorno que no sea de desarrollo.
-- =====================================================================

USE consolas_db;
SET NAMES utf8mb4;

START TRANSACTION;

-- Usuarios ------------------------------------------------------------
INSERT INTO usuarios (id, nombre, usuario, password_hash, rol, activo) VALUES
  (1, 'Administrador',     'admin',    '$2b$10$kuFRzwewbpo6HsMrLRBrE.BskVo7U83UT1JK62wZLsnFS44mWN0ay', 'administrador', 1),
  (2, 'Carlos Tecnico',    'tecnico',  '$2b$10$tPGGuTZDsmJ7WQOLRK5mdudZK86pi2oF1.p3o1Vb.LP6230hzlgPC', 'tecnico',       1),
  (3, 'Laura Operaria',    'operario', '$2b$10$vE4axmlvbwAtIjf6.4H4cuAqw09D6GwD9xCFa1th5q2CxHipcOhw2', 'operario',      1);

-- Clientes ------------------------------------------------------------
INSERT INTO clientes (id, nombre, documento, telefono, email, direccion) VALUES
  (1, 'Juan Perez',     '1012345678', '3001234567', 'juan.perez@example.com', 'Calle 10 # 5-20'),
  (2, 'Maria Gomez',    NULL,         '3109876543', 'maria.gomez@example.com', NULL);

-- Consolas ------------------------------------------------------------
-- 1: recien recibida, sin tecnico asignado (en_espera)
-- 2: en reparacion, asignada al tecnico (en_proceso)
INSERT INTO consolas (id, cliente_id, marca, modelo, numero_serie, color, accesorios, falla_reportada,
                      observaciones_recepcion, estado, recibido_por, tecnico_id, fecha_ingreso, fecha_finalizacion,
                      resultado_reparacion, diagnostico_resultado, necesita_repuestos) VALUES
  (1, 1, 'Sony',     'PlayStation 5',   'CFI1015A-0001234', 'Blanco',
      'Control DualSense, cable de poder, cable HDMI',
      'Se apaga sola despues de 10 minutos de juego.',
      'Rayones leves en la tapa lateral derecha.',
      'en_espera', 3, NULL, NOW() - INTERVAL 1 DAY, NULL,
      'pendiente', NULL, 0),
  (2, 2, 'Nintendo', 'Switch OLED',     'XTW70012345678',   'Neon',
      'Joy-Con izquierdo y derecho, dock',
      'Joy-Con izquierdo con drift.',
      'Sin golpes visibles.',
      'en_proceso', 1, 2, NOW() - INTERVAL 3 DAY, NULL,
      'pendiente', 'El joystick izquierdo esta desgastado; se reemplazara cuando llegue el repuesto.', 1);

-- Procedimientos ------------------------------------------------------
-- El procedimiento 2 es una nota interna (interno = 1): no se muestra en la consulta publica.
INSERT INTO procedimientos (id, consola_id, tecnico_id, descripcion, estado_resultante, interno, creado_en) VALUES
  (1, 2, 2, 'Diagnostico: joystick analogico izquierdo desgastado. Se solicita repuesto y se limpia el modulo.',
      'en_proceso', 0, NOW() - INTERVAL 2 DAY),
  (2, 2, 2, 'Nota interna: pedir el joystick al proveedor habitual, el otro tarda mas de una semana.',
      'en_proceso', 1, NOW() - INTERVAL 2 DAY + INTERVAL 1 HOUR);

-- Repuestos (fase 2) ----------------------------------------------------
INSERT INTO repuestos_consola (id, consola_id, nombre, cantidad, costo_estimado, estado, notas, registrado_por) VALUES
  (1, 2, 'Joystick analogico para Joy-Con', 1, 35000.00, 'pedido', 'Pedido al proveedor, llega en 3 dias.', 2);

-- Articulos -----------------------------------------------------------
INSERT INTO articulos (id, nombre, descripcion, categoria, precio, stock, foto, activo) VALUES
  (1, 'Control DualSense',        'Control inalambrico original para PS5, color blanco.',                     'Controles',    349900.00, 8,  NULL, 1),
  (2, 'Cable HDMI 2.1',           'Cable HDMI 2.1 de 2 metros, compatible 4K/120Hz.',                          'Cables',        39900.00, 25, NULL, 1),
  (3, 'Pasta termica',            'Pasta termica de alto rendimiento, jeringa de 4 g.',                        'Repuestos',     25000.00, 15, NULL, 1),
  (4, 'PS4 Slim reacondicionada', 'PlayStation 4 Slim 500 GB reacondicionada, con un control y garantia de 3 meses.', 'Consolas', 1150000.00, 2, NULL, 1);

-- Negocio (fase 2): fila unica id = 1, editable desde "Pagina web" ----
INSERT INTO negocio (id, nombre, eslogan, descripcion, direccion, telefono, whatsapp, email, horario,
                     facebook, instagram, tiktok, logo) VALUES
  (1, 'Consolas Pro Service',
      'Tu consola en las mejores manos',
      'Taller especializado en mantenimiento y reparacion de consolas PlayStation, Xbox y Nintendo. Diagnostico honesto, repuestos de calidad y seguimiento del estado de tu equipo en linea. Tambien vendemos controles, accesorios y consolas reacondicionadas.',
      'Calle 00 # 00-00, Local 1',
      '3000000000',
      '573000000000',
      'contacto@example.com',
      'Lunes a sábado 9:00 a. m. - 7:00 p. m.',
      NULL, NULL, NULL, NULL);

-- Galeria: vacia (requiere archivos reales en backend/uploads/).

COMMIT;
