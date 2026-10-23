// Modelo local. Cada carga pertenece a una fotografía fechada (snapshot):
// nunca se sobrescribe otra fotografía, y todas las fechas se evalúan contra
// la fecha de extracción del snapshot, no contra "hoy".

export type Fuente = 'USR02' | 'AGR_USERS' | 'RRHH';

export interface Snapshot {
  id?: number;
  nombre: string;
  fechaExtraccion: string; // ISO YYYY-MM-DD
  sistema: string;
  mandante: string;
  notas: string;
  creadoEn: string; // ISO datetime
  esDemo: boolean;
}

export interface RechazoFila {
  fila: number; // número de fila en el archivo (1 = primera fila)
  motivo: string;
}

export interface Importacion {
  id?: number;
  snapshotId: number;
  fuente: Fuente;
  archivo: string;
  tamano: number;
  sha256: string;
  importadoEn: string;
  responsable: string;
  hoja?: string;
  filaEncabezado: number;
  /** columna del archivo -> campo interno */
  mapeo: Record<string, string>;
  columnasSensiblesDescartadas: string[];
  columnasIgnoradas: string[];
  filasLeidas: number;
  aceptadas: number;
  rechazadas: number;
  duplicadas: number;
  advertencias: string[];
  muestraRechazos: RechazoFila[];
  /** false cuando una carga posterior de la misma fuente la reemplazó dentro del snapshot */
  vigente: boolean;
}

export interface CuentaUsr02 {
  id?: number;
  snapshotId: number;
  importId: number;
  bname: string;
  ustyp: string;
  uflag: number | null;
  uflagTexto: string; // valor original, por si no es numérico
  gltgv: string | null; // ISO o null = sin límite
  gltgb: string | null;
  trdat: string | null;
  ltime: string | null; // HH:MM:SS
  clase: string;
}

export interface AsignacionRol {
  id?: number;
  snapshotId: number;
  importId: number;
  uname: string;
  agrName: string;
  fromDat: string | null;
  toDat: string | null;
  colFlag: string;
  orgFlag: string;
}

export type Pais = 'UY' | 'CL';

export interface PersonaRrhh {
  id?: number;
  snapshotId: number;
  importId: number;
  idEmpleado: string;
  nombre: string;
  apellido: string;
  email: string;
  usuariosSap: string[];
  vigente: boolean | null;
  estadoTexto: string;
  area: string;
  cargo: string;
  responsable: string;
  paisPertenencia: Pais | null;
  paisesOperacion: Pais[];
  sociedad: string;
  extra: Record<string, string>;
}

export interface Parametros {
  diasSinAcceso: number;
  diasPorVencer: number;
  umbralRolesAltos: number;
}

export const PARAMETROS_DEFAULT: Parametros = {
  diasSinAcceso: 90,
  diasPorVencer: 30,
  umbralRolesAltos: 25,
};

export interface Ajuste {
  clave: string;
  valor: unknown;
}
