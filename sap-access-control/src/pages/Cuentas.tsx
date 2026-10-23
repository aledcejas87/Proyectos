import { useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { EstadoCuenta, EtiquetaConciliacion, ListaSenales, Paises, SinDatos } from '../components/comunes';
import { Encabezado, TablaDatos, Texto2, type Columna } from '../components/ui';
import {
  ETIQUETA_CONCILIACION,
  nombrePersona,
  SENAL_POR_CODIGO,
  SENALES,
  type CodigoSenal,
  type CuentaAnalizada,
} from '../lib/analisis';
import { descargarCsv } from '../lib/exportar';
import { fecha } from '../lib/formato';
import { useEstado } from '../lib/modelo';

const VISTAS = {
  objetivo: { titulo: 'Población objetivo', ayuda: 'Cuentas conciliadas con un empleado vigente de RR. HH.' },
  revisar: { titulo: 'Para revisar', ayuda: 'Cuentas de diálogo que no concilian con un empleado vigente (sin RR. HH., baja, ambiguas o sin dato de vigencia). No se ocultan: se revisan.' },
  tecnicas: { titulo: 'Técnicas y no diálogo', ayuda: 'Cuentas de tipo sistema, comunicación, servicio o referencia. Fuera de la población principal, pero visibles.' },
  todas: { titulo: 'Todas', ayuda: 'Todas las cuentas de USR02 del snapshot.' },
} as const;
type Vista = keyof typeof VISTAS;

export function Cuentas() {
  const { modelo } = useEstado();
  const [params, setParams] = useSearchParams();
  const hayRrhh = !!modelo?.fuentes.RRHH;
  const vista = (params.get('vista') as Vista) || (hayRrhh ? 'objetivo' : 'todas');
  const q = params.get('q') ?? '';
  const senal = params.get('senal') as CodigoSenal | null;
  const tipo = params.get('tipo') ?? '';
  const estado = params.get('estado') ?? '';
  const pais = params.get('pais') ?? '';
  const conc = params.get('conc') ?? '';

  const set = (k: string, v: string) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v);
    else p.delete(k);
    setParams(p, { replace: true });
  };

  const filtradas = useMemo(() => {
    if (!modelo) return [];
    const texto = q.trim().toUpperCase();
    return modelo.cuentas.filter((c) => {
      if (vista === 'objetivo' && !c.enPoblacion) return false;
      if (vista === 'revisar' && (!c.humano || c.enPoblacion)) return false;
      if (vista === 'tecnicas' && c.humano) return false;
      if (senal && !c.senales.includes(senal)) return false;
      if (tipo === 'humano' && !c.humano) return false;
      if (tipo === 'tecnico' && c.humano) return false;
      if (estado === 'utilizable' && !c.utilizable) return false;
      if (estado === 'bloqueada' && !c.bloqueada) return false;
      if (estado === 'vencida' && (c.bloqueada || c.vigenciaCuenta === 'vigente')) return false;
      if (pais === 'UY' && !c.paises.includes('UY')) return false;
      if (pais === 'CL' && !c.paises.includes('CL')) return false;
      if (pais === 'ambos' && c.paises.length < 2) return false;
      if (pais === 'sin' && c.paises.length) return false;
      if (conc && c.conciliacion !== conc) return false;
      if (texto) {
        const hay = [c.bname, c.cuenta.clase, ...c.personas.map((p) => `${nombrePersona(p)} ${p.area} ${p.cargo} ${p.email}`)]
          .join(' ')
          .toUpperCase();
        if (!hay.includes(texto)) return false;
      }
      return true;
    });
  }, [modelo, vista, q, senal, tipo, estado, pais, conc]);

  if (!modelo) return <SinDatos />;

  const columnas: Columna<CuentaAnalizada>[] = [
    { id: 'bname', titulo: 'Usuario', valor: (c) => c.bname,
      render: (c) => <Link className="enlace mono" to={`/cuentas/${encodeURIComponent(c.bname)}`}>{c.bname}</Link> },
    { id: 'persona', titulo: 'Persona', valor: (c) => (c.personas[0] ? nombrePersona(c.personas[0]) : ''),
      render: (c) => c.personas.length ? (
        <div>
          <div>{c.personas.map(nombrePersona).join(' / ')}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{[c.personas[0].area, c.personas[0].cargo].filter(Boolean).join(' · ')}</div>
        </div>
      ) : <span style={{ color: 'var(--muted)' }}>—</span> },
    { id: 'pais', titulo: 'Países', valor: (c) => c.paises.join(','), render: (c) => <Paises paises={c.paises} /> },
    { id: 'tipo', titulo: 'Tipo', valor: (c) => c.tipo },
    { id: 'estado', titulo: 'Estado', valor: (c) => (c.bloqueada ? 2 : c.utilizable ? 0 : 1), render: (c) => <EstadoCuenta c={c} /> },
    { id: 'acceso', titulo: 'Último acceso', valor: (c) => c.cuenta.trdat,
      render: (c) => c.cuenta.trdat ? (
        <span>{fecha(c.cuenta.trdat)}<span className="block text-xs" style={{ color: 'var(--muted)' }}>hace {c.diasSinAcceso} d</span></span>
      ) : <span style={{ color: 'var(--muted)' }}>Sin registro</span> },
    { id: 'roles', titulo: 'Roles vigentes', valor: (c) => c.rolesVigentes.length, numerica: true },
    { id: 'conc', titulo: 'Conciliación', valor: (c) => c.conciliacion, render: (c) => <EtiquetaConciliacion c={c} /> },
    { id: 'senales', titulo: 'Señales', valor: (c) => c.senales.length, render: (c) => <ListaSenales senales={c.senales} /> },
  ];

  const exportar = () =>
    descargarCsv(
      `cuentas_${modelo.ref}_${vista}.csv`,
      ['Usuario', 'Persona', 'Legajo', 'Área', 'Cargo', 'Países', 'Tipo', 'Bloqueada', 'Motivo bloqueo', 'Válido desde', 'Válido hasta',
        'Último acceso', 'Grupo', 'Roles vigentes', 'Conciliación', 'Señales', 'Fecha de extracción'],
      filtradas.map((c) => [
        c.bname, c.personas.map(nombrePersona).join(' / '), c.personas.map((p) => p.idEmpleado).join(' / '),
        c.personas[0]?.area, c.personas[0]?.cargo, c.paises.join(', '), c.tipo, c.bloqueada ? 'Sí' : 'No',
        c.motivosBloqueo.join(' · '), c.cuenta.gltgv, c.cuenta.gltgb, c.cuenta.trdat, c.cuenta.clase, c.rolesVigentes.length,
        ETIQUETA_CONCILIACION[c.conciliacion], c.senales.map((s) => SENAL_POR_CODIGO[s].titulo).join(' · '), modelo.ref,
      ]),
    );

  return (
    <div>
      <Encabezado
        titulo="Cuentas SAP"
        subtitulo={VISTAS[vista].ayuda}
        acciones={<button className="boton" onClick={exportar}>Exportar CSV</button>}
      />
      <div className="mb-3 flex flex-wrap gap-1" role="tablist">
        {(Object.keys(VISTAS) as Vista[]).map((v) => {
          const n = modelo.cuentas.filter((c) =>
            v === 'objetivo' ? c.enPoblacion : v === 'revisar' ? c.humano && !c.enPoblacion : v === 'tecnicas' ? !c.humano : true,
          ).length;
          const deshabilitada = !hayRrhh && (v === 'objetivo' || v === 'revisar');
          return (
            <button
              key={v}
              role="tab"
              aria-selected={vista === v}
              disabled={deshabilitada}
              className="boton"
              style={vista === v ? { background: 'var(--accent-soft)', color: 'var(--accent)', borderColor: 'var(--accent)' } : undefined}
              onClick={() => set('vista', v)}
              title={deshabilitada ? 'Requiere cargar RR. HH.' : undefined}
            >
              {VISTAS[v].titulo} <span style={{ color: 'var(--muted)' }}>{deshabilitada ? '—' : n}</span>
            </button>
          );
        })}
      </div>
      <div className="mb-3 flex flex-wrap gap-2">
        <input className="campo w-full sm:w-64" placeholder="Buscar usuario, nombre, área…" value={q} onChange={(e) => set('q', e.target.value)} />
        <select className="campo" value={estado} onChange={(e) => set('estado', e.target.value)} aria-label="Estado">
          <option value="">Estado: todos</option>
          <option value="utilizable">Utilizables</option>
          <option value="bloqueada">Bloqueadas</option>
          <option value="vencida">Validez vencida/futura</option>
        </select>
        <select className="campo" value={tipo} onChange={(e) => set('tipo', e.target.value)} aria-label="Tipo">
          <option value="">Tipo: todos</option>
          <option value="humano">Diálogo</option>
          <option value="tecnico">Técnicas / otras</option>
        </select>
        {hayRrhh && (
          <>
            <select className="campo" value={pais} onChange={(e) => set('pais', e.target.value)} aria-label="País">
              <option value="">País: todos</option>
              <option value="UY">Opera en Uruguay</option>
              <option value="CL">Opera en Chile</option>
              <option value="ambos">Opera en ambos</option>
              <option value="sin">Sin país</option>
            </select>
            <select className="campo" value={conc} onChange={(e) => set('conc', e.target.value)} aria-label="Conciliación">
              <option value="">Conciliación: todas</option>
              {Object.entries(ETIQUETA_CONCILIACION).filter(([k]) => k !== 'sin_datos_rrhh').map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </>
        )}
        <select className="campo max-w-full" value={senal ?? ''} onChange={(e) => set('senal', e.target.value)} aria-label="Señal">
          <option value="">Señal: cualquiera</option>
          {SENALES.map((s) => <option key={s.codigo} value={s.codigo}>{s.titulo}</option>)}
        </select>
      </div>
      {senal && (
        <Texto2 className="mb-3">
          Filtrando por: <strong>{SENAL_POR_CODIGO[senal].titulo}</strong>. {SENAL_POR_CODIGO[senal].descripcion(modelo.parametros)}
        </Texto2>
      )}
      <TablaDatos key={params.toString()} filas={filtradas} columnas={columnas} clave={(c) => c.bname} />
    </div>
  );
}
