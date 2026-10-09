// Política de contraseñas (debe coincidir con la validación del backend).
export const PASSWORD_MIN = 8;

/** Devuelve el estado de cada requisito de la contraseña. */
export function requisitosPassword(password = '') {
  return [
    { id: 'largo', texto: `Al menos ${PASSWORD_MIN} caracteres`, ok: password.length >= PASSWORD_MIN },
    { id: 'letra', texto: 'Al menos una letra', ok: /\p{L}/u.test(password) },
    { id: 'numero', texto: 'Al menos un número', ok: /\d/.test(password) },
  ];
}

/** Mensaje de error en español, o null si la contraseña cumple la política. */
export function errorPassword(password = '') {
  const faltan = requisitosPassword(password).filter((r) => !r.ok);
  if (faltan.length === 0) return null;
  return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres, con al menos una letra y un número.`;
}
