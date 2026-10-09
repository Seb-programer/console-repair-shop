import { useCallback, useMemo, useState } from 'react';
import { api, asList } from '../../api/client';
import { useAsync } from '../../utils/hooks';
import { esVerdadero } from '../../utils/format';
import SearchInput from '../../components/SearchInput';
import { ListState } from '../../components/Feedback';
import ProductoCard from '../../components/publico/ProductoCard';
import { useNegocio } from '../../components/publico/negocio';

/** Normaliza para buscar sin distinguir mayúsculas ni tildes. */
const normalizar = (t) => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function Productos() {
  const { negocio } = useNegocio();
  const [q, setQ] = useState('');
  const [categoria, setCategoria] = useState('');
  const [soloDisponibles, setSoloDisponibles] = useState(false);

  // El catálogo público es pequeño: se carga una vez y se filtra en el navegador (búsqueda instantánea).
  const loader = useCallback(() => api.get('/publico/articulos').then((d) => asList(d, 'articulos')), []);
  const { data, loading, error, reload } = useAsync(loader);
  const articulos = useMemo(() => data || [], [data]);

  const categorias = useMemo(
    () => [...new Set(articulos.map((a) => a.categoria).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'es')),
    [articulos],
  );

  const filtrados = useMemo(() => {
    const term = normalizar(q.trim());
    return articulos.filter((a) => (
      (!categoria || a.categoria === categoria)
      && (!soloDisponibles || esVerdadero(a.disponible))
      && (!term || normalizar(`${a.nombre} ${a.descripcion} ${a.categoria}`).includes(term))
    ));
  }, [articulos, q, categoria, soloDisponibles]);

  const hayFiltros = Boolean(q.trim() || categoria || soloDisponibles);

  return (
    <section className="pub-seccion pub-pagina" aria-labelledby="productos-titulo">
      <div className="pub-contenedor">
        <header className="pub-seccion-cabecera">
          <div>
            <h1 id="productos-titulo" className="pub-seccion-titulo">Productos</h1>
            <p className="pub-seccion-sub">Consolas, controles, accesorios y repuestos. Precios en pesos colombianos.</p>
          </div>
        </header>

        <div className="pub-filtros">
          <SearchInput value={q} onChange={setQ} label="Buscar productos" placeholder="Buscar por nombre o descripción…" />
          <label className="check">
            <input type="checkbox" checked={soloDisponibles} onChange={(e) => setSoloDisponibles(e.target.checked)} />
            Solo disponibles
          </label>
        </div>
        {categorias.length > 0 && (
          <div className="pub-chips" role="group" aria-label="Filtrar por categoría">
            {['', ...categorias].map((c) => (
              <button
                key={c || 'todas'}
                type="button"
                className="pub-chip"
                aria-pressed={categoria === c}
                onClick={() => setCategoria(c)}
              >
                {c || 'Todas'}
              </button>
            ))}
          </div>
        )}

        <ListState
          loading={loading && !data}
          error={error}
          onRetry={reload}
          vacio={filtrados.length === 0}
          vacioTitulo={hayFiltros ? 'Sin coincidencias' : 'Aún no hay productos publicados'}
          vacioTexto={hayFiltros ? 'Prueba con otra búsqueda o categoría.' : 'Vuelve pronto.'}
        >
          <p className="texto-suave texto-sm" role="status">
            {filtrados.length} producto{filtrados.length === 1 ? '' : 's'}
          </p>
          <ul className="grid-articulos">
            {filtrados.map((a) => <ProductoCard key={a.id} articulo={a} whatsapp={negocio?.whatsapp} />)}
          </ul>
        </ListState>
      </div>
    </section>
  );
}
