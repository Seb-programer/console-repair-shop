import { useCallback, useEffect, useState } from 'react';

/**
 * Ejecuta `loader` (memorizado con useCallback por quien lo llama) y expone
 * { data, error, loading, reload }. Conserva los datos previos mientras recarga.
 */
export function useAsync(loader) {
  const [tick, setTick] = useState(0);
  const [state, setState] = useState({ data: null, error: null, loader: null, tick: -1 });

  useEffect(() => {
    let activo = true;
    Promise.resolve()
      .then(loader)
      .then((data) => { if (activo) setState({ data, error: null, loader, tick }); })
      .catch((error) => { if (activo) setState((s) => ({ data: s.data, error, loader, tick })); });
    return () => { activo = false; };
  }, [loader, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const loading = state.loader !== loader || state.tick !== tick;
  return { data: state.data, error: loading ? null : state.error, loading, reload };
}

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}
