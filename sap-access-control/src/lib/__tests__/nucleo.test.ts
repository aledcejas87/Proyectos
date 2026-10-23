import { describe, expect, it } from 'vitest';
import { construirModelo } from '../analisis';
import { generarDemo } from '../demo';
import { esColumnaSensible } from '../fuentes';
import { mapeoSugerido, procesar } from '../importador';
import { armarTabla, detectarFilaEncabezado, leerTexto } from '../lectura';
import { decodificarUflag, leerFecha, leerHora, leerPais, leerVigente, vigencia } from '../sap';
import { PARAMETROS_DEFAULT, type AsignacionRol, type CuentaUsr02, type Fuente, type PersonaRrhh } from '../../db/types';

describe('fechas SAP', () => {
  it('interpreta los formatos habituales', () => {
    expect(leerFecha('20261020').valor).toBe('2026-10-20');
    expect(leerFecha('20.10.2026').valor).toBe('2026-10-20');
    expect(leerFecha('20/10/2026').valor).toBe('2026-10-20');
    expect(leerFecha('10/20/2026', 'MDY').valor).toBe('2026-10-20');
    expect(leerFecha('2026-10-20').valor).toBe('2026-10-20');
    expect(leerFecha(20261020).valor).toBe('2026-10-20');
    expect(leerFecha(46315).valor).toBe('2026-10-20'); // serial Excel
    expect(leerFecha(new Date(Date.UTC(2026, 9, 20))).valor).toBe('2026-10-20');
  });
  it('trata 00000000 y vacío como sin dato, y marca valores inválidos', () => {
    expect(leerFecha('00000000')).toEqual({ valor: null, invalido: false });
    expect(leerFecha('')).toEqual({ valor: null, invalido: false });
    expect(leerFecha('31.02.2026').invalido).toBe(true);
    expect(leerFecha('ayer').invalido).toBe(true);
  });
  it('lee horas', () => {
    expect(leerHora('083015')).toBe('08:30:15');
    expect(leerHora('8:30:15')).toBe('08:30:15');
    expect(leerHora(0.5)).toBe('12:00:00');
  });
});

describe('interpretaciones', () => {
  it('decodifica UFLAG por bits', () => {
    expect(decodificarUflag(0).bloqueada).toBe(false);
    expect(decodificarUflag(64).motivos).toEqual(['Bloqueo local por administrador']);
    expect(decodificarUflag(192).motivos).toHaveLength(2);
    expect(decodificarUflag(1).desconocido).toBe(true);
  });
  it('evalúa vigencia contra la fecha de referencia', () => {
    expect(vigencia(null, '9999-12-31', '2026-10-20')).toBe('vigente');
    expect(vigencia(null, '2026-10-19', '2026-10-20')).toBe('vencida');
    expect(vigencia('2026-11-01', null, '2026-10-20')).toBe('futura');
  });
  it('lee países y vigencia de RR. HH.', () => {
    expect(leerPais('Uruguay')).toEqual(['UY']);
    expect(leerPais('Ambos')).toEqual(['UY', 'CL']);
    expect(leerPais('UY/CL')).toEqual(['UY', 'CL']);
    expect(leerVigente('Baja')).toBe(false);
    expect(leerVigente('Sí')).toBe(true);
    expect(leerVigente('Licencia')).toBe(null);
  });
  it('detecta columnas de credenciales', () => {
    expect(esColumnaSensible('PWDSALTEDHASH')).toBe(true);
    expect(esColumnaSensible('BCODE')).toBe(true);
    expect(esColumnaSensible('Contraseña')).toBe(true);
    expect(esColumnaSensible('BNAME')).toBe(false);
  });
});

function cargar(fuente: Fuente, contenido: string) {
  const filas = leerTexto(contenido);
  const tabla = armarTabla({ nombre: 'x', filas }, detectarFilaEncabezado(fuente, filas));
  return procesar(fuente, tabla, mapeoSugerido(fuente, tabla.encabezados));
}

describe('lectura e importación', () => {
  it('lee el formato "texto sin convertir" de SAP con títulos previos', () => {
    const t = [
      'Tabla: USR02',
      '',
      '-----------------------------------------',
      '| BNAME    | USTYP | UFLAG | TRDAT    | PWDSALTEDHASH |',
      '-----------------------------------------',
      '| JPEREZ   | A     | 0     | 20261001 | {x-issha}abc  |',
      '| BATCH    | B     | 64    | 00000000 | {x-issha}def  |',
      '| JPEREZ   | A     | 0     | 20261001 | {x-issha}abc  |',
      '-----------------------------------------',
    ].join('\n');
    const r = cargar('USR02', t);
    expect(r.registros).toHaveLength(2);
    expect(r.duplicadas).toBe(1);
    expect(r.columnasSensibles).toEqual(['PWDSALTEDHASH']);
    expect(JSON.stringify(r.registros)).not.toContain('issha');
    const batch = r.registros[1] as CuentaUsr02;
    expect(batch).toMatchObject({ bname: 'BATCH', uflag: 64, trdat: null });
  });

  it('procesa los archivos de ejemplo de punta a punta', () => {
    const demo = generarDemo();
    const usr = cargar('USR02', demo.usr02);
    const agr = cargar('AGR_USERS', demo.agrUsers);
    const hr = cargar('RRHH', demo.rrhh);
    expect(usr.registros.length).toBeGreaterThan(100);
    expect(usr.rechazadas).toBe(0);
    expect(agr.registros.length).toBeGreaterThan(300);
    const conId = <T,>(l: unknown[]) => l.map((x, i) => ({ ...(x as object), id: i, snapshotId: 1, importId: 1 }) as T);
    const mapeo = (f: Fuente, cont: string) => {
      const filas = leerTexto(cont);
      const tabla = armarTabla({ nombre: 'x', filas }, detectarFilaEncabezado(f, filas));
      return mapeoSugerido(f, tabla.encabezados);
    };
    const imp = (fuente: Fuente, m: Record<string, string>) => ({
      snapshotId: 1, fuente, archivo: '', tamano: 0, sha256: '', importadoEn: '', responsable: '', filaEncabezado: 1,
      mapeo: m, columnasSensiblesDescartadas: [], columnasIgnoradas: [], filasLeidas: 0, aceptadas: 0, rechazadas: 0,
      duplicadas: 0, advertencias: [], muestraRechazos: [], vigente: true,
    });
    const modelo = construirModelo({
      snapshot: { id: 1, nombre: 'demo', fechaExtraccion: demo.fechaExtraccion, sistema: '', mandante: '', notas: '', creadoEn: '', esDemo: true },
      importaciones: [imp('USR02', mapeo('USR02', demo.usr02)), imp('AGR_USERS', {}), imp('RRHH', {})],
      usr02: conId<CuentaUsr02>(usr.registros),
      agrUsers: conId<AsignacionRol>(agr.registros),
      rrhh: conId<PersonaRrhh>(hr.registros),
      parametros: PARAMETROS_DEFAULT,
    });
    expect(modelo.cuentas.filter((c) => c.enPoblacion).length).toBeGreaterThan(80);
    expect(modelo.conteoSenales.baja_con_acceso).toBeGreaterThan(0);
    expect(modelo.conteoSenales.sin_rrhh_utilizable).toBeGreaterThan(0);
    expect(modelo.calidad.some((q) => q.codigo === 'agr_huerfanas')).toBe(true);
    expect(modelo.cuentaPorNombre.get('RFC_INTEGRA')?.humano).toBe(false);
  });
});
