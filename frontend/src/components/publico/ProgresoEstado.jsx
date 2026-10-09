const PASOS = [
  { estado: 'en_espera', label: 'Recibida' },
  { estado: 'en_proceso', label: 'En proceso' },
  { estado: 'finalizado', label: 'Finalizada' },
];

/** Barra de progreso de 3 pasos: Recibida → En proceso → Finalizada. */
export default function ProgresoEstado({ estado }) {
  const actual = Math.max(0, PASOS.findIndex((p) => p.estado === estado));
  return (
    <ol className="progreso" aria-label={`Progreso: paso ${actual + 1} de ${PASOS.length}, ${PASOS[actual].label}`}>
      {PASOS.map((p, i) => {
        const clase = i < actual ? 'hecho' : i === actual ? 'actual' : 'pendiente';
        return (
          <li key={p.estado} className={`progreso-paso progreso-${clase} progreso-${p.estado}`} aria-current={i === actual ? 'step' : undefined}>
            <span className="progreso-circulo" aria-hidden="true">{i < actual || (i === actual && i === PASOS.length - 1) ? '✓' : i + 1}</span>
            <span className="progreso-label">{p.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
