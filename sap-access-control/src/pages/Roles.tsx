import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { EstadoCuenta, EtiquetaConciliacion, Paises, SinDatos } from '../components/comunes';
import { Aviso, Card, Encabezado, Stat, TablaDatos, Texto2, type Columna } from '../components/ui';
import { nombrePersona, type CuentaAnalizada, type RolAnalizado } from '../lib/analisis';
import { descargarCsv } from '../lib/exportar';
import { fecha } from '../lib/formato';
import { useEstado } from '../lib/modelo';

export function Roles() {
  const { modelo } = useEstado();
  const [q, setQ] = useState('');
  const filtrados = useMemo(
    () => (modelo?.roles ?? []).filter((r) => r.agrName.includes(q.trim().toUpperCase())),
    [modelo, q],
  );
  if (!modelo) return <SinDatos />;
  if (!modelo.fuentes.AGR_USERS) {
    return (
      <div>
        <Encabezado titulo="Roles" />
        <Aviso titulo="Falta AGR_USERS">Importá la exportación de AGR_USERS en <Link className="enlace" to="/cargas">Cargas</Link> para ver los roles asignados.</Aviso>
      </div>
    );
  }
  const columnas: Columna<RolAnalizado>[] = [
    { id: 'rol', titulo: 'Rol', valor: (r) => r.agrName,
      render: (r) => <Link className="enlace mono" to={`/roles/${encodeURIComponent(r.agrName)}`}>{r.agrName}</Link> },
    { id: 'cuentas', titulo: 'Cuentas con el rol vigente', valor: (r) => r.cuentasVigentes.length, numerica: true },
    ...(modelo.fuentes.RRHH ? [{ id: 'pob', titulo: 'De la población objetivo', valor: (r: RolAnalizado) => r.cuentasPoblacion, numerica: true }] : []),
    { id: 'venc', titulo: 'Asignaciones vencidas', valor: (r) => r.vencidas, numerica: true },
    { id: 'fut', titulo: 'Futuras', valor: (r) => r.futuras, numerica: true },
    { id: 'col', titulo: 'Con COL_FLAG', valor: (r) => r.viaCompuesto, numerica: true },
  ];
  return (
    <div>
      <Encabezado
        titulo="Roles"
        subtitulo="Roles presentes en AGR_USERS. La distinción simple/compuesto y su contenido se completarán con AGR_DEFINE y AGR_AGRS."
        acciones={
          <button className="boton" onClick={() => descargarCsv(`roles_${modelo.ref}.csv`, ['Rol', 'Cuentas vigentes', 'De la población', 'Vencidas', 'Futuras', 'Con COL_FLAG'],
            filtrados.map((r) => [r.agrName, r.cuentasVigentes.length, r.cuentasPoblacion, r.vencidas, r.futuras, r.viaCompuesto]))}>
            Exportar CSV
          </button>
        }
      />
      <input className="campo mb-3 w-full sm:w-72" placeholder="Buscar rol…" value={q} onChange={(e) => setQ(e.target.value)} />
      <TablaDatos key={q} filas={filtrados} columnas={columnas} clave={(r) => r.agrName} ordenInicial={{ id: 'cuentas', asc: false }} />
    </div>
  );
}

export function RolDetalle() {
  const { agr = '' } = useParams();
  const { modelo } = useEstado();
  if (!modelo) return <SinDatos />;
  const rol = modelo.rolPorNombre.get(agr);
  if (!rol) {
    return (
      <div>
        <Encabezado titulo={<span className="mono" style={{ fontSize: 'inherit' }}>{agr}</span>} />
        <Aviso tono="alerta">El rol no tiene asignaciones en el snapshot activo.</Aviso>
      </div>
    );
  }
  const cuentas = rol.cuentasVigentes.map((u) => modelo.cuentaPorNombre.get(u)).filter(Boolean) as CuentaAnalizada[];
  const fechaAsig = (c: CuentaAnalizada) => c.asignaciones.find((a) => a.asignacion.agrName === agr && a.estado === 'vigente');
  const columnas: Columna<CuentaAnalizada>[] = [
    { id: 'u', titulo: 'Usuario', valor: (c) => c.bname, render: (c) => <Link className="enlace mono" to={`/cuentas/${encodeURIComponent(c.bname)}`}>{c.bname}</Link> },
    { id: 'p', titulo: 'Persona', valor: (c) => (c.personas[0] ? nombrePersona(c.personas[0]) : '') },
    { id: 'area', titulo: 'Área', valor: (c) => c.personas[0]?.area ?? '' },
    { id: 'pais', titulo: 'Países', valor: (c) => c.paises.join(','), render: (c) => <Paises paises={c.paises} /> },
    { id: 'e', titulo: 'Estado cuenta', valor: (c) => (c.utilizable ? 0 : 1), render: (c) => <EstadoCuenta c={c} /> },
    { id: 'c', titulo: 'Conciliación', valor: (c) => c.conciliacion, render: (c) => <EtiquetaConciliacion c={c} /> },
    { id: 'h', titulo: 'Asignado hasta', valor: (c) => fechaAsig(c)?.asignacion.toDat ?? null, render: (c) => fecha(fechaAsig(c)?.asignacion.toDat) },
  ];
  const areas = new Map<string, number>();
  for (const c of cuentas) {
    const a = c.personas[0]?.area || 'Sin área';
    areas.set(a, (areas.get(a) ?? 0) + 1);
  }
  return (
    <div className="space-y-4">
      <Link to="/roles" className="enlace text-sm">← Roles</Link>
      <Encabezado titulo={<span className="mono" style={{ fontSize: 'inherit' }}>{rol.agrName}</span>} subtitulo="Consulta inversa: quiénes tienen este rol vigente y de qué área provienen." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat etiqueta="Cuentas con el rol vigente" valor={rol.cuentasVigentes.length} />
        <Stat etiqueta="De la población objetivo" valor={modelo.fuentes.RRHH ? rol.cuentasPoblacion : '—'} />
        <Stat etiqueta="Asignaciones vencidas" valor={rol.vencidas} />
        <Stat etiqueta="Usuarios fuera de USR02" valor={rol.cuentasHuerfanas} />
      </div>
      {modelo.fuentes.RRHH && areas.size > 0 && (
        <Card titulo="Áreas que reciben el rol">
          <Texto2 className="mb-2">Un rol presente en muchas áreas distintas puede indicar un rol demasiado genérico o asignaciones cruzadas. Es una señal, no una conclusión.</Texto2>
          <ul className="flex flex-wrap gap-2 text-sm">
            {[...areas.entries()].sort((a, b) => b[1] - a[1]).map(([a, n]) => (
              <li key={a} className="rounded-md px-2 py-1" style={{ background: 'var(--surface-2)' }}>{a}: <strong>{n}</strong></li>
            ))}
          </ul>
        </Card>
      )}
      <TablaDatos filas={cuentas} columnas={columnas} clave={(c) => c.bname} />
    </div>
  );
}
