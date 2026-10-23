import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Fuente } from '../db/types';
import type { CodigoSenal, CuentaAnalizada, Modelo } from '../lib/analisis';
import { ETIQUETA_CONCILIACION, SENAL_POR_CODIGO } from '../lib/analisis';
import { cargarDemo } from '../lib/demo';
import { ETIQUETA_FUENTE } from '../lib/fuentes';
import { fecha } from '../lib/formato';
import { Card, Etiqueta, Severidad, Texto2, type Tono } from './ui';

export function SinDatos() {
  const [cargando, setCargando] = useState(false);
  return (
    <div className="mx-auto max-w-2xl py-10">
      <h1 className="text-xl font-semibold">Todavía no hay datos cargados</h1>
      <Texto2 className="mt-2">
        Para empezar, creá un snapshot e importá las exportaciones de <span className="mono">USR02</span> y{' '}
        <span className="mono">AGR_USERS</span> desde SE16N (y, si la tenés, la planilla de RR. HH.). Todo se procesa en
        este navegador: los archivos no se envían a ningún servidor.
      </Texto2>
      <div className="mt-5 flex flex-wrap gap-2">
        <Link to="/cargas" className="boton boton-primario">Ir a cargas</Link>
        <button
          className="boton"
          disabled={cargando}
          onClick={async () => {
            setCargando(true);
            try {
              await cargarDemo();
            } finally {
              setCargando(false);
            }
          }}
        >
          {cargando ? 'Generando…' : 'Probar con datos de ejemplo (ficticios)'}
        </button>
      </div>
    </div>
  );
}

const ORDEN_FUENTES: Fuente[] = ['USR02', 'AGR_USERS', 'RRHH'];

/** Qué está cargado y qué todavía no se puede afirmar. */
export function PanelCerteza({ modelo, compacto = false }: { modelo: Modelo; compacto?: boolean }) {
  return (
    <Card titulo="Grado de certeza de esta vista">
      <div className="flex flex-wrap gap-2">
        {ORDEN_FUENTES.map((f) => {
          const imp = modelo.fuentes[f];
          return (
            <Etiqueta key={f} tono={imp ? 'bueno' : 'neutro'} title={imp ? `${imp.archivo} · ${imp.aceptadas} filas` : 'No cargado'}>
              {ETIQUETA_FUENTE[f]}: {imp ? 'cargado' : 'no cargado'}
            </Etiqueta>
          );
        })}
        {['Roles compuestos (AGR_AGRS)', 'Transacciones (AGR_TCODES)', 'Autorizaciones (AGR_1251)', 'Fiori', 'Uso real', 'Reglas SoD'].map((f) => (
          <Etiqueta key={f} tono="neutro">{f}: pendiente</Etiqueta>
        ))}
      </div>
      {!compacto && (
        <Texto2 className="mt-3">
          Fecha de referencia: <strong>{fecha(modelo.ref)}</strong> (fecha de extracción del snapshot). Lo que se muestra es
          el <strong>nivel 1 — asignación</strong>: relaciones registradas en las fuentes cargadas. Todavía no permite afirmar
          capacidad efectiva, uso real ni conflictos SoD.
        </Texto2>
      )}
    </Card>
  );
}

export function EstadoCuenta({ c }: { c: CuentaAnalizada }) {
  if (c.bloqueada) return <Etiqueta tono="critico" title={c.motivosBloqueo.join(' · ')}>Bloqueada</Etiqueta>;
  if (c.vigenciaCuenta === 'vencida') return <Etiqueta tono="alerta">Validez vencida</Etiqueta>;
  if (c.vigenciaCuenta === 'futura') return <Etiqueta tono="alerta">Validez futura</Etiqueta>;
  return <Etiqueta tono="bueno">Utilizable</Etiqueta>;
}

const TONO_CONCILIACION: Record<CuentaAnalizada['conciliacion'], Tono> = {
  conciliada: 'bueno',
  no_vigente: 'critico',
  vigencia_desconocida: 'alerta',
  ambigua: 'alerta',
  sin_rrhh: 'alerta',
  sin_datos_rrhh: 'neutro',
};

export function EtiquetaConciliacion({ c }: { c: CuentaAnalizada }) {
  return <Etiqueta tono={TONO_CONCILIACION[c.conciliacion]}>{ETIQUETA_CONCILIACION[c.conciliacion]}</Etiqueta>;
}

export function ListaSenales({ senales }: { senales: CodigoSenal[] }) {
  if (!senales.length) return <span style={{ color: 'var(--muted)' }}>—</span>;
  const orden = { alta: 0, media: 1, info: 2 } as const;
  const ordenadas = [...senales].sort((a, b) => orden[SENAL_POR_CODIGO[a].severidad] - orden[SENAL_POR_CODIGO[b].severidad]);
  return (
    <span className="flex flex-wrap gap-1">
      {ordenadas.map((s) => (
        <span key={s} title={SENAL_POR_CODIGO[s].titulo} className="inline-flex">
          <Severidad nivel={SENAL_POR_CODIGO[s].severidad} compacto />
        </span>
      ))}
    </span>
  );
}

export function Paises({ paises }: { paises: string[] }) {
  if (!paises.length) return <span style={{ color: 'var(--muted)' }}>—</span>;
  return <span className="whitespace-nowrap">{paises.join(' · ')}</span>;
}
