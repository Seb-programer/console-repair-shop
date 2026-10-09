// Wrapper de fetch para la API del backend. Rutas siempre relativas (/api): en desarrollo
// las atiende el proxy de Vite (-> :3001) y en producción el mismo servidor Express.
const BASE = '/api';
const TOKEN_KEY = 'consolas_token';

export const tokenStorage = {
  get() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
  },
  set(token) {
    try { localStorage.setItem(TOKEN_KEY, token); } catch { /* sin almacenamiento */ }
  },
  clear() {
    try { localStorage.removeItem(TOKEN_KEY); } catch { /* sin almacenamiento */ }
  },
};

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const MENSAJES_POR_ESTADO = {
  400: 'Los datos enviados no son válidos.',
  401: 'Tu sesión ha expirado. Inicia sesión de nuevo.',
  403: 'No tienes permiso para realizar esta acción.',
  404: 'El recurso solicitado no existe.',
  409: 'Conflicto: el registro ya existe o no se puede modificar.',
  413: 'El archivo es demasiado grande.',
  429: 'Demasiadas solicitudes. Intenta de nuevo en unos minutos.',
  500: 'Error interno del servidor.',
};

export async function request(path, { method = 'GET', body, params, headers = {} } = {}) {
  let url = BASE + path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') qs.append(k, v);
    });
    const s = qs.toString();
    if (s) url += (url.includes('?') ? '&' : '?') + s;
  }

  const opts = { method, headers: { Accept: 'application/json', ...headers } };
  const token = tokenStorage.get();
  if (token) opts.headers.Authorization = `Bearer ${token}`;

  if (body instanceof FormData) {
    opts.body = body; // el navegador fija el boundary del multipart
  } else if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }

  let res;
  try {
    res = await fetch(url, opts);
  } catch {
    throw new ApiError('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.', 0);
  }

  const data = parsear(await res.text());

  if (!res.ok) throw errorDeRespuesta(path, res.status, data);
  return data;
}

function parsear(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch { return text; }
}

function errorDeRespuesta(path, status, data) {
  // Mensaje del backend ({error} o {message}); si responde texto plano corto (p. ej. un
  // limitador de peticiones), se usa tal cual. Nunca se muestra HTML de una página de error.
  const textoPlano = typeof data === 'string' && data.length <= 300 && !/<[a-z!]/i.test(data) ? data.trim() : '';
  const msg = (data && typeof data === 'object' && (data.error || data.message))
    || textoPlano
    || MENSAJES_POR_ESTADO[status]
    || `Error ${status}`;
  // 401 fuera del login: la sesión no es válida → cerrar sesión y volver a /login
  if (status === 401 && !path.startsWith('/auth/login')) {
    tokenStorage.clear();
    if (window.location.pathname !== '/login') {
      window.location.assign('/login?expirada=1');
    }
  }
  return new ApiError(msg, status, data);
}

/**
 * Envía un FormData con XMLHttpRequest para poder informar el progreso de subida.
 * `onProgress(porcentaje 0-100)`; `signal` (AbortSignal) permite cancelar.
 */
export function upload(path, formData, { method = 'POST', onProgress, signal } = {}) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, BASE + path);
    xhr.setRequestHeader('Accept', 'application/json');
    const token = tokenStorage.get();
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);

    if (onProgress) {
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
    }
    xhr.onload = () => {
      const data = parsear(xhr.responseText);
      if (xhr.status >= 200 && xhr.status < 300) resolve(data);
      else reject(errorDeRespuesta(path, xhr.status, data));
    };
    xhr.onerror = () => reject(new ApiError('No se pudo conectar con el servidor. Verifica que el backend esté en ejecución.', 0));
    xhr.onabort = () => reject(new ApiError('Subida cancelada.', 0, { cancelada: true }));

    if (signal) {
      if (signal.aborted) { xhr.abort(); return; }
      signal.addEventListener('abort', () => xhr.abort(), { once: true });
    }
    xhr.send(formData);
  });
}

export const api = {
  get: (path, params) => request(path, { params }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  del: (path) => request(path, { method: 'DELETE' }),
};

/** Normaliza respuestas de listas: acepta array directo o {data|items|rows|<clave>: []}. */
export function asList(data, ...keys) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object') {
    for (const k of [...keys, 'data', 'items', 'rows', 'resultados']) {
      if (Array.isArray(data[k])) return data[k];
    }
  }
  return [];
}

/** Desenvuelve objetos que vengan como {data: {...}} o {<clave>: {...}}. */
export function asObject(data, ...keys) {
  if (!data || typeof data !== 'object') return data;
  for (const k of [...keys, 'data']) {
    if (data[k] && typeof data[k] === 'object' && !Array.isArray(data[k])) return data[k];
  }
  return data;
}
