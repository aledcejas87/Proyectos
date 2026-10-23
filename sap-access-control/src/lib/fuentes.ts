import type { Fuente } from '../db/types';

// Definición de cada fuente: los campos que la aplicación entiende y los
// encabezados con que suelen llegar (nombre técnico, o etiqueta de SE16N en
// español, inglés o alemán según el idioma de logon). La detección es solo
// una sugerencia: el mapeo se confirma siempre en pantalla antes de importar.

export interface CampoFuente {
  campo: string;
  etiqueta: string;
  descripcion: string;
  requerido: boolean;
  alias: string[];
}

export interface DefinicionFuente {
  fuente: Fuente;
  titulo: string;
  descripcion: string;
  campos: CampoFuente[];
  /** Si true, las columnas no mapeadas se pueden conservar como atributos adicionales. */
  admiteExtras: boolean;
}

export const FUENTES: Record<Fuente, DefinicionFuente> = {
  USR02: {
    fuente: 'USR02',
    titulo: 'USR02 — Cuentas de usuario',
    descripcion: 'Exportación de SE16N con tipo, bloqueo, validez y último acceso de cada cuenta.',
    admiteExtras: false,
    campos: [
      { campo: 'bname', etiqueta: 'BNAME', descripcion: 'Usuario SAP', requerido: true,
        alias: ['bname', 'usuario', 'nombre de usuario', 'nombre usuario', 'user', 'user name', 'username', 'benutzer', 'benutzername'] },
      { campo: 'ustyp', etiqueta: 'USTYP', descripcion: 'Tipo de usuario', requerido: false,
        alias: ['ustyp', 'tipo de usuario', 'tipo usuario', 'user type', 'benutzertyp'] },
      { campo: 'uflag', etiqueta: 'UFLAG', descripcion: 'Indicador de bloqueo', requerido: false,
        alias: ['uflag', 'status bloqueo usuario', 'estado bloqueo usuario', 'bloqueo de usuario', 'bloqueo usuario', 'status de bloqueo', 'user lock status', 'lock status', 'benutzersperre', 'sperrkennzeichen'] },
      { campo: 'gltgv', etiqueta: 'GLTGV', descripcion: 'Válido desde', requerido: false,
        alias: ['gltgv', 'valido desde', 'usuario valido desde', 'valid from', 'user valid from', 'gultig von', 'gueltig von'] },
      { campo: 'gltgb', etiqueta: 'GLTGB', descripcion: 'Válido hasta', requerido: false,
        alias: ['gltgb', 'valido hasta', 'usuario valido hasta', 'valid through', 'valid to', 'valid until', 'user valid to', 'gultig bis', 'gueltig bis'] },
      { campo: 'trdat', etiqueta: 'TRDAT', descripcion: 'Fecha de último acceso', requerido: false,
        alias: ['trdat', 'fecha ultima entrada', 'fecha de la ultima entrada', 'fecha ultima entrada al sistema', 'fecha de la ultima entrada al sistema', 'ultimo login', 'fecha ultimo login', 'fecha ultimo acceso', 'last logon date', 'last logon', 'letztes login datum', 'datum letzte anmeldung'] },
      { campo: 'ltime', etiqueta: 'LTIME', descripcion: 'Hora de último acceso', requerido: false,
        alias: ['ltime', 'hora ultima entrada', 'hora de la ultima entrada', 'hora ultimo login', 'hora ultimo acceso', 'last logon time', 'uhrzeit letzte anmeldung'] },
      { campo: 'clase', etiqueta: 'CLASS', descripcion: 'Grupo de usuarios', requerido: false,
        alias: ['class', 'grupo de usuarios', 'grupo usuarios', 'grupo de usuario', 'user group', 'benutzergruppe'] },
    ],
  },
  AGR_USERS: {
    fuente: 'AGR_USERS',
    titulo: 'AGR_USERS — Asignaciones de roles',
    descripcion: 'Exportación de SE16N con cada rol asignado a cada usuario y su período de validez. Incluí filas caducadas.',
    admiteExtras: false,
    campos: [
      { campo: 'uname', etiqueta: 'UNAME', descripcion: 'Usuario SAP', requerido: true,
        alias: ['uname', 'usuario', 'nombre de usuario', 'nombre usuario', 'user', 'user name', 'benutzer', 'benutzername'] },
      { campo: 'agrName', etiqueta: 'AGR_NAME', descripcion: 'Rol', requerido: true,
        alias: ['agr name', 'agrname', 'rol', 'nombre de rol', 'nombre del rol', 'role', 'role name', 'rolle'] },
      { campo: 'fromDat', etiqueta: 'FROM_DAT', descripcion: 'Inicio de asignación', requerido: false,
        alias: ['from dat', 'fromdat', 'fecha inicio', 'fecha de inicio', 'valido desde', 'inicio validez', 'start date', 'valid from', 'beginndatum', 'gultig ab'] },
      { campo: 'toDat', etiqueta: 'TO_DAT', descripcion: 'Fin de asignación', requerido: false,
        alias: ['to dat', 'todat', 'fecha fin', 'fecha de fin', 'fecha final', 'valido hasta', 'fin validez', 'end date', 'valid to', 'enddatum', 'gultig bis'] },
      { campo: 'colFlag', etiqueta: 'COL_FLAG', descripcion: 'Indicador rol compuesto', requerido: false,
        alias: ['col flag', 'colflag', 'rol compuesto', 'indicador rol compuesto', 'asignado via rol compuesto', 'composite role', 'sammelrolle'] },
      { campo: 'orgFlag', etiqueta: 'ORG_FLAG', descripcion: 'Indicador de origen', requerido: false,
        alias: ['org flag', 'orgflag', 'asignacion indirecta', 'asignacion via estructura organizativa', 'indirect assignment', 'indirekte zuordnung'] },
    ],
  },
  RRHH: {
    fuente: 'RRHH',
    titulo: 'RR. HH. — Empleados',
    descripcion: 'Planilla o exportación del sistema de RR. HH. Solo las columnas necesarias; el resto se puede ignorar.',
    admiteExtras: true,
    campos: [
      { campo: 'idEmpleado', etiqueta: 'ID empleado', descripcion: 'Legajo / número de empleado', requerido: false,
        alias: ['id empleado', 'id', 'legajo', 'numero de empleado', 'nro empleado', 'n empleado', 'codigo empleado', 'employee id', 'personal number', 'pernr'] },
      { campo: 'nombreCompleto', etiqueta: 'Nombre completo', descripcion: 'Si nombre y apellido vienen juntos', requerido: false,
        alias: ['nombre completo', 'nombre y apellido', 'apellido y nombre', 'empleado', 'colaborador', 'full name'] },
      { campo: 'nombre', etiqueta: 'Nombre', descripcion: 'Nombre(s)', requerido: false,
        alias: ['nombre', 'nombres', 'first name', 'vorname'] },
      { campo: 'apellido', etiqueta: 'Apellido', descripcion: 'Apellido(s)', requerido: false,
        alias: ['apellido', 'apellidos', 'last name', 'surname', 'nachname'] },
      { campo: 'email', etiqueta: 'Correo', descripcion: 'Correo corporativo', requerido: false,
        alias: ['email', 'e mail', 'correo', 'correo electronico', 'mail', 'correo corporativo'] },
      { campo: 'usuarioSap', etiqueta: 'Usuario SAP', descripcion: 'Clave de conciliación con USR02.BNAME (admite varios separados por ; o ,)', requerido: true,
        alias: ['usuario sap', 'usuario de sap', 'user sap', 'sap user', 'bname', 'id sap', 'cuenta sap', 'usuario'] },
      { campo: 'vigente', etiqueta: 'Vigente', descripcion: 'Empleado vigente (Sí/No, Activo/Baja…)', requerido: false,
        alias: ['vigente', 'activo', 'estado', 'situacion', 'estado empleado', 'status', 'condicion'] },
      { campo: 'area', etiqueta: 'Área', descripcion: 'Área / departamento', requerido: false,
        alias: ['area', 'departamento', 'gerencia', 'sector', 'unidad', 'department'] },
      { campo: 'cargo', etiqueta: 'Cargo', descripcion: 'Cargo / puesto en RR. HH.', requerido: false,
        alias: ['cargo', 'puesto', 'posicion', 'job title', 'position'] },
      { campo: 'responsable', etiqueta: 'Responsable', descripcion: 'Responsable jerárquico', requerido: false,
        alias: ['responsable', 'jefe', 'supervisor', 'jefe directo', 'manager', 'reporta a'] },
      { campo: 'paisPertenencia', etiqueta: 'País de pertenencia', descripcion: 'UY / CL', requerido: false,
        alias: ['pais', 'pais de pertenencia', 'pais empleador', 'pais contratacion', 'country'] },
      { campo: 'paisesOperacion', etiqueta: 'Países de operación', descripcion: 'UY, CL o ambos', requerido: false,
        alias: ['paises de operacion', 'pais de operacion', 'paises operacion', 'opera en', 'operating countries'] },
      { campo: 'sociedad', etiqueta: 'Sociedad', descripcion: 'Sociedad / razón social empleadora', requerido: false,
        alias: ['sociedad', 'empresa', 'razon social', 'company', 'company code'] },
    ],
  },
};

/** Columnas que jamás deben importarse: material de autenticación. */
const SENSIBLES_TECNICOS = new Set([
  'bcode', 'passcode', 'pwdsaltedhash', 'codvn', 'codvc', 'codvs',
  'ocod1', 'ocod2', 'ocod3', 'ocod4', 'ocod5', 'pwdhistory', 'security policy',
]);
const SENSIBLES_PALABRAS = /contrasena|password|passwort|kennwort|hash|clave de acceso|codigo de clave|pwd/;

export function normalizarEncabezado(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function esColumnaSensible(encabezado: string): boolean {
  const n = normalizarEncabezado(encabezado);
  return SENSIBLES_TECNICOS.has(n) || SENSIBLES_PALABRAS.test(n);
}

/** Devuelve el campo sugerido para un encabezado, o null. */
export function sugerirCampo(fuente: Fuente, encabezado: string): string | null {
  const n = normalizarEncabezado(encabezado);
  if (!n) return null;
  for (const c of FUENTES[fuente].campos) {
    if (c.alias.includes(n)) return c.campo;
  }
  return null;
}

/** Cuántos encabezados de una fila reconoce la fuente: sirve para encontrar la fila de títulos. */
export function puntajeEncabezado(fuente: Fuente, fila: string[]): number {
  const campos = new Set<string>();
  for (const celda of fila) {
    const c = sugerirCampo(fuente, celda);
    if (c) campos.add(c);
  }
  return campos.size;
}

export const ETIQUETA_FUENTE: Record<Fuente, string> = {
  USR02: 'USR02',
  AGR_USERS: 'AGR_USERS',
  RRHH: 'RR. HH.',
};
