import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Paises, SinDatos } from '../components/comunes';
import { Aviso, Encabezado, Etiqueta, TablaDatos, type Columna } from '../components/ui';
import { nombrePersona, type PersonaAnalizada } from '../lib/analisis';
import { descargarCsv } from '../lib/exportar';
import { useEstado } from '../lib/modelo';

const FILTROS = {
  vigentes: 'Vigentes',
  sinCuenta: 'Vigentes sin cuenta SAP',
  variasCuentas: 'Con más de una cuenta',
  ambos: 'Operan en ambos países',
  noVigentes: 'No vigentes',
  todas: 'Todas',
} as const;
type Filtro = keyof typeof FILTROS;

export function Personas() {
  const { modelo } = useEstado();
  const [filtro, setFiltro] = useState<Filtro>('vigentes');
  const [q, setQ] = useState('');
  const filas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return (modelo?.personas ?? []).filter((p) => {
      const v = p.persona.vigente;
      if (filtro === 'vigentes' && v !== true) return false;
      if (filtro === 'sinCuenta' && (v !== true || p.cuentas.length)) return false;
      if (filtro === 'variasCuentas' && p.persona.usuariosSap.length < 2) return false;
      if (filtro === 'ambos' && p.persona.paisesOperacion.length < 2) return false;
      if (filtro === 'noVigentes' && v !== false) return false;
      if (t && !`${nombrePersona(p.persona)} ${p.persona.idEmpleado} ${p.persona.area} ${p.persona.cargo} ${p.persona.usuariosSap.join(' ')}`.toLowerCase().includes(t)) return false;
      return true;
    });
  }, [modelo, filtro, q]);

  if (!modelo) return <SinDatos />;
  if (!modelo.fuentes.RRHH) {
    return (
      <div>
        <Encabezado titulo="Personas (RR. HH.)" />
        <Aviso titulo="Falta la planilla de RR. HH.">
          Importala en <Link className="enlace" to="/cargas">Cargas</Link>. Es la fuente para distinguir persona física de cuenta SAP,
          identificar empleados vigentes y países de operación.
        </Aviso>
      </div>
    );
  }
  const columnas: Columna<PersonaAnalizada>[] = [
    { id: 'n', titulo: 'Persona', valor: (p) => nombrePersona(p.persona) },
    { id: 'id', titulo: 'Legajo', valor: (p) => p.persona.idEmpleado },
    { id: 'est', titulo: 'Estado RR. HH.', valor: (p) => p.persona.estadoTexto,
      render: (p) => <Etiqueta tono={p.persona.vigente === true ? 'bueno' : p.persona.vigente === false ? 'critico' : 'alerta'}>{p.persona.estadoTexto || 'Sin dato'}</Etiqueta> },
    { id: 'area', titulo: 'Área', valor: (p) => p.persona.area },
    { id: 'cargo', titulo: 'Cargo', valor: (p) => p.persona.cargo },
    { id: 'pais', titulo: 'Opera en', valor: (p) => p.persona.paisesOperacion.join(','), render: (p) => <Paises paises={p.persona.paisesOperacion} /> },
    { id: 'cuentas', titulo: 'Cuentas SAP', valor: (p) => p.persona.usuariosSap.join(' '),
      render: (p) => p.persona.usuariosSap.length ? (
        <span className="flex flex-wrap gap-1">
          {p.cuentas.map((u) => <Link key={u} className="enlace mono" to={`/cuentas/${encodeURIComponent(u)}`}>{u}</Link>)}
          {p.cuentasInexistentes.map((u) => <span key={u} className="mono" title="No existe en USR02" style={{ color: 'var(--status-critical)' }}>{u}?</span>)}
        </span>
      ) : <span style={{ color: 'var(--muted)' }}>Sin usuario</span> },
    { id: 'roles', titulo: 'Roles vigentes', valor: (p) => p.rolesVigentes, numerica: true },
  ];
  return (
    <div>
      <Encabezado
        titulo="Personas (RR. HH.)"
        subtitulo="Personas físicas según RR. HH. y sus cuentas SAP vinculadas por usuario."
        acciones={
          <button className="boton" onClick={() => descargarCsv(`personas_${modelo.ref}.csv`, ['Persona', 'Legajo', 'Estado', 'Área', 'Cargo', 'País pertenencia', 'Opera en', 'Usuarios SAP', 'Inexistentes en USR02', 'Roles vigentes'],
            filas.map((p) => [nombrePersona(p.persona), p.persona.idEmpleado, p.persona.estadoTexto, p.persona.area, p.persona.cargo, p.persona.paisPertenencia, p.persona.paisesOperacion.join(', '), p.persona.usuariosSap.join(', '), p.cuentasInexistentes.join(', '), p.rolesVigentes]))}>
            Exportar CSV
          </button>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="campo w-full sm:w-64" placeholder="Buscar persona, legajo, área…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="campo" value={filtro} onChange={(e) => setFiltro(e.target.value as Filtro)} aria-label="Filtro">
          {(Object.keys(FILTROS) as Filtro[]).map((f) => <option key={f} value={f}>{FILTROS[f]}</option>)}
        </select>
      </div>
      <TablaDatos key={filtro + q} filas={filas} columnas={columnas} clave={(p) => p.persona.id ?? nombrePersona(p.persona)} />
    </div>
  );
}
