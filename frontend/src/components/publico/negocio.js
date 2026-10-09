import { useOutletContext } from 'react-router-dom';

export const NOMBRE_POR_DEFECTO = 'Consolas App';

/** Datos del negocio cargados por <PublicLayout> ({ negocio, cargando, error }). */
export function useNegocio() {
  return useOutletContext() || { negocio: null, cargando: false, error: null };
}

/** URL de Google Maps para una dirección (sin incrustar mapas de terceros). */
export function enlaceMapa(direccion) {
  return direccion ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(direccion)}` : null;
}

/** Redes sociales configuradas, en orden fijo. */
export function redesDe(negocio) {
  return [
    { clave: 'facebook', label: 'Facebook', url: negocio?.facebook },
    { clave: 'instagram', label: 'Instagram', url: negocio?.instagram },
    { clave: 'tiktok', label: 'TikTok', url: negocio?.tiktok },
  ].filter((r) => r.url);
}
