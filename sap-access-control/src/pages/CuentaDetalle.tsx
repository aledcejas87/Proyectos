import { Link, useParams } from 'react-router-dom';
import { EstadoCuenta, EtiquetaConciliacion, Paises, SinDatos } from '../components/comunes';
import { Aviso, Card, Dato, Encabezado, Etiqueta, Severidad, TablaDatos, Texto2, type Columna } from '../components/ui';
import { nombrePersona, SENAL_POR_CODIGO, type AsignacionAnalizada } from '../lib/analisis';
import { descargarCsv } from '../lib/exportar';
import { fecha } from '../lib/formato';
import { useEstado } from '../lib/modelo';
import { esFechaAbierta } from '../lib/sap';

export function CuentaDetalle() {
  const { bname = '' } = useParams();
  const { modelo } = useEstado();
  if (!modelo) return <SinDatos />;
  const c = modelo.cuentaPorNombre.get(bname);
  if (!c) {
    const huerfanas = modelo.asignacionesHuerfanas.filter((a) => a.asignacion.uname === bname);
    return (
      <div>
        <Encabezado titulo={<span className="mono" style={{ fontSize: 'inherit' }}>{bname}</span>} />
        <Aviso tono="alerta" titulo="La cuenta no está en USR02 de este snapshot">
          {huerfanas.length
            ? `Tiene ${huerfanas.length} asignación(es) en AGR_USERS. Puede tratarse de extracciones de distinto momento o de un filtro aplicado en USR02.`
            : 'No hay datos para este usuario en el snapshot activo.'}
        </Aviso>
        <Link to="/cuentas" className="enlace mt-4 inline-block text-sm">← Volver a cuentas</Link>
      </div>
    );
  }
  const u = c.cuenta;
  const columnas: Columna<AsignacionAnalizada>[] = [
    { id: 'rol', titulo: 'Rol', valor: (a) => a.asignacion.agrName,
      render: (a) => <Link className="enlace mono" to={`/roles/${encodeURIComponent(a.asignacion.agrName)}`}>{a.asignacion.agrName}</Link> },
    { id: 'estado', titulo: 'Estado', valor: (a) => a.estado,
      render: (a) => a.estado === 'vigente'
        ? a.porVencer ? <Etiqueta tono="alerta">Vence en {a.diasParaVencer} d</Etiqueta> : <Etiqueta tono="bueno">Vigente</Etiqueta>
        : a.estado === 'vencida' ? <Etiqueta tono="neutro">Vencida</Etiqueta> : <Etiqueta tono="acento">Futura</Etiqueta> },
    { id: 'desde', titulo: 'Desde', valor: (a) => a.asignacion.fromDat, render: (a) => fecha(a.asignacion.fromDat) },
    { id: 'hasta', titulo: 'Hasta', valor: (a) => a.asignacion.toDat, render: (a) => fecha(a.asignacion.toDat) },
    { id: 'col', titulo: 'COL_FLAG', valor: (a) => a.asignacion.colFlag || null,
      render: (a) => a.asignacion.colFlag ? <span title="Probablemente recibido vía rol compuesto (interpretación a validar)">{a.asignacion.colFlag}</span> : '—' },
    { id: 'org', titulo: 'ORG_FLAG', valor: (a) => a.asignacion.orgFlag || null },
  ];
  const vigentes = c.asignaciones.filter((a) => a.estado === 'vigente').length;

  return (
    <div className="space-y-4">
      <Link to="/cuentas" className="enlace text-sm">← Cuentas</Link>
      <Encabezado
        titulo={<span className="mono" style={{ fontSize: 'inherit' }}>{c.bname}</span>}
        subtitulo={c.personas.length ? c.personas.map(nombrePersona).join(' / ') : 'Sin persona vinculada'}
        acciones={
          <button
            className="boton"
            onClick={() =>
              descargarCsv(`ficha_${c.bname}_${modelo.ref}.csv`, ['Usuario', 'Rol', 'Estado', 'Desde', 'Hasta', 'COL_FLAG', 'ORG_FLAG', 'Fecha de extracción'],
                c.asignaciones.map((a) => [c.bname, a.asignacion.agrName, a.estado, a.asignacion.fromDat, a.asignacion.toDat, a.asignacion.colFlag, a.asignacion.orgFlag, modelo.ref]))
            }
          >
            Exportar roles
          </button>
        }
      />

      {c.senales.length > 0 && (
        <Card titulo="Señales para revisar">
          <ul className="space-y-2">
            {c.senales.map((s) => (
              <li key={s} className="flex flex-wrap items-start gap-3">
                <div className="w-28 shrink-0"><Severidad nivel={SENAL_POR_CODIGO[s].severidad} /></div>
                <div className="min-w-0 flex-1 text-sm">
                  <div className="font-medium">{SENAL_POR_CODIGO[s].titulo}</div>
                  <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{SENAL_POR_CODIGO[s].descripcion(modelo.parametros)}</div>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Cuenta SAP (USR02)">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Dato etiqueta="Tipo" tecnico="USTYP">{c.tipo}</Dato>
            <Dato etiqueta="Estado"><EstadoCuenta c={c} /></Dato>
            <Dato etiqueta="Bloqueo" tecnico="UFLAG">
              {u.uflagTexto || (u.uflag ?? '—')} {c.motivosBloqueo.length > 0 && <span className="block text-xs" style={{ color: 'var(--text-secondary)' }}>{c.motivosBloqueo.join(' · ')}</span>}
            </Dato>
            <Dato etiqueta="Grupo de usuarios" tecnico="CLASS">{u.clase || '—'}</Dato>
            <Dato etiqueta="Válido desde" tecnico="GLTGV">{u.gltgv ? fecha(u.gltgv) : 'Sin límite'}</Dato>
            <Dato etiqueta="Válido hasta" tecnico="GLTGB">{esFechaAbierta(u.gltgb) ? 'Sin límite' : fecha(u.gltgb)}</Dato>
            <Dato etiqueta="Último acceso registrado" tecnico="TRDAT/LTIME">
              {u.trdat ? `${fecha(u.trdat)} ${u.ltime ?? ''} (hace ${c.diasSinAcceso} d)` : 'Sin registro'}
            </Dato>
          </dl>
        </Card>
        <Card titulo="Persona (RR. HH.)">
          {c.personas.length === 0 ? (
            <div className="space-y-2">
              <EtiquetaConciliacion c={c} />
              <Texto2>
                {modelo.fuentes.RRHH
                  ? 'No hay ningún empleado con este usuario SAP en la planilla de RR. HH. del snapshot.'
                  : 'Todavía no se cargó la planilla de RR. HH. en este snapshot.'}
              </Texto2>
            </div>
          ) : (
            <div className="space-y-4">
              <EtiquetaConciliacion c={c} />
              {c.personas.map((p) => (
                <dl key={p.id} className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <Dato etiqueta="Nombre">{nombrePersona(p)}</Dato>
                  <Dato etiqueta="Legajo">{p.idEmpleado || '—'}</Dato>
                  <Dato etiqueta="Estado en RR. HH.">{p.estadoTexto || '—'}</Dato>
                  <Dato etiqueta="Correo">{p.email || '—'}</Dato>
                  <Dato etiqueta="Área">{p.area || '—'}</Dato>
                  <Dato etiqueta="Cargo">{p.cargo || '—'}</Dato>
                  <Dato etiqueta="Responsable">{p.responsable || '—'}</Dato>
                  <Dato etiqueta="Sociedad">{p.sociedad || '—'}</Dato>
                  <Dato etiqueta="País de pertenencia">{p.paisPertenencia ?? '—'}</Dato>
                  <Dato etiqueta="Países de operación"><Paises paises={p.paisesOperacion} /></Dato>
                  {Object.entries(p.extra).map(([k, v]) => <Dato key={k} etiqueta={k}>{v}</Dato>)}
                </dl>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card titulo={`Roles asignados (${vigentes} vigentes de ${c.asignaciones.length} filas)`}>
        {modelo.fuentes.AGR_USERS ? (
          <TablaDatos filas={c.asignaciones} columnas={columnas} clave={(a) => a.asignacion.id ?? `${a.asignacion.agrName}${a.asignacion.fromDat}`} ordenInicial={{ id: 'estado', asc: false }} />
        ) : (
          <Texto2>Todavía no se cargó AGR_USERS en este snapshot.</Texto2>
        )}
      </Card>

      <Card titulo="Qué está validado y qué falta">
        <ul className="list-disc space-y-1 pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          <li><strong style={{ color: 'var(--text-primary)' }}>Validado (nivel 1):</strong> existencia de la cuenta, tipo, bloqueo y validez según USR02{modelo.fuentes.AGR_USERS && '; roles asignados con sus vigencias según AGR_USERS'}{modelo.fuentes.RRHH && '; vínculo con RR. HH. por usuario SAP'}.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>Falta extraer:</strong> jerarquía de roles compuestos (AGR_AGRS), transacciones de menú (AGR_TCODES), objetos y valores de autorización (AGR_1251/1252), perfiles asignados directamente, catálogos y apps Fiori, y datos de uso real.</li>
          <li><strong style={{ color: 'var(--text-primary)' }}>No se puede afirmar todavía:</strong> qué transacciones puede ejecutar efectivamente, si tiene conflictos SoD, ni si usa los accesos asignados.</li>
        </ul>
      </Card>
    </div>
  );
}
