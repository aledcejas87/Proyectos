import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { PARAMETROS_DEFAULT, type Parametros, type Snapshot } from '../db/types';
import { construirModelo, type Modelo } from './analisis';

interface Estado {
  cargando: boolean;
  snapshots: Snapshot[];
  snapshotActivoId: number | null;
  modelo: Modelo | null;
}

const Ctx = createContext<Estado>({ cargando: true, snapshots: [], snapshotActivoId: null, modelo: null });

export function ModeloProvider({ children }: { children: ReactNode }) {
  const snapshots = useLiveQuery(() => db.snapshots.orderBy('fechaExtraccion').reverse().toArray());
  const ajustes = useLiveQuery(() => db.ajustes.toArray());
  const elegido = ajustes?.find((a) => a.clave === 'snapshotActivo')?.valor as number | undefined;
  const parametros: Parametros = {
    ...PARAMETROS_DEFAULT,
    ...(ajustes?.find((a) => a.clave === 'parametros')?.valor as Partial<Parametros> | undefined),
  };
  const activoId = snapshots?.find((s) => s.id === elegido)?.id ?? snapshots?.[0]?.id ?? null;

  const datos = useLiveQuery(async () => {
    if (activoId === null) return null;
    const [importaciones, usr02, agrUsers, rrhh] = await Promise.all([
      db.importaciones.where('snapshotId').equals(activoId).toArray(),
      db.usr02.where('snapshotId').equals(activoId).toArray(),
      db.agrUsers.where('snapshotId').equals(activoId).toArray(),
      db.rrhh.where('snapshotId').equals(activoId).toArray(),
    ]);
    return { importaciones, usr02, agrUsers, rrhh };
  }, [activoId]);

  const parametrosClave = JSON.stringify(parametros);
  const snapshot = snapshots?.find((s) => s.id === activoId);
  const modelo = useMemo(() => {
    if (!snapshot || !datos) return null;
    return construirModelo({ snapshot, ...datos, parametros: JSON.parse(parametrosClave) as Parametros });
  }, [snapshot, datos, parametrosClave]);

  const cargando = snapshots === undefined || ajustes === undefined || (activoId !== null && datos === undefined);
  return (
    <Ctx.Provider value={{ cargando, snapshots: snapshots ?? [], snapshotActivoId: activoId, modelo }}>
      {children}
    </Ctx.Provider>
  );
}

export function useEstado() {
  return useContext(Ctx);
}
