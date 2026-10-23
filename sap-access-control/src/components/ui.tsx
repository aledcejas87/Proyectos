import { useMemo, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import type { Severidad } from '../lib/analisis';
import { numero } from '../lib/formato';

export function Card({ children, className = '', titulo, accion }: { children: ReactNode; className?: string; titulo?: ReactNode; accion?: ReactNode }) {
  return (
    <section
      className={`rounded-xl p-4 ${className}`}
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)' }}
    >
      {(titulo || accion) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {titulo && <h2 className="text-[15px] font-semibold">{titulo}</h2>}
          {accion}
        </div>
      )}
      {children}
    </section>
  );
}

export function Encabezado({ titulo, subtitulo, acciones }: { titulo: ReactNode; subtitulo?: ReactNode; acciones?: ReactNode }) {
  return (
    <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold break-words">{titulo}</h1>
        {subtitulo && <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>{subtitulo}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}

export function Texto2({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm ${className}`} style={{ color: 'var(--text-secondary)' }}>{children}</p>;
}

/** Valor destacado. Proporcional (no tabular) por ser una cifra suelta. */
export function Stat({ etiqueta, valor, detalle, to }: { etiqueta: string; valor: number | string; detalle?: ReactNode; to?: string }) {
  const contenido = (
    <>
      <div className="text-[13px]" style={{ color: 'var(--text-secondary)' }}>{etiqueta}</div>
      <div className="mt-1 text-[28px] font-semibold leading-tight">{typeof valor === 'number' ? numero(valor) : valor}</div>
      {detalle && <div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{detalle}</div>}
    </>
  );
  const estilo = { background: 'var(--surface-1)', border: '1px solid var(--border)' };
  return to ? (
    <Link to={to} className="block rounded-xl p-4 transition-colors hover:border-[var(--accent)]" style={estilo}>{contenido}</Link>
  ) : (
    <div className="rounded-xl p-4" style={estilo}>{contenido}</div>
  );
}

const ESTILO_SEVERIDAD: Record<Severidad, { color: string; icono: string; texto: string }> = {
  alta: { color: 'var(--status-critical)', icono: '▲', texto: 'Prioridad alta' },
  media: { color: 'var(--status-serious)', icono: '●', texto: 'Revisar' },
  info: { color: 'var(--accent)', icono: 'i', texto: 'Informativa' },
};

/** Estado siempre con icono + texto, nunca solo color. */
export function Severidad({ nivel, compacto = false }: { nivel: Severidad; compacto?: boolean }) {
  const e = ESTILO_SEVERIDAD[nivel];
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
      <span
        aria-hidden
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
        style={{ background: e.color }}
      >
        {e.icono}
      </span>
      {!compacto && e.texto}
      {compacto && <span className="sr-only">{e.texto}</span>}
    </span>
  );
}

export type Tono = 'neutro' | 'bueno' | 'alerta' | 'critico' | 'acento';
const TONOS: Record<Tono, string> = {
  neutro: 'var(--baseline)',
  bueno: 'var(--status-good)',
  alerta: 'var(--status-warning)',
  critico: 'var(--status-critical)',
  acento: 'var(--accent)',
};

export function Etiqueta({ children, tono = 'neutro', title }: { children: ReactNode; tono?: Tono; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
    >
      <span aria-hidden className="h-2 w-2 rounded-full" style={{ background: TONOS[tono] }} />
      {children}
    </span>
  );
}

export function Aviso({ children, tono = 'acento', titulo }: { children: ReactNode; tono?: Tono; titulo?: ReactNode }) {
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-sm"
      style={{ background: 'var(--surface-1)', border: '1px solid var(--border)', borderLeft: `4px solid ${TONOS[tono]}` }}
    >
      {titulo && <div className="mb-0.5 font-semibold">{titulo}</div>}
      <div style={{ color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );
}

export function Vacio({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <div className="rounded-xl px-4 py-10 text-center" style={{ border: '1px dashed var(--baseline)' }}>
      <div className="font-medium">{titulo}</div>
      {children && <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{children}</div>}
    </div>
  );
}

/** Barra de proporción con hueco de 2px entre segmentos; los valores van en texto al lado. */
export function BarraProporcion({ partes }: { partes: { etiqueta: string; valor: number; color: string }[] }) {
  const total = partes.reduce((a, p) => a + p.valor, 0) || 1;
  return (
    <div>
      <div className="flex h-3 w-full gap-[2px] overflow-hidden rounded" role="img" aria-label={partes.map((p) => `${p.etiqueta}: ${p.valor}`).join(', ')}>
        {partes.filter((p) => p.valor > 0).map((p) => (
          <div key={p.etiqueta} title={`${p.etiqueta}: ${numero(p.valor)} (${Math.round((p.valor / total) * 100)} %)`} style={{ width: `${(p.valor / total) * 100}%`, background: p.color, minWidth: 3 }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
        {partes.map((p) => (
          <li key={p.etiqueta} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-sm" style={{ background: p.color }} />
            {p.etiqueta}: <span style={{ color: 'var(--text-primary)' }}>{numero(p.valor)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tabla genérica con orden por columna y paginado.

export interface Columna<T> {
  id: string;
  titulo: string;
  valor: (fila: T) => string | number | null;
  render?: (fila: T) => ReactNode;
  numerica?: boolean;
  ancho?: string;
}

export function TablaDatos<T>({
  filas,
  columnas,
  clave,
  porPagina = 50,
  ordenInicial,
  vacio = 'Sin resultados.',
}: {
  filas: T[];
  columnas: Columna<T>[];
  clave: (fila: T) => string | number;
  porPagina?: number;
  ordenInicial?: { id: string; asc: boolean };
  vacio?: string;
}) {
  const [orden, setOrden] = useState(ordenInicial ?? { id: columnas[0].id, asc: true });
  const [pagina, setPagina] = useState(0);
  const ordenadas = useMemo(() => {
    const col = columnas.find((c) => c.id === orden.id);
    if (!col) return filas;
    return [...filas].sort((a, b) => {
      const va = col.valor(a);
      const vb = col.valor(b);
      if (va === vb) return 0;
      if (va === null || va === '') return 1;
      if (vb === null || vb === '') return -1;
      const r = typeof va === 'number' && typeof vb === 'number' ? va - vb : String(va).localeCompare(String(vb), 'es');
      return orden.asc ? r : -r;
    });
  }, [filas, columnas, orden]);
  const paginas = Math.max(1, Math.ceil(ordenadas.length / porPagina));
  const p = Math.min(pagina, paginas - 1);
  const visibles = ordenadas.slice(p * porPagina, (p + 1) * porPagina);

  return (
    <div>
      <div className="max-h-[70vh] overflow-auto rounded-lg" style={{ border: '1px solid var(--border)', background: 'var(--surface-1)' }}>
        <table className="tabla">
          <thead>
            <tr>
              {columnas.map((c) => (
                <th key={c.id} className={c.numerica ? 'num' : ''} style={{ width: c.ancho }}>
                  <button
                    className="inline-flex items-center gap-1"
                    onClick={() => setOrden((o) => ({ id: c.id, asc: o.id === c.id ? !o.asc : !c.numerica }))}
                    aria-sort={orden.id === c.id ? (orden.asc ? 'ascending' : 'descending') : 'none'}
                  >
                    {c.titulo}
                    <span aria-hidden style={{ color: 'var(--muted)', visibility: orden.id === c.id ? 'visible' : 'hidden' }}>
                      {orden.asc ? '↑' : '↓'}
                    </span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibles.map((f) => (
              <tr key={clave(f)}>
                {columnas.map((c) => (
                  <td key={c.id} className={c.numerica ? 'num' : ''}>
                    {c.render ? c.render(f) : (c.valor(f) ?? '—')}
                  </td>
                ))}
              </tr>
            ))}
            {!visibles.length && (
              <tr>
                <td colSpan={columnas.length} className="py-8 text-center" style={{ color: 'var(--muted)' }}>{vacio}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <span>{numero(ordenadas.length)} fila(s)</span>
        {paginas > 1 && (
          <span className="flex items-center gap-2">
            <button className="boton" disabled={p === 0} onClick={() => setPagina(p - 1)}>Anterior</button>
            Página {p + 1} de {paginas}
            <button className="boton" disabled={p >= paginas - 1} onClick={() => setPagina(p + 1)}>Siguiente</button>
          </span>
        )}
      </div>
    </div>
  );
}

export function Dato({ etiqueta, children, tecnico }: { etiqueta: string; children: ReactNode; tecnico?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs" style={{ color: 'var(--muted)' }}>
        {etiqueta}
        {tecnico && <span className="mono ml-1">({tecnico})</span>}
      </dt>
      <dd className="mt-0.5 break-words text-sm">{children}</dd>
    </div>
  );
}
