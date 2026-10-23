import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { AsistenteImportacion } from '../components/AsistenteImportacion';
import { Aviso, Card, Encabezado, Etiqueta, Texto2 } from '../components/ui';
import { db, eliminarSnapshot, getAjuste, setAjuste } from '../db/db';
import type { Fuente, Importacion } from '../db/types';
import { cargarDemo, generarDemo } from '../lib/demo';
import { descargarTexto } from '../lib/exportar';
import { ETIQUETA_FUENTE, FUENTES } from '../lib/fuentes';
import { bytes, fecha, fechaHora, numero } from '../lib/formato';
import { useEstado } from '../lib/modelo';

const FUENTES_ORDEN: Fuente[] = ['USR02', 'AGR_USERS', 'RRHH'];
const hoy = () => new Date().toISOString().slice(0, 10);

function NuevoSnapshot({ onCreado }: { onCreado: () => void }) {
  const [nombre, setNombre] = useState('');
  const [fechaExt, setFechaExt] = useState(hoy());
  const [sistema, setSistema] = useState('');
  const [mandante, setMandante] = useState('');
  const [notas, setNotas] = useState('');
  return (
    <Card titulo="Nuevo snapshot">
      <Texto2 className="mb-3">
        Un snapshot es la fotografía de SAP en una fecha. Usá uno nuevo por cada extracción, así podés comparar en el tiempo
        sin sobrescribir datos anteriores. Todas las vigencias se evalúan contra la fecha de extracción.
      </Texto2>
      <form
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const id = await db.snapshots.add({
            nombre: nombre.trim() || `Extracción ${fecha(fechaExt)}`,
            fechaExtraccion: fechaExt,
            sistema: sistema.trim(),
            mandante: mandante.trim(),
            notas: notas.trim(),
            creadoEn: new Date().toISOString(),
            esDemo: false,
          });
          await setAjuste('snapshotActivo', id);
          onCreado();
        }}
      >
        <label className="text-sm">
          <span className="block text-xs" style={{ color: 'var(--muted)' }}>Nombre</span>
          <input className="campo w-full" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej.: Línea base inicial" />
        </label>
        <label className="text-sm">
          <span className="block text-xs" style={{ color: 'var(--muted)' }}>Fecha de extracción *</span>
          <input type="date" required className="campo w-full" value={fechaExt} onChange={(e) => setFechaExt(e.target.value)} />
        </label>
        <label className="text-sm">
          <span className="block text-xs" style={{ color: 'var(--muted)' }}>Sistema (SID)</span>
          <input className="campo w-full" value={sistema} onChange={(e) => setSistema(e.target.value)} placeholder="Ej.: PRD" />
        </label>
        <label className="text-sm">
          <span className="block text-xs" style={{ color: 'var(--muted)' }}>Mandante</span>
          <input className="campo w-full" value={mandante} onChange={(e) => setMandante(e.target.value)} placeholder="Ej.: 300" />
        </label>
        <label className="text-sm sm:col-span-2 lg:col-span-3">
          <span className="block text-xs" style={{ color: 'var(--muted)' }}>Notas (filtros aplicados, transacción usada, contexto)</span>
          <input className="campo w-full" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej.: SE16N sin filtros, exportación a Excel" />
        </label>
        <div className="flex items-end">
          <button className="boton boton-primario" type="submit">Crear snapshot</button>
        </div>
      </form>
    </Card>
  );
}

function DetalleImportacion({ imp }: { imp: Importacion }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer">
        <span className="font-medium">{ETIQUETA_FUENTE[imp.fuente]}</span> · {imp.archivo} · {fechaHora(imp.importadoEn)}{' '}
        {!imp.vigente && <Etiqueta>Reemplazada</Etiqueta>}
      </summary>
      <div className="mt-2 grid gap-1 pl-4 text-xs" style={{ color: 'var(--text-secondary)' }}>
        <div>Responsable: {imp.responsable} · Tamaño: {bytes(imp.tamano)}{imp.hoja ? ` · Hoja: ${imp.hoja}` : ''} · Fila de encabezados: {imp.filaEncabezado}</div>
        <div className="mono break-all">SHA-256: {imp.sha256}</div>
        <div>
          Leídas {numero(imp.filasLeidas)} · aceptadas {numero(imp.aceptadas)} · rechazadas {numero(imp.rechazadas)} · duplicadas {numero(imp.duplicadas)}
        </div>
        <div>Columnas usadas: {Object.entries(imp.mapeo).map(([k, v]) => `${k} → ${v}`).join(', ') || '—'}</div>
        {imp.columnasIgnoradas.length > 0 && <div>Columnas no importadas: {imp.columnasIgnoradas.join(', ')}</div>}
        {imp.columnasSensiblesDescartadas.length > 0 && (
          <div style={{ color: 'var(--status-critical)' }}>Columnas de credenciales descartadas: {imp.columnasSensiblesDescartadas.join(', ')}</div>
        )}
        {imp.advertencias.length > 0 && (
          <ul className="list-disc pl-4">{imp.advertencias.map((a) => <li key={a}>{a}</li>)}</ul>
        )}
      </div>
    </details>
  );
}

export function Cargas() {
  const { snapshots, snapshotActivoId } = useEstado();
  const [creando, setCreando] = useState(false);
  const [importando, setImportando] = useState<Fuente | null>(null);
  const [generando, setGenerando] = useState(false);
  const activo = snapshots.find((s) => s.id === snapshotActivoId);
  const importaciones = useLiveQuery(
    () => (snapshotActivoId === null ? Promise.resolve([] as Importacion[]) : db.importaciones.where('snapshotId').equals(snapshotActivoId).reverse().sortBy('importadoEn')),
    [snapshotActivoId],
  );
  const responsable = useLiveQuery(() => getAjuste('responsable', ''), []) ?? '';

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Cargas y snapshots"
        subtitulo="Importación manual de exportaciones de SAP y RR. HH. Los archivos se leen en este navegador y no se envían a ningún servidor."
        acciones={
          <>
            <button className="boton" onClick={() => setCreando((v) => !v)}>{creando ? 'Cerrar' : 'Nuevo snapshot'}</button>
            <button
              className="boton"
              disabled={generando}
              onClick={async () => {
                setGenerando(true);
                try {
                  await cargarDemo();
                } finally {
                  setGenerando(false);
                }
              }}
            >
              {generando ? 'Generando…' : 'Cargar ejemplo ficticio'}
            </button>
            <button
              className="boton"
              onClick={() => {
                const d = generarDemo();
                descargarTexto('ejemplo_USR02.csv', d.usr02);
                descargarTexto('ejemplo_AGR_USERS.csv', d.agrUsers);
                descargarTexto('ejemplo_RRHH.csv', d.rrhh);
              }}
            >
              Descargar archivos de ejemplo
            </button>
          </>
        }
      />

      {(creando || !snapshots.length) && <NuevoSnapshot onCreado={() => setCreando(false)} />}

      {activo && (
        <Card
          titulo={<>Snapshot activo: {activo.nombre}</>}
          accion={
            <button
              className="boton boton-peligro"
              onClick={async () => {
                if (confirm(`¿Eliminar el snapshot "${activo.nombre}" y todos sus datos importados? No se puede deshacer.`)) {
                  await eliminarSnapshot(activo.id!);
                }
              }}
            >
              Eliminar snapshot
            </button>
          }
        >
          <Texto2 className="mb-3">
            Extracción del {fecha(activo.fechaExtraccion)}
            {activo.sistema && ` · sistema ${activo.sistema}`}
            {activo.mandante && ` · mandante ${activo.mandante}`}
            {activo.notas && ` · ${activo.notas}`}
          </Texto2>
          <div className="grid gap-3 md:grid-cols-3">
            {FUENTES_ORDEN.map((f) => {
              const imp = importaciones?.find((i) => i.fuente === f && i.vigente);
              return (
                <div key={f} className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-medium">{FUENTES[f].titulo}</div>
                    <Etiqueta tono={imp ? 'bueno' : 'neutro'}>{imp ? 'Cargado' : 'Pendiente'}</Etiqueta>
                  </div>
                  <div className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {imp ? `${imp.archivo} · ${numero(imp.aceptadas)} filas · ${imp.advertencias.length} advertencia(s)` : FUENTES[f].descripcion}
                  </div>
                  <button className="boton mt-2" onClick={() => setImportando(f)} disabled={importando !== null}>
                    {imp ? 'Reemplazar' : 'Importar'}
                  </button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activo && importando && (
        <AsistenteImportacion
          key={importando}
          fuente={importando}
          snapshotId={activo.id!}
          responsableInicial={responsable}
          onCerrar={() => setImportando(null)}
        />
      )}

      {activo && (
        <Card titulo="Historial de cargas de este snapshot">
          {importaciones?.length ? (
            <div className="space-y-2">{importaciones.map((i) => <DetalleImportacion key={i.id} imp={i} />)}</div>
          ) : (
            <Texto2>Todavía no hay cargas.</Texto2>
          )}
        </Card>
      )}

      {snapshots.length > 0 && (
        <Card titulo="Todos los snapshots">
          <table className="tabla">
            <thead>
              <tr><th>Fecha de extracción</th><th>Nombre</th><th>Sistema / mandante</th><th>Creado</th><th></th></tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <tr key={s.id}>
                  <td>{fecha(s.fechaExtraccion)}</td>
                  <td>{s.nombre} {s.esDemo && <Etiqueta tono="alerta">Ficticio</Etiqueta>}</td>
                  <td>{[s.sistema, s.mandante].filter(Boolean).join(' / ') || '—'}</td>
                  <td>{fechaHora(s.creadoEn)}</td>
                  <td>
                    {s.id === snapshotActivoId ? (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>Activo</span>
                    ) : (
                      <button className="enlace text-sm" onClick={() => setAjuste('snapshotActivo', s.id)}>Activar</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Aviso titulo="Recordatorios para extraer de SE16N">
        <ul className="list-disc space-y-0.5 pl-5">
          <li><span className="mono">USR02</span>: seleccionar solo BNAME, USTYP, UFLAG, GLTGV, GLTGB, TRDAT, LTIME y CLASS. Nunca BCODE, PASSCODE ni PWDSALTEDHASH (si vienen, la app los descarta).</li>
          <li><span className="mono">AGR_USERS</span>: UNAME, AGR_NAME, FROM_DAT, TO_DAT, COL_FLAG y ORG_FLAG, sin excluir asignaciones caducadas.</li>
          <li>Ajustar el número máximo de aciertos de SE16N para no truncar el resultado, y anotar fecha, mandante y filtros en el snapshot.</li>
          <li>Conservar los archivos originales en una ubicación con acceso restringido, según la política interna de Scienza.</li>
        </ul>
      </Aviso>
    </div>
  );
}
