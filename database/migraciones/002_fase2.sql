-- =====================================================================
-- Consolas App - Migracion 002: Fase 2
-- Pagina publica (negocio, galeria), reporte de reparacion (columnas en
-- consolas + repuestos_consola) y notas internas en procedimientos.
--
-- Motor: MariaDB 10.4 (XAMPP). NO borra ni recrea tablas: solo CREATE
-- TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT
-- EXISTS / INSERT IGNORE. Es idempotente: ejecutarla dos veces no cambia
-- nada ni produce errores. Los datos existentes no se modifican (las
-- columnas nuevas toman su valor por defecto).
--
-- Requisito: esquema inicial (schema.sql de la fase 1) ya aplicado.
-- Aplicar (CMD / PowerShell):
--   cmd /c "C:\xampp\mysql\bin\mysql.exe -u root consolas_db < migraciones\002_fase2.sql"
--
-- Reversion (manual, DESTRUCTIVA: pierde los datos de la fase 2; hacer
-- respaldo antes):
--   DROP TABLE IF EXISTS repuestos_consola;
--   DROP TABLE IF EXISTS galeria;
--   DROP TABLE IF EXISTS negocio;
--   ALTER TABLE procedimientos DROP INDEX IF EXISTS idx_procedimientos_consola_interno,
--                              DROP COLUMN IF EXISTS interno;
--   ALTER TABLE consolas DROP COLUMN IF EXISTS resultado_reparacion,
--                        DROP COLUMN IF EXISTS diagnostico_resultado,
--                        DROP COLUMN IF EXISTS necesita_repuestos;
-- =====================================================================

USE consolas_db;
SET NAMES utf8mb4;

-- ---------------------------------------------------------------------
-- negocio (una sola fila, id = 1; el CHECK impide crear otras)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS negocio (
  id             INT UNSIGNED NOT NULL,
  nombre         VARCHAR(150) NOT NULL,
  eslogan        VARCHAR(255) NULL DEFAULT NULL,
  descripcion    TEXT         NULL,
  direccion      VARCHAR(255) NULL DEFAULT NULL,
  telefono       VARCHAR(30)  NULL DEFAULT NULL,
  whatsapp       VARCHAR(20)  NULL DEFAULT NULL,   -- solo digitos con indicativo, ej. 573001234567
  email          VARCHAR(150) NULL DEFAULT NULL,
  horario        VARCHAR(255) NULL DEFAULT NULL,
  facebook       VARCHAR(255) NULL DEFAULT NULL,   -- URL
  instagram      VARCHAR(255) NULL DEFAULT NULL,   -- URL
  tiktok         VARCHAR(255) NULL DEFAULT NULL,   -- URL
  logo           VARCHAR(255) NULL DEFAULT NULL,   -- ruta relativa /uploads/<archivo>
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT chk_negocio_fila_unica CHECK (id = 1),
  CONSTRAINT chk_negocio_whatsapp   CHECK (whatsapp IS NULL OR whatsapp REGEXP '^[0-9]{7,15}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Fila inicial con valores de ejemplo editables (no pisa datos ya editados)
INSERT IGNORE INTO negocio (id, nombre, eslogan, descripcion, direccion, telefono, whatsapp, email, horario,
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

-- ---------------------------------------------------------------------
-- galeria (fotos y videos de trabajos para la pagina publica)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS galeria (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  tipo           ENUM('foto','video') NOT NULL,
  ruta           VARCHAR(255) NOT NULL,             -- ruta relativa /uploads/<archivo>
  titulo         VARCHAR(150) NULL DEFAULT NULL,
  descripcion    TEXT         NULL,
  orden          INT          NOT NULL DEFAULT 0,
  visible        TINYINT(1)   NOT NULL DEFAULT 1,
  subido_por     INT UNSIGNED NOT NULL,
  creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_galeria_visible_orden (visible, orden, creado_en),  -- GET /publico/galeria
  KEY idx_galeria_subido_por (subido_por),
  CONSTRAINT fk_galeria_usuario FOREIGN KEY (subido_por) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- consolas: reporte de reparacion
-- ---------------------------------------------------------------------
ALTER TABLE consolas
  ADD COLUMN IF NOT EXISTS resultado_reparacion  ENUM('pendiente','reparada','no_reparable') NOT NULL DEFAULT 'pendiente' AFTER fecha_finalizacion,
  ADD COLUMN IF NOT EXISTS diagnostico_resultado TEXT       NULL AFTER resultado_reparacion,
  ADD COLUMN IF NOT EXISTS necesita_repuestos    TINYINT(1) NOT NULL DEFAULT 0 AFTER diagnostico_resultado;

-- ---------------------------------------------------------------------
-- repuestos_consola
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS repuestos_consola (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  consola_id     INT UNSIGNED  NOT NULL,
  nombre         VARCHAR(150)  NOT NULL,
  cantidad       INT UNSIGNED  NOT NULL DEFAULT 1,
  costo_estimado DECIMAL(12,2) NULL DEFAULT NULL,
  estado         ENUM('pendiente','pedido','conseguido') NOT NULL DEFAULT 'pendiente',
  notas          TEXT          NULL,
  registrado_por INT UNSIGNED  NOT NULL,
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_repuestos_consola_consola (consola_id),
  KEY idx_repuestos_consola_registrado_por (registrado_por),
  CONSTRAINT fk_repuestos_consola_consola FOREIGN KEY (consola_id)     REFERENCES consolas (id) ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_repuestos_consola_usuario FOREIGN KEY (registrado_por) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_repuestos_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_repuestos_costo    CHECK (costo_estimado IS NULL OR costo_estimado >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- procedimientos: notas internas (el cliente no las ve)
-- ---------------------------------------------------------------------
ALTER TABLE procedimientos
  ADD COLUMN IF NOT EXISTS interno TINYINT(1) NOT NULL DEFAULT 0 AFTER estado_resultante;

-- Linea de tiempo publica: WHERE consola_id = ? AND interno = 0 ORDER BY creado_en
CREATE INDEX IF NOT EXISTS idx_procedimientos_consola_interno
  ON procedimientos (consola_id, interno, creado_en);
