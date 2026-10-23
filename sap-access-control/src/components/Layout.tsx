import { NavLink, Outlet } from 'react-router-dom';
import { setAjuste } from '../db/db';
import { fecha } from '../lib/formato';
import { useEstado } from '../lib/modelo';

const NAV = [
  { to: '/', label: 'Tablero', end: true },
  { to: '/cuentas', label: 'Cuentas SAP', end: false },
  { to: '/personas', label: 'Personas (RR. HH.)', end: false },
  { to: '/roles', label: 'Roles', end: false },
  { to: '/calidad', label: 'Calidad y conciliación', end: false },
  { to: '/cargas', label: 'Cargas y snapshots', end: false },
  { to: '/metodologia', label: 'Cómo leer los datos', end: false },
];

export function Layout() {
  const { snapshots, snapshotActivoId, modelo } = useEstado();
  const enlace = ({ isActive }: { isActive: boolean }) =>
    `block whitespace-nowrap rounded-lg px-3 py-2 text-sm ${isActive ? 'font-semibold' : ''}`;
  const estiloEnlace = ({ isActive }: { isActive: boolean }) => ({
    background: isActive ? 'var(--accent-soft)' : 'transparent',
    color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
  });

  return (
    <div className="min-h-svh lg:flex">
      <aside
        className="lg:sticky lg:top-0 lg:flex lg:h-svh lg:w-64 lg:shrink-0 lg:flex-col"
        style={{ background: 'var(--surface-1)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="px-4 pb-2 pt-4">
          <div className="text-[15px] font-semibold">SAP Access Control</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>Scienza · Uruguay y Chile</div>
        </div>
        <div className="px-4 pb-3">
          <label className="block text-xs" style={{ color: 'var(--muted)' }} htmlFor="snapshot">Snapshot activo</label>
          <select
            id="snapshot"
            className="campo mt-1 w-full"
            value={snapshotActivoId ?? ''}
            onChange={(e) => setAjuste('snapshotActivo', Number(e.target.value))}
            disabled={!snapshots.length}
          >
            {!snapshots.length && <option value="">Sin datos cargados</option>}
            {snapshots.map((s) => (
              <option key={s.id} value={s.id}>
                {fecha(s.fechaExtraccion)} · {s.nombre}
              </option>
            ))}
          </select>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 lg:flex-col lg:overflow-visible">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={enlace} style={estiloEnlace}>
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden px-4 py-3 text-xs lg:block" style={{ color: 'var(--muted)' }}>
          Los datos se procesan y guardan solo en este navegador. Nada se envía a un servidor.
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-5 lg:px-8">
        {modelo?.snapshot.esDemo && (
          <div
            className="mb-4 rounded-lg px-3 py-2 text-sm"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderLeft: '4px solid var(--status-warning)' }}
          >
            <strong>Datos de ejemplo ficticios.</strong>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>Este snapshot no proviene de SAP; sirve solo para recorrer la aplicación.</span>
          </div>
        )}
        <div className="mx-auto max-w-[1400px]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
