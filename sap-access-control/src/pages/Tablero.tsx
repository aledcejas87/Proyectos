import { Link } from 'react-router-dom';
import { PanelCerteza, SinDatos } from '../components/comunes';
import { BarraProporcion, Card, Encabezado, Severidad, Stat, Texto2 } from '../components/ui';
import { SENALES } from '../lib/analisis';
import { ETIQUETA_FUENTE } from '../lib/fuentes';
import { fecha, numero } from '../lib/formato';
import { useEstado } from '../lib/modelo';

export function Tablero() {
  const { modelo } = useEstado();
  if (!modelo) return <SinDatos />;
  const { cuentas, roles, snapshot, fuentes, parametros, conteoSenales, calidad } = modelo;

  const humanas = cuentas.filter((c) => c.humano);
  const utilizables = cuentas.filter((c) => c.utilizable);
  const poblacion = cuentas.filter((c) => c.enPoblacion);
  const asignVigentes = cuentas.reduce((a, c) => a + c.asignaciones.filter((x) => x.estado === 'vigente').length, 0);
  const uy = poblacion.filter((c) => c.paises.includes('UY') && !c.paises.includes('CL')).length;
  const cl = poblacion.filter((c) => c.paises.includes('CL') && !c.paises.includes('UY')).length;
  const ambos = poblacion.filter((c) => c.paises.length > 1).length;
  const sinPais = poblacion.length - uy - cl - ambos;

  const senalesDisponibles = SENALES.filter((s) => s.requiere.every((f) => fuentes[f]));
  const senalesNoDisponibles = SENALES.filter((s) => !s.requiere.every((f) => fuentes[f]));

  return (
    <div className="space-y-5">
      <Encabezado
        titulo="Situación actual de accesos"
        subtitulo={
          <>
            {snapshot.nombre} · extracción del {fecha(snapshot.fechaExtraccion)}
            {snapshot.sistema && ` · sistema ${snapshot.sistema}`}
            {snapshot.mandante && ` · mandante ${snapshot.mandante}`}
          </>
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <Stat etiqueta="Cuentas SAP" valor={cuentas.length} detalle="en USR02" to="/cuentas?vista=todas" />
        <Stat etiqueta="Cuentas de diálogo" valor={humanas.length} detalle={`${numero(cuentas.length - humanas.length)} técnicas u otras`} to="/cuentas?vista=todas&tipo=humano" />
        <Stat etiqueta="Utilizables" valor={utilizables.length} detalle="sin bloqueo y con validez vigente" to="/cuentas?vista=todas&estado=utilizable" />
        <Stat
          etiqueta="Población objetivo"
          valor={fuentes.RRHH ? poblacion.length : '—'}
          detalle={fuentes.RRHH ? 'conciliadas con empleado vigente' : 'requiere RR. HH.'}
          to="/cuentas"
        />
        <Stat etiqueta="Roles distintos" valor={fuentes.AGR_USERS ? roles.length : '—'} detalle="con alguna asignación" to="/roles" />
        <Stat etiqueta="Asignaciones vigentes" valor={fuentes.AGR_USERS ? asignVigentes : '—'} detalle="a cuentas presentes en USR02" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card titulo="Estado de las cuentas">
          <BarraProporcion
            partes={[
              { etiqueta: 'Utilizables', valor: utilizables.length, color: 'var(--series-1)' },
              { etiqueta: 'Bloqueadas', valor: cuentas.filter((c) => c.bloqueada).length, color: 'var(--series-2)' },
              { etiqueta: 'Validez vencida o futura (sin bloqueo)', valor: cuentas.filter((c) => !c.bloqueada && c.vigenciaCuenta !== 'vigente').length, color: 'var(--series-4)' },
            ]}
          />
        </Card>
        <Card titulo="Población objetivo por país de operación">
          {fuentes.RRHH ? (
            <BarraProporcion
              partes={[
                { etiqueta: 'Solo Uruguay', valor: uy, color: 'var(--series-1)' },
                { etiqueta: 'Solo Chile', valor: cl, color: 'var(--series-2)' },
                { etiqueta: 'Ambos países', valor: ambos, color: 'var(--series-3)' },
                { etiqueta: 'Sin país', valor: sinPais, color: 'var(--baseline)' },
              ]}
            />
          ) : (
            <Texto2>Cargá la planilla de RR. HH. para identificar la población y los países de operación.</Texto2>
          )}
        </Card>
      </div>

      <Card titulo="Señales para revisar">
        <Texto2 className="mb-3">
          Son indicios calculados sobre las asignaciones registradas, no hallazgos confirmados. Cada uno lleva a la lista de
          cuentas correspondiente.
        </Texto2>
        <ul className="divide-y" style={{ borderColor: 'var(--gridline)' }}>
          {senalesDisponibles.map((s) => (
            <li key={s.codigo} className="flex flex-wrap items-start gap-3 py-2.5" style={{ borderColor: 'var(--gridline)' }}>
              <div className="w-28 shrink-0 pt-0.5"><Severidad nivel={s.severidad} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{s.titulo}</div>
                <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>{s.descripcion(parametros)}</div>
              </div>
              <Link
                to={`/cuentas?vista=todas&senal=${s.codigo}`}
                className="enlace shrink-0 text-right text-lg font-semibold tabular-nums"
                aria-label={`${conteoSenales[s.codigo]} cuentas: ${s.titulo}`}
              >
                {numero(conteoSenales[s.codigo])}
              </Link>
            </li>
          ))}
        </ul>
        {senalesNoDisponibles.length > 0 && (
          <Texto2 className="mt-3">
            {senalesNoDisponibles.length} señal(es) más se habilitan al cargar{' '}
            {[...new Set(senalesNoDisponibles.flatMap((s) => s.requiere.filter((f) => !fuentes[f])))].map((f) => ETIQUETA_FUENTE[f]).join(', ')}.
          </Texto2>
        )}
      </Card>

      {calidad.length > 0 && (
        <Card titulo="Calidad de datos" accion={<Link to="/calidad" className="enlace text-sm">Ver detalle</Link>}>
          <ul className="space-y-1 text-sm">
            {calidad.map((q) => (
              <li key={q.codigo}>
                {q.titulo}: <strong>{numero(q.elementos.length)}</strong>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PanelCerteza modelo={modelo} />
    </div>
  );
}
