import { Link } from 'react-router-dom';
import { SinDatos } from '../components/comunes';
import { Aviso, Card, Encabezado, Texto2 } from '../components/ui';
import { ETIQUETA_CONCILIACION, type Conciliacion } from '../lib/analisis';
import { descargarCsv } from '../lib/exportar';
import { numero } from '../lib/formato';
import { useEstado } from '../lib/modelo';
import { ETIQUETA_FUENTE } from '../lib/fuentes';

export function Calidad() {
  const { modelo } = useEstado();
  if (!modelo) return <SinDatos />;
  const conteo = new Map<Conciliacion, number>();
  for (const c of modelo.cuentas.filter((c) => c.humano)) conteo.set(c.conciliacion, (conteo.get(c.conciliacion) ?? 0) + 1);

  return (
    <div className="space-y-4">
      <Encabezado
        titulo="Calidad de datos y conciliación"
        subtitulo="Lo que no concilia no se borra: se muestra acá para revisarlo con RR. HH. e IT antes de sacar conclusiones."
      />

      {modelo.fuentes.RRHH ? (
        <Card titulo="Conciliación de cuentas de diálogo con RR. HH.">
          <table className="tabla max-w-xl">
            <tbody>
              {[...conteo.entries()].map(([k, n]) => (
                <tr key={k}>
                  <td><Link className="enlace" to={`/cuentas?vista=todas&tipo=humano&conc=${k}`}>{ETIQUETA_CONCILIACION[k]}</Link></td>
                  <td className="num">{numero(n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Texto2 className="mt-3">
            Regla actual: una cuenta concilia cuando su <span className="mono">BNAME</span> coincide exactamente (sin distinguir
            mayúsculas) con el usuario SAP informado por RR. HH. La regla definitiva está pendiente de acordar.
          </Texto2>
        </Card>
      ) : (
        <Aviso titulo="Sin RR. HH.">Sin la planilla de RR. HH. no se puede conciliar personas con cuentas.</Aviso>
      )}

      {modelo.calidad.length === 0 && <Aviso tono="bueno">No se detectaron problemas de calidad con las fuentes cargadas.</Aviso>}
      {modelo.calidad.map((q) => (
        <Card
          key={q.codigo}
          titulo={`${q.titulo} (${numero(q.elementos.length)})`}
          accion={<button className="boton" onClick={() => descargarCsv(`${q.codigo}_${modelo.ref}.csv`, ['Elemento'], q.elementos.map((e) => [e]))}>Exportar</button>}
        >
          <Texto2 className="mb-2">{q.descripcion}</Texto2>
          <ul className="flex max-h-60 flex-wrap gap-1.5 overflow-auto">
            {q.elementos.slice(0, 300).map((e) => {
              const usuario = e.split(' — ')[0];
              const enlazable = q.codigo === 'agr_huerfanas';
              return (
                <li key={e} className="mono rounded px-1.5 py-0.5" style={{ background: 'var(--surface-2)' }}>
                  {enlazable ? <Link className="enlace" to={`/cuentas/${encodeURIComponent(usuario)}`}>{e}</Link> : e}
                </li>
              );
            })}
            {q.elementos.length > 300 && <li className="text-xs" style={{ color: 'var(--muted)' }}>… y {q.elementos.length - 300} más (exportar para ver todos)</li>}
          </ul>
        </Card>
      ))}

      <Card titulo="Advertencias de las cargas vigentes">
        {(['USR02', 'AGR_USERS', 'RRHH'] as const).map((f) => {
          const imp = modelo.fuentes[f];
          return (
            <div key={f} className="mb-3 last:mb-0">
              <div className="text-sm font-medium">{ETIQUETA_FUENTE[f]}</div>
              {!imp ? (
                <Texto2>No cargado.</Texto2>
              ) : imp.advertencias.length ? (
                <ul className="list-disc pl-5 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {imp.advertencias.map((a) => <li key={a}>{a}</li>)}
                </ul>
              ) : (
                <Texto2>Sin advertencias.</Texto2>
              )}
            </div>
          );
        })}
      </Card>
    </div>
  );
}
