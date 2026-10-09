const { pool } = require('../config/db');

const CAMPOS = [
  'nombre', 'eslogan', 'descripcion', 'direccion', 'telefono', 'whatsapp', 'email', 'horario',
  'facebook', 'instagram', 'tiktok', 'logo',
];

/** Información del negocio (fila id = 1). Si faltara la fila, devuelve los campos vacíos. */
async function obtenerNegocio() {
  const [filas] = await pool.query(`SELECT ${CAMPOS.join(', ')}, actualizado_en FROM negocio WHERE id = 1`);
  if (filas.length) return filas[0];
  return Object.fromEntries([...CAMPOS, 'actualizado_en'].map((c) => [c, null]));
}

/**
 * Actualiza la fila única con los campos indicados (nombres fijos de CAMPOS).
 * Si la fila no existiera se inserta (el controlador exige nombre en ese caso).
 */
async function guardarNegocio(datos) {
  const columnas = CAMPOS.filter((c) => datos[c] !== undefined);
  const valores = columnas.map((c) => datos[c]);
  const [r] = await pool.query(
    `UPDATE negocio SET ${columnas.map((c) => `${c} = ?`).join(', ')} WHERE id = 1`,
    valores,
  );
  if (r.affectedRows) return;
  await pool.query(
    `INSERT INTO negocio (id, ${columnas.join(', ')}) VALUES (1, ${columnas.map(() => '?').join(', ')})`,
    valores,
  );
}

module.exports = { CAMPOS, obtenerNegocio, guardarNegocio };
