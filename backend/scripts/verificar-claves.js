// Revisa si algun usuario ACTIVO todavia usa una contrasena de ejemplo del seed.
// Uso: npm run verificar-claves   (o: node scripts/verificar-claves.js)
// Codigos de salida: 0 = ninguna coincide; 1 = hay usuarios con contrasena de ejemplo;
//                    2 = no se pudo consultar la base de datos.
// Los mensajes van sin tildes para que se lean bien en cualquier consola de Windows.
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');

const CLAVES_DEL_SEED = ['Admin123*', 'Tecnico123*', 'Operario123*'];

/** Devuelve los usuarios cuya contrasena coincide con alguna del seed. */
async function usuariosConClaveDeEjemplo(usuarios, claves = CLAVES_DEL_SEED) {
  const afectados = [];
  for (const u of usuarios) {
    for (const clave of claves) {
      // eslint-disable-next-line no-await-in-loop
      if (u.password_hash && await bcrypt.compare(clave, u.password_hash)) {
        afectados.push(u);
        break;
      }
    }
  }
  return afectados;
}

async function main() {
  let usuarios;
  try {
    [usuarios] = await pool.query(
      'SELECT id, nombre, usuario, rol, password_hash FROM usuarios WHERE activo = 1 ORDER BY usuario',
    );
  } catch (err) {
    console.error(`ERROR: no se pudo consultar la base de datos (${err.code || err.message}).`);
    console.error('Compruebe que MySQL esta encendido y que backend/.env es correcto.');
    return 2;
  }

  const afectados = await usuariosConClaveDeEjemplo(usuarios);
  if (!afectados.length) {
    console.log(`OK: ninguno de los ${usuarios.length} usuarios activos usa una contrasena de ejemplo.`);
    return 0;
  }
  console.log('ATENCION: estos usuarios activos todavia usan una contrasena de ejemplo:');
  for (const u of afectados) console.log(`  - ${u.usuario} (${u.nombre}, rol ${u.rol})`);
  console.log('Cambielas en Panel > Usuarios (minimo 8 caracteres, con letras y numeros)');
  console.log('o desactive esos usuarios antes de publicar la app en internet.');
  return 1;
}

if (require.main === module) {
  main()
    .then((codigo) => { process.exitCode = codigo; })
    .catch((err) => { console.error('ERROR inesperado:', err.message); process.exitCode = 2; })
    .finally(() => pool.end().catch(() => {}));
}

module.exports = { usuariosConClaveDeEjemplo, CLAVES_DEL_SEED };
