import { db, tablaDeFuente } from '../db/db';
import type {
  AsignacionRol,
  CuentaUsr02,
  Fuente,
  Importacion,
  Pais,
  PersonaRrhh,
  RechazoFila,
} from '../db/types';
import { esColumnaSensible, FUENTES, sugerirCampo } from './fuentes';
import type { Tabla } from './lectura';
import {
  detectarOrdenFecha,
  leerFecha,
  leerHora,
  leerPais,
  leerVigente,
  normalizarUsuario,
  texto,
  TIPOS_USUARIO,
  type Celda,
  type OrdenFecha,
} from './sap';

export const IGNORAR = '__ignorar';
export const EXTRA = '__extra';

export type Mapeo = Record<string, string>;

export function mapeoSugerido(fuente: Fuente, encabezados: string[]): Mapeo {
  const mapeo: Mapeo = {};
  const usados = new Set<string>();
  for (const h of encabezados) {
    if (esColumnaSensible(h)) continue;
    const c = sugerirCampo(fuente, h);
    if (c && !usados.has(c)) {
      mapeo[h] = c;
      usados.add(c);
    } else {
      mapeo[h] = IGNORAR;
    }
  }
  return mapeo;
}

type Registro = Omit<CuentaUsr02, 'snapshotId' | 'importId'> | Omit<AsignacionRol, 'snapshotId' | 'importId'> | Omit<PersonaRrhh, 'snapshotId' | 'importId'>;

export interface ResultadoProceso {
  registros: Registro[];
  filasLeidas: number;
  rechazadas: number;
  duplicadas: number;
  advertencias: string[];
  muestraRechazos: RechazoFila[];
  columnasSensibles: string[];
  columnasIgnoradas: string[];
}

const MAX_MUESTRA = 50;
const FECHAS: Record<Fuente, string[]> = {
  USR02: ['gltgv', 'gltgb', 'trdat'],
  AGR_USERS: ['fromDat', 'toDat'],
  RRHH: [],
};

/**
 * Convierte las filas del archivo en registros de la fuente, sin tocar la base.
 * Las fechas que no se pueden interpretar no rechazan la fila: quedan vacías y
 * se informan como advertencia, para no perder la cuenta o la asignación.
 */
export function procesar(fuente: Fuente, tabla: Tabla, mapeo: Mapeo): ResultadoProceso {
  const def = FUENTES[fuente];
  const columnasSensibles = tabla.encabezados.filter(esColumnaSensible);
  const columnasIgnoradas = tabla.encabezados.filter(
    (h) => !esColumnaSensible(h) && (mapeo[h] ?? IGNORAR) === IGNORAR,
  );
  const indice: Record<string, number> = {};
  const extras: { encabezado: string; i: number }[] = [];
  tabla.encabezados.forEach((h, i) => {
    if (esColumnaSensible(h)) return;
    const campo = mapeo[h];
    if (!campo || campo === IGNORAR) return;
    if (campo === EXTRA) extras.push({ encabezado: h, i });
    else indice[campo] = i;
  });

  const advertencias: string[] = [];
  if (columnasSensibles.length) {
    advertencias.push(
      `El archivo contenía columnas de credenciales o contraseñas (${columnasSensibles.join(', ')}). ` +
        'Se descartaron y no se guardaron. Recomendación: eliminar el archivo original y volver a exportar sin esos campos.',
    );
  }
  for (const c of def.campos) {
    if (c.requerido && indice[c.campo] === undefined) {
      throw new Error(`Falta mapear el campo obligatorio ${c.etiqueta} (${c.descripcion}).`);
    }
  }

  const val = (fila: Celda[], campo: string): Celda =>
    indice[campo] === undefined ? null : fila[indice[campo]];

  // Orden día/mes de las columnas de fecha con barras.
  const ordenes: Record<string, OrdenFecha> = {};
  for (const campo of FECHAS[fuente]) {
    if (indice[campo] === undefined) continue;
    const { orden, conflicto } = detectarOrdenFecha(tabla.filas.map((f) => val(f, campo)));
    ordenes[campo] = orden ?? 'DMY';
    if (conflicto) {
      advertencias.push(`La columna ${campo.toUpperCase()} mezcla fechas día/mes y mes/día; se interpretó como día/mes. Revisar.`);
    }
  }
  const fechasInvalidas: Record<string, number> = {};
  const fecha = (fila: Celda[], campo: string) => {
    const r = leerFecha(val(fila, campo), ordenes[campo]);
    if (r.invalido) fechasInvalidas[campo] = (fechasInvalidas[campo] ?? 0) + 1;
    return r.valor;
  };

  const registros: Registro[] = [];
  const muestraRechazos: RechazoFila[] = [];
  let rechazadas = 0;
  let duplicadas = 0;
  const claves = new Set<string>();
  const rechazar = (n: number, motivo: string) => {
    rechazadas++;
    if (muestraRechazos.length < MAX_MUESTRA) muestraRechazos.push({ fila: n, motivo });
  };
  let numericos = 0;
  const tiposDesconocidos = new Set<string>();
  let uflagNoNumerico = 0;
  let horasInvalidas = 0;

  tabla.filas.forEach((fila, i) => {
    const nFila = tabla.filaEncabezado + 2 + i; // 1-based, contando el encabezado

    if (fuente === 'USR02') {
      const bname = normalizarUsuario(val(fila, 'bname'));
      if (!bname) return rechazar(nFila, 'BNAME vacío');
      if (claves.has(bname)) {
        duplicadas++;
        return;
      }
      claves.add(bname);
      if (/^\d+$/.test(bname)) numericos++;
      const ustyp = texto(val(fila, 'ustyp')).toUpperCase();
      if (ustyp && !TIPOS_USUARIO[ustyp]) tiposDesconocidos.add(ustyp);
      const uflagTexto = texto(val(fila, 'uflag'));
      let uflag: number | null = null;
      if (uflagTexto !== '') {
        if (/^\d+$/.test(uflagTexto)) uflag = Number(uflagTexto);
        else uflagNoNumerico++;
      } else if (indice.uflag !== undefined) {
        uflag = 0;
      }
      const ltimeCelda = val(fila, 'ltime');
      const ltime = leerHora(ltimeCelda);
      if (ltime === null && texto(ltimeCelda) !== '' && texto(ltimeCelda) !== '000000') horasInvalidas++;
      const trdat = fecha(fila, 'trdat');
      registros.push({
        bname,
        ustyp,
        uflag,
        uflagTexto,
        gltgv: fecha(fila, 'gltgv'),
        gltgb: fecha(fila, 'gltgb'),
        trdat,
        ltime: trdat ? ltime : null,
        clase: texto(val(fila, 'clase')),
      });
    } else if (fuente === 'AGR_USERS') {
      const uname = normalizarUsuario(val(fila, 'uname'));
      const agrName = texto(val(fila, 'agrName')).toUpperCase();
      if (!uname) return rechazar(nFila, 'UNAME vacío');
      if (!agrName) return rechazar(nFila, 'AGR_NAME vacío');
      const fromDat = fecha(fila, 'fromDat');
      const toDat = fecha(fila, 'toDat');
      const clave = `${uname}|${agrName}|${fromDat}|${toDat}`;
      if (claves.has(clave)) {
        duplicadas++;
        return;
      }
      claves.add(clave);
      if (/^\d+$/.test(uname)) numericos++;
      registros.push({
        uname,
        agrName,
        fromDat,
        toDat,
        colFlag: texto(val(fila, 'colFlag')).toUpperCase(),
        orgFlag: texto(val(fila, 'orgFlag')).toUpperCase(),
      });
    } else {
      const usuariosSap = texto(val(fila, 'usuarioSap'))
        .split(/[;,/\s]+/)
        .map(normalizarUsuario)
        .filter(Boolean);
      let nombre = texto(val(fila, 'nombre'));
      let apellido = texto(val(fila, 'apellido'));
      const completo = texto(val(fila, 'nombreCompleto'));
      if (!nombre && !apellido && completo) nombre = completo;
      const idEmpleado = texto(val(fila, 'idEmpleado'));
      if (!usuariosSap.length && !idEmpleado && !nombre && !apellido) {
        return rechazar(nFila, 'Fila sin usuario SAP, legajo ni nombre');
      }
      const clave = idEmpleado ? `id:${idEmpleado}` : `u:${usuariosSap.join(',')}|${nombre}|${apellido}`;
      if (claves.has(clave)) {
        duplicadas++;
        return;
      }
      claves.add(clave);
      const estadoCelda = val(fila, 'vigente');
      const pertenencia = leerPais(val(fila, 'paisPertenencia'));
      let operacion: Pais[] = leerPais(val(fila, 'paisesOperacion'));
      if (!operacion.length && indice.paisesOperacion === undefined) operacion = pertenencia;
      const extra: Record<string, string> = {};
      for (const e of extras) {
        const v = texto(fila[e.i]);
        if (v) extra[e.encabezado] = v;
      }
      registros.push({
        idEmpleado,
        nombre,
        apellido,
        email: texto(val(fila, 'email')).toLowerCase(),
        usuariosSap,
        vigente: indice.vigente === undefined ? null : leerVigente(estadoCelda),
        estadoTexto: texto(estadoCelda),
        area: texto(val(fila, 'area')),
        cargo: texto(val(fila, 'cargo')),
        responsable: texto(val(fila, 'responsable')),
        paisPertenencia: pertenencia.length === 1 ? pertenencia[0] : null,
        paisesOperacion: operacion,
        sociedad: texto(val(fila, 'sociedad')),
        extra,
      });
    }
  });

  for (const [campo, n] of Object.entries(fechasInvalidas)) {
    advertencias.push(`${n} fila(s) con ${campo.toUpperCase()} no interpretable como fecha; se dejó vacía.`);
  }
  if (numericos) {
    advertencias.push(
      `${numericos} usuario(s) con formato solo numérico. Verificar que Excel no haya eliminado ceros a la izquierda; si pasó, la conciliación fallará.`,
    );
  }
  if (tiposDesconocidos.size) advertencias.push(`Tipos de usuario no reconocidos: ${[...tiposDesconocidos].join(', ')}.`);
  if (uflagNoNumerico) advertencias.push(`${uflagNoNumerico} fila(s) con UFLAG no numérico (¿se exportó el texto en lugar del valor?).`);
  if (horasInvalidas) advertencias.push(`${horasInvalidas} fila(s) con LTIME no interpretable.`);
  if (duplicadas) advertencias.push(`${duplicadas} fila(s) duplicada(s) descartada(s).`);
  if (fuente === 'RRHH') {
    const sinUsuario = (registros as PersonaRrhh[]).filter((r) => !r.usuariosSap.length).length;
    if (sinUsuario) advertencias.push(`${sinUsuario} persona(s) sin usuario SAP informado: no podrán conciliarse automáticamente.`);
    if (indice.vigente === undefined) advertencias.push('No se mapeó la columna de vigencia: no se podrá distinguir empleados vigentes.');
    else {
      const sinVig = (registros as PersonaRrhh[]).filter((r) => r.vigente === null).length;
      if (sinVig) advertencias.push(`${sinVig} persona(s) con estado de vigencia no interpretable.`);
    }
  }
  if (fuente === 'AGR_USERS' && indice.toDat === undefined) {
    advertencias.push('No se mapeó TO_DAT: no se podrán distinguir asignaciones vencidas.');
  }

  return {
    registros,
    filasLeidas: tabla.filas.length,
    rechazadas,
    duplicadas,
    advertencias,
    muestraRechazos,
    columnasSensibles,
    columnasIgnoradas,
  };
}

export interface MetaImportacion {
  snapshotId: number;
  fuente: Fuente;
  archivo: string;
  tamano: number;
  sha256: string;
  responsable: string;
  hoja?: string;
  filaEncabezado: number;
  mapeo: Mapeo;
  advertenciasLectura: string[];
}

/** Guarda la carga. Si la fuente ya estaba cargada en el snapshot, reemplaza sus filas y deja la carga anterior en el historial. */
export async function guardarImportacion(meta: MetaImportacion, r: ResultadoProceso): Promise<number> {
  const tabla = tablaDeFuente(meta.fuente);
  return db.transaction('rw', [db.importaciones, db.usr02, db.agrUsers, db.rrhh], async () => {
    const anteriores = await db.importaciones
      .where('[snapshotId+fuente]')
      .equals([meta.snapshotId, meta.fuente])
      .filter((i) => i.vigente)
      .toArray();
    for (const a of anteriores) {
      await tabla.where('importId').equals(a.id!).delete();
      await db.importaciones.update(a.id!, { vigente: false });
    }
    const mapeoGuardado: Record<string, string> = {};
    for (const [k, v] of Object.entries(meta.mapeo)) if (v !== IGNORAR && !esColumnaSensible(k)) mapeoGuardado[k] = v;
    const imp: Importacion = {
      snapshotId: meta.snapshotId,
      fuente: meta.fuente,
      archivo: meta.archivo,
      tamano: meta.tamano,
      sha256: meta.sha256,
      importadoEn: new Date().toISOString(),
      responsable: meta.responsable,
      hoja: meta.hoja,
      filaEncabezado: meta.filaEncabezado + 1,
      mapeo: mapeoGuardado,
      columnasSensiblesDescartadas: r.columnasSensibles,
      columnasIgnoradas: r.columnasIgnoradas,
      filasLeidas: r.filasLeidas,
      aceptadas: r.registros.length,
      rechazadas: r.rechazadas,
      duplicadas: r.duplicadas,
      advertencias: [...meta.advertenciasLectura, ...r.advertencias],
      muestraRechazos: r.muestraRechazos,
      vigente: true,
    };
    const importId = await db.importaciones.add(imp);
    const filas = r.registros.map((reg) => ({ ...reg, snapshotId: meta.snapshotId, importId }));
    // bulkAdd tipado por tabla: las tres comparten la forma {snapshotId, importId, ...}.
    await (tabla as unknown as { bulkAdd: (x: unknown[]) => Promise<unknown> }).bulkAdd(filas);
    return importId;
  });
}
