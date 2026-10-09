const { HttpError } = require('../utils/HttpError');
const { ipCliente } = require('../utils/ipCliente');

/**
 * Contador en memoria por clave con ventana fija, sin dependencias.
 * Suficiente para una sola instancia del servidor; con varias instancias haría
 * falta un almacén compartido (p. ej. Redis).
 */
function crearContador(ventanaMs) {
  const registros = new Map(); // clave → { cuenta, reiniciaEn }

  // Limpieza periódica de entradas vencidas para que el Map no crezca sin fin.
  const limpieza = setInterval(() => {
    const ahora = Date.now();
    for (const [clave, r] of registros) if (r.reiniciaEn <= ahora) registros.delete(clave);
  }, ventanaMs);
  limpieza.unref();

  function vigente(clave) {
    const r = registros.get(clave);
    if (r && r.reiniciaEn > Date.now()) return r;
    if (r) registros.delete(clave);
    return null;
  }

  return {
    /** Cuenta actual (0 si no hay registro vigente). */
    cuenta: (clave) => vigente(clave)?.cuenta || 0,
    /** Segundos hasta que la ventana de la clave se reinicia. */
    segundosRestantes: (clave) => {
      const r = vigente(clave);
      return r ? Math.max(1, Math.ceil((r.reiniciaEn - Date.now()) / 1000)) : 0;
    },
    /** Suma 1 y devuelve el registro. */
    sumar(clave) {
      let r = vigente(clave);
      if (!r) {
        r = { cuenta: 0, reiniciaEn: Date.now() + ventanaMs };
        registros.set(clave, r);
      }
      r.cuenta += 1;
      return r;
    },
    borrar: (clave) => registros.delete(clave),
    reiniciar: () => registros.clear(),
  };
}

/**
 * Limitador de peticiones por IP (ver `ipCliente`).
 * Devuelve un middleware con un método `reiniciar()` para las pruebas.
 */
function crearLimitador({ maximo, ventanaMs, mensaje }) {
  const contador = crearContador(ventanaMs);

  function limitador(req, res, next) {
    const ip = ipCliente(req);
    const registro = contador.sumar(ip);
    res.setHeader('RateLimit-Limit', String(maximo));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, maximo - registro.cuenta)));
    if (registro.cuenta > maximo) {
      res.setHeader('Retry-After', String(contador.segundosRestantes(ip)));
      return next(new HttpError(429, mensaje));
    }
    return next();
  }

  limitador.reiniciar = contador.reiniciar;
  return limitador;
}

// POST /publico/consulta: máximo 10 consultas cada 15 minutos por IP.
const limiteConsulta = crearLimitador({
  maximo: 10,
  ventanaMs: 15 * 60 * 1000,
  mensaje: 'Demasiadas consultas. Intenta de nuevo en unos minutos.',
});

/**
 * Límite de intentos fallidos de inicio de sesión:
 *  - `maxPorUsuario` fallos por IP + usuario y `maxPorIp` fallos por IP, en `ventanaMs`.
 *  - Al alcanzar cualquiera de los dos, los siguientes intentos (incluso con la contraseña
 *    correcta) responden 429 hasta que pase la ventana.
 *  - Un inicio de sesión correcto reinicia el contador de esa IP + usuario.
 */
function crearLimiteLogin({
  maxPorUsuario = 5,
  maxPorIp = 20,
  ventanaMs = 15 * 60 * 1000,
  mensaje = 'Demasiados intentos fallidos de inicio de sesión. Intenta de nuevo en unos minutos.',
} = {}) {
  const porUsuario = crearContador(ventanaMs);
  const porIp = crearContador(ventanaMs);
  const claveUsuario = (ip, usuario) => `${ip}|${String(usuario).trim().toLowerCase()}`;

  return {
    /** Lanza 429 (y pone Retry-After) si la IP o la IP + usuario ya agotaron sus intentos. */
    comprobar(req, res, usuario) {
      const ip = ipCliente(req);
      const cu = claveUsuario(ip, usuario);
      const esperas = [];
      if (porUsuario.cuenta(cu) >= maxPorUsuario) esperas.push(porUsuario.segundosRestantes(cu));
      if (porIp.cuenta(ip) >= maxPorIp) esperas.push(porIp.segundosRestantes(ip));
      if (esperas.length) {
        res.setHeader('Retry-After', String(Math.max(...esperas)));
        throw new HttpError(429, mensaje);
      }
    },
    registrarFallo(req, usuario) {
      const ip = ipCliente(req);
      porUsuario.sumar(claveUsuario(ip, usuario));
      porIp.sumar(ip);
    },
    registrarExito(req, usuario) {
      porUsuario.borrar(claveUsuario(ipCliente(req), usuario));
    },
    reiniciar() {
      porUsuario.reiniciar();
      porIp.reiniciar();
    },
  };
}

const limiteLogin = crearLimiteLogin();

module.exports = {
  crearContador, crearLimitador, limiteConsulta, crearLimiteLogin, limiteLogin,
};
