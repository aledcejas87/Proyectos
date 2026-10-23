import Dexie, { type Table } from 'dexie';
import type {
  Ajuste,
  AsignacionRol,
  CuentaUsr02,
  Fuente,
  Importacion,
  Parametros,
  PersonaRrhh,
  Snapshot,
} from './types';
import { PARAMETROS_DEFAULT } from './types';

class AccessControlDB extends Dexie {
  snapshots!: Table<Snapshot, number>;
  importaciones!: Table<Importacion, number>;
  usr02!: Table<CuentaUsr02, number>;
  agrUsers!: Table<AsignacionRol, number>;
  rrhh!: Table<PersonaRrhh, number>;
  ajustes!: Table<Ajuste, string>;

  constructor() {
    super('sap-access-control-scienza');
    this.version(1).stores({
      snapshots: '++id, fechaExtraccion',
      importaciones: '++id, snapshotId, fuente, [snapshotId+fuente]',
      usr02: '++id, snapshotId, importId, [snapshotId+bname]',
      agrUsers: '++id, snapshotId, importId, [snapshotId+uname], [snapshotId+agrName]',
      rrhh: '++id, snapshotId, importId, *usuariosSap',
      ajustes: 'clave',
    });
  }
}

export const db = new AccessControlDB();

const TABLA_POR_FUENTE = {
  USR02: () => db.usr02,
  AGR_USERS: () => db.agrUsers,
  RRHH: () => db.rrhh,
} as const;

export function tablaDeFuente(fuente: Fuente) {
  return TABLA_POR_FUENTE[fuente]();
}

export async function getAjuste<T>(clave: string, porDefecto: T): Promise<T> {
  const fila = await db.ajustes.get(clave);
  return fila ? (fila.valor as T) : porDefecto;
}

export async function setAjuste(clave: string, valor: unknown) {
  await db.ajustes.put({ clave, valor });
}

export async function getParametros(): Promise<Parametros> {
  const guardado = await getAjuste<Partial<Parametros>>('parametros', {});
  return { ...PARAMETROS_DEFAULT, ...guardado };
}

export async function eliminarSnapshot(snapshotId: number) {
  await db.transaction('rw', [db.snapshots, db.importaciones, db.usr02, db.agrUsers, db.rrhh, db.ajustes], async () => {
    await db.usr02.where('snapshotId').equals(snapshotId).delete();
    await db.agrUsers.where('snapshotId').equals(snapshotId).delete();
    await db.rrhh.where('snapshotId').equals(snapshotId).delete();
    await db.importaciones.where('snapshotId').equals(snapshotId).delete();
    await db.snapshots.delete(snapshotId);
    const activo = await getAjuste<number | null>('snapshotActivo', null);
    if (activo === snapshotId) await db.ajustes.delete('snapshotActivo');
  });
}

export async function borrarTodo() {
  await db.delete();
  await db.open();
}
