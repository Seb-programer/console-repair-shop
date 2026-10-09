import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, asList } from '../api/client';
import { useAsync, useDebounced } from '../utils/hooks';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import ClienteSelector from '../components/ClienteSelector';
import Icon from '../components/Icon';
import { ErrorMessage, ListState } from '../components/Feedback';
import { formatMoneda, fotoUrl } from '../utils/format';

export default function NuevaVenta() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const qDeb = useDebounced(q.trim(), 300);
  const [carrito, setCarrito] = useState([]); // [{articulo, cantidad}]
  const [cliente, setCliente] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState(null);

  const loader = useCallback(() => api.get('/articulos', { q: qDeb }).then((d) => asList(d, 'articulos')), [qDeb]);
  const { data, loading, error: errorArt, reload } = useAsync(loader);
  const articulos = (data || []).filter((a) => Boolean(Number(a.activo ?? 1)));

  const enCarrito = (id) => carrito.find((i) => i.articulo.id === id)?.cantidad || 0;

  const agregar = (articulo) => {
    setError(null);
    setCarrito((c) => {
      const existe = c.find((i) => i.articulo.id === articulo.id);
      if (existe) {
        return c.map((i) => (i.articulo.id === articulo.id
          ? { ...i, cantidad: Math.min(i.cantidad + 1, Number(articulo.stock)) }
          : i));
      }
      return [...c, { articulo, cantidad: 1 }];
    });
  };

  const setCantidad = (id, valor) => {
    setCarrito((c) => c.map((i) => {
      if (i.articulo.id !== id) return i;
      const max = Number(i.articulo.stock);
      const n = Math.max(1, Math.min(max, Math.floor(Number(valor) || 1)));
      return { ...i, cantidad: n };
    }));
  };

  const quitar = (id) => setCarrito((c) => c.filter((i) => i.articulo.id !== id));

  const total = carrito.reduce((s, i) => s + Number(i.articulo.precio) * i.cantidad, 0);
  const unidades = carrito.reduce((s, i) => s + i.cantidad, 0);

  const registrar = async () => {
    if (!carrito.length) { setError('Agrega al menos un artículo al carrito.'); return; }
    const excedido = carrito.find((i) => i.cantidad > Number(i.articulo.stock));
    if (excedido) { setError(`La cantidad de “${excedido.articulo.nombre}” supera el stock disponible.`); return; }
    setEnviando(true);
    setError(null);
    try {
      const venta = await api.post('/ventas', {
        ...(cliente?.id ? { cliente_id: cliente.id } : {}),
        items: carrito.map((i) => ({ articulo_id: i.articulo.id, cantidad: i.cantidad })),
      });
      navigate(venta?.id ? `/panel/ventas/${venta.id}` : '/panel/ventas', { state: { aviso: 'Venta registrada correctamente.' } });
    } catch (err) {
      setError(err);
      setEnviando(false);
      reload(); // refrescar stock por si cambió
    }
  };

  return (
    <section>
      <PageHeader titulo="Nueva venta" volver="/panel/ventas" />
      <div className="venta-layout">
        <div className="card">
          <h2 className="card-titulo">Artículos</h2>
          <SearchInput value={q} onChange={setQ} label="Buscar artículos" placeholder="Buscar en el catálogo…" />
          <ListState
            loading={loading}
            error={errorArt}
            onRetry={reload}
            vacio={articulos.length === 0}
            vacioTitulo="No hay artículos disponibles"
          >
            <ul className="lista-articulos-venta">
              {articulos.map((a) => {
                const stock = Number(a.stock);
                const agotado = stock <= enCarrito(a.id);
                const foto = fotoUrl(a.foto);
                return (
                  <li key={a.id} className="articulo-venta">
                    <div className="articulo-venta-foto">
                      {foto ? <img src={foto} alt="" loading="lazy" /> : <Icon name="imagen" size={22} />}
                    </div>
                    <div className="articulo-venta-info">
                      <strong>{a.nombre}</strong>
                      <span className="texto-suave texto-sm">{formatMoneda(a.precio)} · {stock === 0 ? 'Agotado' : `${stock} disp.`}</span>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-secondary"
                      onClick={() => agregar(a)}
                      disabled={agotado}
                      aria-label={`Agregar ${a.nombre} al carrito`}
                    >
                      <Icon name="mas" size={16} /> {stock === 0 ? 'Agotado' : 'Agregar'}
                    </button>
                  </li>
                );
              })}
            </ul>
          </ListState>
        </div>

        <aside className="card carrito" aria-labelledby="titulo-carrito">
          <h2 id="titulo-carrito" className="card-titulo"><Icon name="carrito" size={18} /> Carrito ({unidades})</h2>
          {carrito.length === 0 ? (
            <p className="texto-suave">El carrito está vacío. Agrega artículos desde el catálogo.</p>
          ) : (
            <ul className="carrito-items">
              {carrito.map(({ articulo, cantidad }) => (
                <li key={articulo.id} className="carrito-item">
                  <div className="carrito-item-info">
                    <strong>{articulo.nombre}</strong>
                    <span className="texto-suave texto-sm">{formatMoneda(articulo.precio)} c/u · máx. {articulo.stock}</span>
                  </div>
                  <div className="stepper" role="group" aria-label={`Cantidad de ${articulo.nombre}`}>
                    <button type="button" className="btn-icon" onClick={() => setCantidad(articulo.id, cantidad - 1)} disabled={cantidad <= 1} aria-label="Disminuir">
                      <Icon name="menos" size={16} />
                    </button>
                    <input
                      type="number"
                      className="input"
                      min="1"
                      max={articulo.stock}
                      value={cantidad}
                      onChange={(e) => setCantidad(articulo.id, e.target.value)}
                      aria-label="Cantidad"
                    />
                    <button type="button" className="btn-icon" onClick={() => setCantidad(articulo.id, cantidad + 1)} disabled={cantidad >= Number(articulo.stock)} aria-label="Aumentar">
                      <Icon name="mas" size={16} />
                    </button>
                  </div>
                  <span className="carrito-subtotal">{formatMoneda(Number(articulo.precio) * cantidad)}</span>
                  <button type="button" className="btn-icon btn-icon-peligro" onClick={() => quitar(articulo.id)} aria-label={`Quitar ${articulo.nombre}`}>
                    <Icon name="basura" size={16} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="carrito-cliente">
            <h3 className="form-label">Cliente (opcional)</h3>
            <ClienteSelector value={cliente} onChange={setCliente} opcional />
          </div>

          <div className="carrito-total">
            <span>Total</span>
            <strong>{formatMoneda(total)}</strong>
          </div>
          <ErrorMessage error={error} />
          <button type="button" className="btn btn-primary btn-block" onClick={registrar} disabled={enviando || carrito.length === 0}>
            {enviando ? 'Registrando…' : 'Registrar venta'}
          </button>
        </aside>
      </div>
    </section>
  );
}
