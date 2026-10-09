-- =====================================================================
-- Consolas App - Esquema de base de datos
-- Motor: MariaDB 10.4 (XAMPP) / MySQL 5.7+  |  InnoDB  |  utf8mb4
-- ATENCION: este script BORRA y recrea todas las tablas de consolas_db
-- (se pierden los datos). Es idempotente: puede ejecutarse varias veces.
-- Solo para instalaciones NUEVAS. Ya incluye la migracion
-- migraciones/002_fase2.sql (no hace falta aplicarla despues). Una base
-- existente se actualiza con las migraciones, nunca con este script.
-- =====================================================================

CREATE DATABASE IF NOT EXISTS consolas_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE consolas_db;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- Orden inverso de dependencias (tablas hijas primero)
DROP TABLE IF EXISTS repuestos_consola;
DROP TABLE IF EXISTS galeria;
DROP TABLE IF EXISTS negocio;
DROP TABLE IF EXISTS detalle_venta;
DROP TABLE IF EXISTS ventas;
DROP TABLE IF EXISTS articulos;
DROP TABLE IF EXISTS fotos_procedimiento;
DROP TABLE IF EXISTS procedimientos;
DROP TABLE IF EXISTS fotos_consola;
DROP TABLE IF EXISTS consolas;
DROP TABLE IF EXISTS clientes;
DROP TABLE IF EXISTS usuarios;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- usuarios
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(100) NOT NULL,
  usuario        VARCHAR(50)  NOT NULL,
  password_hash  VARCHAR(255) NOT NULL,
  rol            ENUM('administrador','tecnico','operario') NOT NULL DEFAULT 'operario',
  activo         TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_usuarios_usuario (usuario),
  KEY idx_usuarios_rol_activo (rol, activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- clientes
-- ---------------------------------------------------------------------
CREATE TABLE clientes (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(150) NOT NULL,
  documento      VARCHAR(30)  NULL DEFAULT NULL,   -- opcional; un UNIQUE admite varios NULL
  telefono       VARCHAR(30)  NULL DEFAULT NULL,
  email          VARCHAR(150) NULL DEFAULT NULL,
  direccion      VARCHAR(255) NULL DEFAULT NULL,
  creado_en      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_clientes_documento (documento),   -- tambien sirve para buscar por documento (prefijo)
  KEY idx_clientes_nombre (nombre),                -- busqueda por nombre (LIKE 'texto%') y orden
  KEY idx_clientes_telefono (telefono)             -- busqueda por telefono
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- consolas
-- ---------------------------------------------------------------------
CREATE TABLE consolas (
  id                      INT UNSIGNED NOT NULL AUTO_INCREMENT,
  cliente_id              INT UNSIGNED NOT NULL,
  marca                   VARCHAR(60)  NOT NULL,
  modelo                  VARCHAR(100) NOT NULL,
  numero_serie            VARCHAR(100) NULL DEFAULT NULL,
  color                   VARCHAR(40)  NULL DEFAULT NULL,
  accesorios              TEXT         NULL,
  falla_reportada         TEXT         NOT NULL,
  observaciones_recepcion TEXT         NULL,
  estado                  ENUM('en_espera','en_proceso','finalizado') NOT NULL DEFAULT 'en_espera',
  recibido_por            INT UNSIGNED NOT NULL,
  tecnico_id              INT UNSIGNED NULL DEFAULT NULL,
  fecha_ingreso           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  fecha_finalizacion      DATETIME     NULL DEFAULT NULL,
  resultado_reparacion    ENUM('pendiente','reparada','no_reparable') NOT NULL DEFAULT 'pendiente',
  diagnostico_resultado   TEXT         NULL,              -- explicacion del tecnico
  necesita_repuestos      TINYINT(1)   NOT NULL DEFAULT 0,
  actualizado_en          DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_consolas_estado_fecha (estado, fecha_ingreso),  -- filtro por estado + orden; conteo del panel
  KEY idx_consolas_fecha (fecha_ingreso),                  -- "ultimas consolas" del panel
  KEY idx_consolas_cliente (cliente_id, fecha_ingreso),    -- consolas de un cliente (tambien indice de la FK)
  KEY idx_consolas_tecnico (tecnico_id),
  KEY idx_consolas_recibido_por (recibido_por),
  KEY idx_consolas_numero_serie (numero_serie),            -- busqueda q= por numero de serie
  CONSTRAINT fk_consolas_cliente  FOREIGN KEY (cliente_id)   REFERENCES clientes (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_consolas_recibido FOREIGN KEY (recibido_por) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT fk_consolas_tecnico  FOREIGN KEY (tecnico_id)   REFERENCES usuarios (id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- fotos_consola (fotos de recepcion)
-- ---------------------------------------------------------------------
CREATE TABLE fotos_consola (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  consola_id  INT UNSIGNED NOT NULL,
  ruta        VARCHAR(255) NOT NULL,             -- ruta relativa /uploads/<archivo>
  descripcion VARCHAR(255) NULL DEFAULT NULL,
  subido_por  INT UNSIGNED NOT NULL,
  creado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fotos_consola_consola (consola_id),
  KEY idx_fotos_consola_subido_por (subido_por),
  CONSTRAINT fk_fotos_consola_consola FOREIGN KEY (consola_id) REFERENCES consolas (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_fotos_consola_usuario FOREIGN KEY (subido_por) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- procedimientos
-- ---------------------------------------------------------------------
CREATE TABLE procedimientos (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  consola_id        INT UNSIGNED NOT NULL,
  tecnico_id        INT UNSIGNED NOT NULL,
  descripcion       TEXT         NOT NULL,
  estado_resultante ENUM('en_espera','en_proceso','finalizado') NOT NULL,
  interno           TINYINT(1)   NOT NULL DEFAULT 0,             -- nota interna: el cliente no la ve
  creado_en         DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_procedimientos_consola_fecha (consola_id, creado_en),  -- linea de tiempo por consola
  KEY idx_procedimientos_tecnico (tecnico_id),
  KEY idx_procedimientos_consola_interno (consola_id, interno, creado_en),  -- linea de tiempo publica (interno = 0)
  CONSTRAINT fk_procedimientos_consola FOREIGN KEY (consola_id) REFERENCES consolas (id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_procedimientos_tecnico FOREIGN KEY (tecnico_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- fotos_procedimiento
-- ---------------------------------------------------------------------
CREATE TABLE fotos_procedimiento (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  procedimiento_id INT UNSIGNED NOT NULL,
  ruta             VARCHAR(255) NOT NULL,
  creado_en        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_fotos_proc_procedimiento (procedimiento_id),
  CONSTRAINT fk_fotos_proc_procedimiento FOREIGN KEY (procedimiento_id) REFERENCES procedimientos (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- articulos
-- ---------------------------------------------------------------------
CREATE TABLE articulos (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre         VARCHAR(150)  NOT NULL,
  descripcion    TEXT          NULL,
  categoria      VARCHAR(60)   NULL DEFAULT NULL,
  precio         DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  stock          INT           NOT NULL DEFAULT 0,
  foto           VARCHAR(255)  NULL DEFAULT NULL,
  activo         TINYINT(1)    NOT NULL DEFAULT 1,
  creado_en      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_articulos_activo_nombre (activo, nombre),  -- catalogo de activos ordenado por nombre
  KEY idx_articulos_categoria (categoria),
  CONSTRAINT chk_articulos_precio CHECK (precio >= 0),
  CONSTRAINT chk_articulos_stock  CHECK (stock >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- ventas
-- ---------------------------------------------------------------------
CREATE TABLE ventas (
  id         INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  cliente_id INT UNSIGNED  NULL DEFAULT NULL,
  usuario_id INT UNSIGNED  NOT NULL,
  total      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  fecha      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_ventas_fecha (fecha),        -- historial ordenado y "ventas del dia"
  KEY idx_ventas_cliente (cliente_id),
  KEY idx_ventas_usuario (usuario_id),
  CONSTRAINT fk_ventas_cliente FOREIGN KEY (cliente_id) REFERENCES clientes (id) ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_ventas_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_ventas_total CHECK (total >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- detalle_venta
-- ---------------------------------------------------------------------
CREATE TABLE detalle_venta (
  id              INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  venta_id        INT UNSIGNED  NOT NULL,
  articulo_id     INT UNSIGNED  NOT NULL,
  cantidad        INT UNSIGNED  NOT NULL,
  precio_unitario DECIMAL(12,2) NOT NULL,
  subtotal        DECIMAL(12,2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_detalle_venta_venta (venta_id),
  KEY idx_detalle_venta_articulo (articulo_id),
  CONSTRAINT fk_detalle_venta_venta    FOREIGN KEY (venta_id)    REFERENCES ventas (id)    ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT fk_detalle_venta_articulo FOREIGN KEY (articulo_id) REFERENCES articulos (id) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
  CONSTRAINT chk_detalle_montos   CHECK (precio_unitario >= 0 AND subtotal >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- repuestos_consola (fase 2)
-- ---------------------------------------------------------------------
CREATE TABLE repuestos_consola (
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
-- negocio (fase 2; una sola fila, id = 1, insertada en seed.sql)
-- ---------------------------------------------------------------------
CREATE TABLE negocio (
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

-- ---------------------------------------------------------------------
-- galeria (fase 2; fotos y videos de trabajos para la pagina publica)
-- ---------------------------------------------------------------------
CREATE TABLE galeria (
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
