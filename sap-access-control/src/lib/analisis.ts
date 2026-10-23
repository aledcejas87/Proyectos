import type {
  AsignacionRol,
  CuentaUsr02,
  Fuente,
  Importacion,
  Pais,
  Parametros,
  PersonaRrhh,
  Snapshot,
} from '../db/types';
import {
  decodificarUflag,
  diasEntre,
  etiquetaTipo,
  TIPOS_USUARIO,
  vigencia,
  type EstadoVigencia,
} from './sap';

// Todo lo que se calcula acá corresponde al NIVEL 1 (asignación) del
// documento base: describe relaciones registradas en las fuentes cargadas.
// No afirma capacidad efectiva ni uso real.

export type Conciliacion =
  | 'conciliada'
  | 'no_vigente'
  | 'vigencia_desconocida'
  | 'ambigua'
  | 'sin_rrhh'
  | 'sin_datos_rrhh';

export const ETIQUETA_CONCILIACION: Record<Conciliacion, string> = {
  conciliada: 'Empleado vigente',
  no_vigente: 'Persona no vigente',
  vigencia_desconocida: 'Vigencia sin dato',
  ambigua: 'Ambigua (varias personas)',
  sin_rrhh: 'Sin correspondencia RR. HH.',
  sin_datos_rrhh: 'RR. HH. no cargado',
};

export interface AsignacionAnalizada {
  asignacion: AsignacionRol;
  estado: EstadoVigencia;
  porVencer: boolean;
  diasParaVencer: number | null;
}

export interface CuentaAnalizada {
  bname: string;
  cuenta: CuentaUsr02;
  tipo: string;
  humano: boolean;
  bloqueada: boolean;
  motivosBloqueo: string[];
  vigenciaCuenta: EstadoVigencia;
  utilizable: boolean;
  nuncaAccedio: boolean;
  diasSinAcceso: number | null;
  personas: PersonaRrhh[];
  conciliacion: Conciliacion;
  enPoblacion: boolean;
  paises: Pais[];
  asignaciones: AsignacionAnalizada[];
  rolesVigentes: string[];
  senales: CodigoSenal[];
}

export interface RolAnalizado {
  agrName: string;
  asignaciones: number;
  vigentes: number;
  vencidas: number;
  futuras: number;
  viaCompuesto: number;
  cuentasVigentes: string[];
  cuentasPoblacion: number;
  cuentasHuerfanas: number;
}

export interface PersonaAnalizada {
  persona: PersonaRrhh;
  cuentas: string[];
  cuentasInexistentes: string[];
  rolesVigentes: number;
}

export type CodigoSenal =
  | 'baja_con_acceso'
  | 'sin_rrhh_utilizable'
  | 'ambigua'
  | 'no_dialogo_con_persona'
  | 'sin_acceso_prolongado'
  | 'nunca_accedio'
  | 'roles_altos'
  | 'sin_roles'
  | 'asig_por_vencer'
  | 'asig_vencidas'
  | 'vencida_no_bloqueada'
  | 'ambos_paises'
  | 'tipo_desconocido';

export type Severidad = 'alta' | 'media' | 'info';

export interface DefinicionSenal {
  codigo: CodigoSenal;
  titulo: string;
  descripcion: (p: Parametros) => string;
  severidad: Severidad;
  requiere: Fuente[];
}

export const SENALES: DefinicionSenal[] = [
  { codigo: 'baja_con_acceso', severidad: 'alta', requiere: ['USR02', 'RRHH'],
    titulo: 'Cuenta utilizable de persona no vigente',
    descripcion: () => 'La persona figura como no vigente en RR. HH., pero la cuenta no está bloqueada y su validez no venció. Confirmar con RR. HH. antes de actuar.' },
  { codigo: 'sin_rrhh_utilizable', severidad: 'alta', requiere: ['USR02', 'RRHH'],
    titulo: 'Cuenta de diálogo utilizable sin correspondencia en RR. HH.',
    descripcion: () => 'Cuenta humana activa que no coincide con ningún empleado. Puede ser un error de conciliación, una cuenta genérica o un tercero.' },
  { codigo: 'ambigua', severidad: 'media', requiere: ['USR02', 'RRHH'],
    titulo: 'Conciliación ambigua',
    descripcion: () => 'El mismo usuario SAP está informado en más de una persona de RR. HH.' },
  { codigo: 'no_dialogo_con_persona', severidad: 'media', requiere: ['USR02', 'RRHH'],
    titulo: 'Cuenta no de diálogo vinculada a una persona',
    descripcion: () => 'Cuenta de tipo sistema, servicio, comunicación o referencia asociada a un empleado. Verificar si es correcto.' },
  { codigo: 'sin_acceso_prolongado', severidad: 'media', requiere: ['USR02'],
    titulo: 'Cuenta utilizable sin acceso reciente',
    descripcion: (p) => `Último acceso registrado hace más de ${p.diasSinAcceso} días respecto de la fecha de extracción. No prueba que el acceso sea innecesario.` },
  { codigo: 'nunca_accedio', severidad: 'media', requiere: ['USR02'],
    titulo: 'Cuenta utilizable sin acceso registrado',
    descripcion: () => 'TRDAT vacío: no hay registro de último acceso. Puede ser una cuenta nueva o que solo usa mecanismos que no actualizan ese dato (validar).' },
  { codigo: 'roles_altos', severidad: 'info', requiere: ['USR02', 'AGR_USERS'],
    titulo: 'Cantidad alta de roles vigentes',
    descripcion: (p) => `${p.umbralRolesAltos} roles vigentes o más. Es una señal para revisar, no un riesgo comprobado.` },
  { codigo: 'sin_roles', severidad: 'info', requiere: ['USR02', 'AGR_USERS'],
    titulo: 'Cuenta utilizable sin roles vigentes',
    descripcion: () => 'No tiene asignaciones vigentes en AGR_USERS. Podría tener perfiles asignados directamente (no extraídos aún).' },
  { codigo: 'asig_por_vencer', severidad: 'info', requiere: ['AGR_USERS'],
    titulo: 'Asignaciones próximas a vencer',
    descripcion: (p) => `Al menos un rol vence dentro de los ${p.diasPorVencer} días siguientes a la extracción.` },
  { codigo: 'asig_vencidas', severidad: 'info', requiere: ['AGR_USERS'],
    titulo: 'Asignaciones vencidas registradas',
    descripcion: () => 'Tiene filas de AGR_USERS con fecha de fin anterior a la extracción. No otorgan acceso, pero sirven para trazabilidad.' },
  { codigo: 'vencida_no_bloqueada', severidad: 'info', requiere: ['USR02'],
    titulo: 'Validez de cuenta vencida sin bloqueo',
    descripcion: () => 'La cuenta no puede iniciar sesión por validez, pero no está bloqueada. Revisar limpieza.' },
  { codigo: 'ambos_paises', severidad: 'info', requiere: ['RRHH'],
    titulo: 'Opera en Uruguay y Chile',
    descripcion: () => 'Persona con operación en ambos países según RR. HH. No es un riesgo: se identifica para revisar alcances por país.' },
  { codigo: 'tipo_desconocido', severidad: 'media', requiere: ['USR02'],
    titulo: 'Tipo de usuario sin dato o no reconocido',
    descripcion: () => 'USTYP vacío o con un valor fuera de A/B/C/L/S.' },
];

export const SENAL_POR_CODIGO = Object.fromEntries(SENALES.map((s) => [s.codigo, s])) as Record<
  CodigoSenal,
  DefinicionSenal
>;

export interface ProblemaCalidad {
  codigo: string;
  titulo: string;
  descripcion: string;
  elementos: string[];
}

export interface Modelo {
  snapshot: Snapshot;
  ref: string;
  parametros: Parametros;
  fuentes: Record<Fuente, Importacion | null>;
  cuentas: CuentaAnalizada[];
  cuentaPorNombre: Map<string, CuentaAnalizada>;
  roles: RolAnalizado[];
  rolPorNombre: Map<string, RolAnalizado>;
  personas: PersonaAnalizada[];
  asignacionesHuerfanas: AsignacionAnalizada[];
  calidad: ProblemaCalidad[];
  conteoSenales: Record<CodigoSenal, number>;
}

export function construirModelo(params: {
  snapshot: Snapshot;
  importaciones: Importacion[];
  usr02: CuentaUsr02[];
  agrUsers: AsignacionRol[];
  rrhh: PersonaRrhh[];
  parametros: Parametros;
}): Modelo {
  const { snapshot, usr02, agrUsers, rrhh, parametros } = params;
  const ref = snapshot.fechaExtraccion;
  const fuentes: Record<Fuente, Importacion | null> = { USR02: null, AGR_USERS: null, RRHH: null };
  for (const i of params.importaciones) if (i.vigente) fuentes[i.fuente] = i;
  const hayRrhh = fuentes.RRHH !== null;
  const hayAgr = fuentes.AGR_USERS !== null;
  const mapeoUsr02 = new Set(Object.values(fuentes.USR02?.mapeo ?? {}));

  const personasPorUsuario = new Map<string, PersonaRrhh[]>();
  for (const p of rrhh) {
    for (const u of p.usuariosSap) {
      const l = personasPorUsuario.get(u) ?? [];
      l.push(p);
      personasPorUsuario.set(u, l);
    }
  }

  const analizarAsignacion = (a: AsignacionRol): AsignacionAnalizada => {
    const estado = vigencia(a.fromDat, a.toDat, ref);
    const dias = a.toDat && a.toDat !== '9999-12-31' ? diasEntre(ref, a.toDat) : null;
    return {
      asignacion: a,
      estado,
      porVencer: estado === 'vigente' && dias !== null && dias <= parametros.diasPorVencer,
      diasParaVencer: dias,
    };
  };
  const asigPorUsuario = new Map<string, AsignacionAnalizada[]>();
  for (const a of agrUsers) {
    const l = asigPorUsuario.get(a.uname) ?? [];
    l.push(analizarAsignacion(a));
    asigPorUsuario.set(a.uname, l);
  }

  const cuentas: CuentaAnalizada[] = usr02.map((c) => {
    const { bloqueada, motivos } = decodificarUflag(c.uflag);
    const vigenciaCuenta = vigencia(c.gltgv, c.gltgb, ref);
    const utilizable = !bloqueada && vigenciaCuenta === 'vigente';
    const humano = TIPOS_USUARIO[c.ustyp]?.humano ?? false;
    const personas = personasPorUsuario.get(c.bname) ?? [];
    let conciliacion: Conciliacion;
    if (!hayRrhh) conciliacion = 'sin_datos_rrhh';
    else if (personas.length === 0) conciliacion = 'sin_rrhh';
    else if (personas.length > 1) conciliacion = 'ambigua';
    else if (personas[0].vigente === true) conciliacion = 'conciliada';
    else if (personas[0].vigente === false) conciliacion = 'no_vigente';
    else conciliacion = 'vigencia_desconocida';
    const paises = [...new Set(personas.flatMap((p) => (p.paisesOperacion.length ? p.paisesOperacion : p.paisPertenencia ? [p.paisPertenencia] : [])))].sort().reverse() as Pais[];
    const asignaciones = (asigPorUsuario.get(c.bname) ?? []).sort((a, b) =>
      a.asignacion.agrName.localeCompare(b.asignacion.agrName),
    );
    const rolesVigentes = [...new Set(asignaciones.filter((a) => a.estado === 'vigente').map((a) => a.asignacion.agrName))];
    const diasSinAcceso = c.trdat ? diasEntre(c.trdat, ref) : null;
    const nuncaAccedio = mapeoUsr02.has('trdat') && !c.trdat;

    const senales: CodigoSenal[] = [];
    if (hayRrhh) {
      if (conciliacion === 'no_vigente' && utilizable) senales.push('baja_con_acceso');
      if (conciliacion === 'sin_rrhh' && humano && utilizable) senales.push('sin_rrhh_utilizable');
      if (conciliacion === 'ambigua') senales.push('ambigua');
      if (!humano && personas.length) senales.push('no_dialogo_con_persona');
      if (paises.length > 1) senales.push('ambos_paises');
    }
    if (utilizable && diasSinAcceso !== null && diasSinAcceso > parametros.diasSinAcceso) senales.push('sin_acceso_prolongado');
    if (utilizable && nuncaAccedio) senales.push('nunca_accedio');
    if (hayAgr) {
      if (rolesVigentes.length >= parametros.umbralRolesAltos) senales.push('roles_altos');
      if (utilizable && rolesVigentes.length === 0) senales.push('sin_roles');
      if (asignaciones.some((a) => a.porVencer)) senales.push('asig_por_vencer');
      if (asignaciones.some((a) => a.estado === 'vencida')) senales.push('asig_vencidas');
    }
    if (vigenciaCuenta === 'vencida' && !bloqueada) senales.push('vencida_no_bloqueada');
    if (!TIPOS_USUARIO[c.ustyp]) senales.push('tipo_desconocido');

    return {
      bname: c.bname,
      cuenta: c,
      tipo: etiquetaTipo(c.ustyp),
      humano,
      bloqueada,
      motivosBloqueo: motivos,
      vigenciaCuenta,
      utilizable,
      nuncaAccedio,
      diasSinAcceso,
      personas,
      conciliacion,
      enPoblacion: conciliacion === 'conciliada',
      paises,
      asignaciones,
      rolesVigentes,
      senales,
    };
  });
  cuentas.sort((a, b) => a.bname.localeCompare(b.bname));
  const cuentaPorNombre = new Map(cuentas.map((c) => [c.bname, c]));

  const asignacionesHuerfanas = [...asigPorUsuario.entries()]
    .filter(([u]) => !cuentaPorNombre.has(u))
    .flatMap(([, l]) => l);

  // Roles
  const rolesMap = new Map<string, RolAnalizado & { _vig: Set<string> }>();
  for (const [uname, lista] of asigPorUsuario) {
    for (const a of lista) {
      const nombre = a.asignacion.agrName;
      let r = rolesMap.get(nombre);
      if (!r) {
        r = { agrName: nombre, asignaciones: 0, vigentes: 0, vencidas: 0, futuras: 0, viaCompuesto: 0,
          cuentasVigentes: [], cuentasPoblacion: 0, cuentasHuerfanas: 0, _vig: new Set() };
        rolesMap.set(nombre, r);
      }
      r.asignaciones++;
      if (a.estado === 'vigente') {
        r.vigentes++;
        r._vig.add(uname);
      } else if (a.estado === 'vencida') r.vencidas++;
      else r.futuras++;
      if (a.asignacion.colFlag === 'X') r.viaCompuesto++;
    }
  }
  const roles: RolAnalizado[] = [...rolesMap.values()]
    .map(({ _vig, ...r }) => {
      const cuentasVigentes = [..._vig].sort();
      return {
        ...r,
        cuentasVigentes,
        cuentasPoblacion: cuentasVigentes.filter((u) => cuentaPorNombre.get(u)?.enPoblacion).length,
        cuentasHuerfanas: cuentasVigentes.filter((u) => !cuentaPorNombre.has(u)).length,
      };
    })
    .sort((a, b) => b.cuentasVigentes.length - a.cuentasVigentes.length || a.agrName.localeCompare(b.agrName));
  const rolPorNombre = new Map(roles.map((r) => [r.agrName, r]));

  // Personas
  const personas: PersonaAnalizada[] = rrhh.map((p) => {
    const cuentasP = p.usuariosSap.filter((u) => cuentaPorNombre.has(u));
    return {
      persona: p,
      cuentas: cuentasP,
      cuentasInexistentes: fuentes.USR02 ? p.usuariosSap.filter((u) => !cuentaPorNombre.has(u)) : [],
      rolesVigentes: new Set(cuentasP.flatMap((u) => cuentaPorNombre.get(u)!.rolesVigentes)).size,
    };
  });
  personas.sort((a, b) =>
    `${a.persona.apellido} ${a.persona.nombre}`.localeCompare(`${b.persona.apellido} ${b.persona.nombre}`),
  );

  // Calidad de datos
  const calidad: ProblemaCalidad[] = [];
  if (fuentes.USR02 && hayAgr && asignacionesHuerfanas.length) {
    calidad.push({
      codigo: 'agr_huerfanas',
      titulo: 'Asignaciones de usuarios que no están en USR02',
      descripcion: 'AGR_USERS contiene usuarios que no aparecen en la extracción de USR02. Puede indicar extracciones de distinto momento o un filtro en USR02.',
      elementos: [...new Set(asignacionesHuerfanas.map((a) => a.asignacion.uname))].sort(),
    });
  }
  if (hayRrhh && fuentes.USR02) {
    const inexist = personas.filter((p) => p.cuentasInexistentes.length && p.persona.vigente !== false);
    if (inexist.length) {
      calidad.push({
        codigo: 'rrhh_usuario_inexistente',
        titulo: 'Usuarios SAP informados por RR. HH. que no existen en USR02',
        descripcion: 'Revisar errores de tipeo, ceros a la izquierda o cuentas aún no creadas.',
        elementos: inexist.flatMap((p) => p.cuentasInexistentes.map((u) => `${u} — ${nombrePersona(p.persona)}`)),
      });
    }
    const sinUsuario = personas.filter((p) => !p.persona.usuariosSap.length && p.persona.vigente !== false);
    if (sinUsuario.length) {
      calidad.push({
        codigo: 'rrhh_sin_usuario',
        titulo: 'Empleados sin usuario SAP informado',
        descripcion: 'Pueden no usar SAP, o puede faltar el dato en la planilla. Sin usuario no hay conciliación automática.',
        elementos: sinUsuario.map((p) => nombrePersona(p.persona)),
      });
    }
    const sinPais = personas.filter((p) => p.persona.vigente !== false && !p.persona.paisPertenencia && !p.persona.paisesOperacion.length);
    if (sinPais.length) {
      calidad.push({
        codigo: 'rrhh_sin_pais',
        titulo: 'Empleados sin país identificado',
        descripcion: 'No se pudo leer UY/CL en país de pertenencia ni de operación.',
        elementos: sinPais.map((p) => nombrePersona(p.persona)),
      });
    }
  }
  for (const [f, imp] of Object.entries(fuentes)) {
    if (imp?.columnasSensiblesDescartadas.length) {
      calidad.push({
        codigo: `sensibles_${f}`,
        titulo: `El archivo de ${f} incluía columnas de credenciales`,
        descripcion: 'Se descartaron al importar y no se guardaron. Eliminar el archivo original y volver a exportar sin esos campos.',
        elementos: imp.columnasSensiblesDescartadas,
      });
    }
  }

  const conteoSenales = Object.fromEntries(SENALES.map((s) => [s.codigo, 0])) as Record<CodigoSenal, number>;
  for (const c of cuentas) for (const s of c.senales) conteoSenales[s]++;

  return {
    snapshot,
    ref,
    parametros,
    fuentes,
    cuentas,
    cuentaPorNombre,
    roles,
    rolPorNombre,
    personas,
    asignacionesHuerfanas,
    calidad,
    conteoSenales,
  };
}

export function nombrePersona(p: PersonaRrhh): string {
  const n = [p.apellido, p.nombre].filter(Boolean).join(', ');
  return n || p.idEmpleado || p.usuariosSap.join(', ') || '(sin nombre)';
}
