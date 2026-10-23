import { useMemo, useState } from 'react';
import { setAjuste } from '../db/db';
import type { Fuente } from '../db/types';
import { esColumnaSensible, FUENTES, puntajeEncabezado } from '../lib/fuentes';
import { EXTRA, guardarImportacion, IGNORAR, mapeoSugerido, procesar, type Mapeo, type ResultadoProceso } from '../lib/importador';
import { armarTabla, detectarFilaEncabezado, leerArchivo, type ArchivoLeido } from '../lib/lectura';
import { bytes, numero } from '../lib/formato';
import { texto } from '../lib/sap';
import { Aviso, Card, Texto2 } from './ui';

export function AsistenteImportacion({
  fuente,
  snapshotId,
  responsableInicial,
  onCerrar,
}: {
  fuente: Fuente;
  snapshotId: number;
  responsableInicial: string;
  onCerrar: () => void;
}) {
  const def = FUENTES[fuente];
  const [archivo, setArchivo] = useState<ArchivoLeido | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [leyendo, setLeyendo] = useState(false);
  const [hoja, setHoja] = useState(0);
  const [filaEnc, setFilaEnc] = useState(0);
  const [mapeo, setMapeo] = useState<Mapeo>({});
  const [resultado, setResultado] = useState<ResultadoProceso | null>(null);
  const [responsable, setResponsable] = useState(responsableInicial);
  const [guardando, setGuardando] = useState(false);
  const [hecho, setHecho] = useState(false);

  const tabla = useMemo(() => (archivo ? armarTabla(archivo.hojas[hoja], filaEnc) : null), [archivo, hoja, filaEnc]);

  const prepararHoja = (a: ArchivoLeido, h: number) => {
    const fila = detectarFilaEncabezado(fuente, a.hojas[h].filas);
    setHoja(h);
    setFilaEnc(fila);
    setMapeo(mapeoSugerido(fuente, armarTabla(a.hojas[h], fila).encabezados));
    setResultado(null);
  };

  const elegir = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setResultado(null);
    setLeyendo(true);
    try {
      const a = await leerArchivo(f);
      setArchivo(a);
      // Elegimos la hoja cuyos encabezados mejor coinciden con la fuente.
      const puntajes = a.hojas.map((h) => puntajeEncabezado(fuente, (h.filas[detectarFilaEncabezado(fuente, h.filas)] ?? []).map(texto)));
      prepararHoja(a, puntajes.indexOf(Math.max(...puntajes)));
    } catch (e) {
      setArchivo(null);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLeyendo(false);
    }
  };

  const cambiarFila = (n: number) => {
    if (!archivo) return;
    setFilaEnc(n);
    setMapeo(mapeoSugerido(fuente, armarTabla(archivo.hojas[hoja], n).encabezados));
    setResultado(null);
  };

  const previsualizar = () => {
    if (!tabla) return;
    setError(null);
    try {
      setResultado(procesar(fuente, tabla, mapeo));
    } catch (e) {
      setResultado(null);
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const confirmar = async () => {
    if (!archivo || !resultado || !tabla) return;
    setGuardando(true);
    try {
      await setAjuste('responsable', responsable);
      await guardarImportacion(
        {
          snapshotId, fuente, archivo: archivo.nombre, tamano: archivo.tamano, sha256: archivo.sha256, responsable,
          hoja: archivo.hojas.length > 1 ? archivo.hojas[hoja].nombre : undefined, filaEncabezado: filaEnc, mapeo,
          advertenciasLectura: archivo.advertencias,
        },
        resultado,
      );
      setHecho(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setGuardando(false);
    }
  };

  const usados = new Set(Object.values(mapeo));
  const muestra = (i: number) => (tabla?.filas.slice(0, 3).map((f) => texto(f[i])).filter(Boolean) ?? []).join(' · ');

  if (hecho && resultado) {
    return (
      <Card titulo={`${def.titulo}: importación completada`}>
        <Texto2>{numero(resultado.registros.length)} filas guardadas en el snapshot. El tablero ya refleja los datos nuevos.</Texto2>
        <button className="boton boton-primario mt-3" onClick={onCerrar}>Cerrar</button>
      </Card>
    );
  }

  return (
    <Card titulo={`Importar ${def.titulo}`} accion={<button className="boton" onClick={onCerrar}>Cancelar</button>}>
      <Texto2 className="mb-3">{def.descripcion} Formatos: .xlsx, .csv o .txt (incluido el "texto sin convertir" de SAP).</Texto2>
      <input
        type="file"
        accept=".xlsx,.xlsm,.csv,.txt,.tsv,.xls"
        className="block w-full text-sm"
        onChange={(e) => elegir(e.target.files?.[0])}
        disabled={leyendo || guardando}
      />
      {leyendo && <Texto2 className="mt-2">Leyendo archivo…</Texto2>}
      {error && <div className="mt-3"><Aviso tono="critico" titulo="No se pudo continuar">{error}</Aviso></div>}

      {archivo && tabla && (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            <span>Archivo: <strong>{archivo.nombre}</strong> ({bytes(archivo.tamano)})</span>
            <span className="mono break-all">SHA-256: {archivo.sha256.slice(0, 16)}…</span>
            <span>{numero(tabla.filas.length)} filas de datos</span>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            {archivo.hojas.length > 1 && (
              <label className="text-sm">
                <span className="block text-xs" style={{ color: 'var(--muted)' }}>Hoja</span>
                <select className="campo" value={hoja} onChange={(e) => prepararHoja(archivo, Number(e.target.value))}>
                  {archivo.hojas.map((h, i) => <option key={i} value={i}>{h.nombre}</option>)}
                </select>
              </label>
            )}
            <label className="text-sm">
              <span className="block text-xs" style={{ color: 'var(--muted)' }}>Fila de encabezados</span>
              <input
                type="number"
                min={1}
                max={Math.min(archivo.hojas[hoja].filas.length, 50)}
                className="campo w-24"
                value={filaEnc + 1}
                onChange={(e) => cambiarFila(Math.max(0, Number(e.target.value) - 1))}
              />
            </label>
            <Texto2>Detectada automáticamente; cambiala si los títulos no coinciden.</Texto2>
          </div>

          <div className="overflow-x-auto rounded-lg" style={{ border: '1px solid var(--border)' }}>
            <table className="tabla">
              <thead>
                <tr><th>Columna del archivo</th><th>Ejemplos</th><th>Se usa como</th></tr>
              </thead>
              <tbody>
                {tabla.encabezados.map((h, i) => {
                  const sensible = esColumnaSensible(h);
                  return (
                    <tr key={h}>
                      <td className="mono">{h}</td>
                      <td className="max-w-xs truncate" style={{ color: 'var(--text-secondary)' }}>
                        {sensible ? '••••• (oculto)' : muestra(i) || '—'}
                      </td>
                      <td>
                        {sensible ? (
                          <span className="text-xs font-medium" style={{ color: 'var(--status-critical)' }}>Descartada: credenciales</span>
                        ) : (
                          <select
                            className="campo"
                            value={mapeo[h] ?? IGNORAR}
                            onChange={(e) => {
                              setMapeo({ ...mapeo, [h]: e.target.value });
                              setResultado(null);
                            }}
                          >
                            <option value={IGNORAR}>No importar</option>
                            {def.campos.map((c) => (
                              <option key={c.campo} value={c.campo} disabled={usados.has(c.campo) && mapeo[h] !== c.campo}>
                                {c.etiqueta} — {c.descripcion}{c.requerido ? ' (obligatorio)' : ''}
                              </option>
                            ))}
                            {def.admiteExtras && <option value={EXTRA}>Conservar como atributo adicional</option>}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {fuente === 'RRHH' && (
            <Texto2>
              Por minimización de datos, las columnas no reconocidas quedan en "No importar". Elegí "Conservar como atributo
              adicional" solo para lo que aporte a la estructura organizativa.
            </Texto2>
          )}

          <button className="boton" onClick={previsualizar}>Validar y previsualizar</button>

          {resultado && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ['Filas leídas', resultado.filasLeidas],
                  ['Aceptadas', resultado.registros.length],
                  ['Rechazadas', resultado.rechazadas],
                  ['Duplicadas', resultado.duplicadas],
                ].map(([e, v]) => (
                  <div key={e} className="rounded-lg p-3" style={{ background: 'var(--surface-2)' }}>
                    <div className="text-xs" style={{ color: 'var(--muted)' }}>{e}</div>
                    <div className="text-lg font-semibold">{numero(v as number)}</div>
                  </div>
                ))}
              </div>
              {resultado.advertencias.length > 0 && (
                <Aviso tono="alerta" titulo="Advertencias">
                  <ul className="list-disc pl-5">{resultado.advertencias.map((a) => <li key={a}>{a}</li>)}</ul>
                </Aviso>
              )}
              {resultado.muestraRechazos.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer">Ver filas rechazadas (muestra)</summary>
                  <ul className="mt-1 pl-5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {resultado.muestraRechazos.map((r) => <li key={r.fila}>Fila {r.fila}: {r.motivo}</li>)}
                  </ul>
                </details>
              )}
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="block text-xs" style={{ color: 'var(--muted)' }}>Responsable de la carga</span>
                  <input className="campo w-64" value={responsable} onChange={(e) => setResponsable(e.target.value)} placeholder="Nombre y apellido" />
                </label>
                <button className="boton boton-primario" disabled={!responsable.trim() || guardando || !resultado.registros.length} onClick={confirmar}>
                  {guardando ? 'Guardando…' : `Confirmar importación (${numero(resultado.registros.length)} filas)`}
                </button>
              </div>
              <Texto2>Si esta fuente ya estaba cargada en el snapshot, sus filas se reemplazan; la carga anterior queda en el historial.</Texto2>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
