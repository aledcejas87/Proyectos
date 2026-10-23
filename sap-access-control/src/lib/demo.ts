import { db, setAjuste } from '../db/db';
import { guardarImportacion, mapeoSugerido, procesar } from './importador';
import { armarTabla, detectarFilaEncabezado, leerTexto, sha256 } from './lectura';

// Datos de ejemplo 100 % FICTICIOS. Sirven para recorrer la aplicación y para
// ver el formato esperado de cada archivo. Se generan como texto CSV y pasan
// por el mismo importador que los archivos reales.

function prng(semilla: number) {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NOMBRES = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Facundo', 'Gabriela', 'Hernán', 'Inés', 'Javier', 'Karina', 'Lucas', 'Martina', 'Nicolás', 'Olivia', 'Pablo', 'Romina', 'Santiago', 'Tamara', 'Valentín', 'Ximena', 'Yamila', 'Joaquín', 'Florencia', 'Matías', 'Camila', 'Rodrigo', 'Lucía', 'Sebastián', 'Paula'];
const APELLIDOS = ['Acosta', 'Benítez', 'Cabrera', 'Díaz', 'Espinoza', 'Fernández', 'García', 'Herrera', 'Ibarra', 'Juárez', 'López', 'Méndez', 'Núñez', 'Olivera', 'Pérez', 'Quiroga', 'Rodríguez', 'Silva', 'Torres', 'Urrutia', 'Vargas', 'Zapata', 'Muñoz', 'Rojas', 'Soto', 'Contreras', 'Sosa', 'Martínez', 'Castro', 'Morales'];

const AREAS: { area: string; prefijo: string; cargos: string[]; roles: string[] }[] = [
  { area: 'Finanzas', prefijo: 'FI', cargos: ['Analista contable', 'Tesorero', 'Jefe de contabilidad'],
    roles: ['Z_FI_CONSULTA', 'Z_FI_CONTAB_ASIENTOS', 'Z_FI_AP_PROVEEDORES', 'Z_FI_AR_CLIENTES', 'Z_FI_TESORERIA_PAGOS', 'Z_FI_CIERRE_PERIODO', 'Z_CO_CENTROS_COSTO'] },
  { area: 'Compras', prefijo: 'MM', cargos: ['Comprador', 'Jefe de compras', 'Analista de abastecimiento'],
    roles: ['Z_MM_CONSULTA', 'Z_MM_SOLPED', 'Z_MM_PEDIDOS_COMPRA', 'Z_MM_LIBERACION_PEDIDOS', 'Z_MM_MAESTRO_PROVEEDORES', 'Z_MM_VERIF_FACTURAS'] },
  { area: 'Logística', prefijo: 'WM', cargos: ['Operador de depósito', 'Supervisor de depósito', 'Planificador'],
    roles: ['Z_WM_CONSULTA_STOCK', 'Z_WM_MOVIMIENTOS', 'Z_WM_INVENTARIO', 'Z_LE_ENTREGAS', 'Z_LE_TRANSPORTE'] },
  { area: 'Ventas', prefijo: 'SD', cargos: ['Ejecutivo comercial', 'Administrativo de ventas', 'Gerente comercial'],
    roles: ['Z_SD_CONSULTA', 'Z_SD_PEDIDOS_VENTA', 'Z_SD_PRECIOS_CONDICIONES', 'Z_SD_FACTURACION', 'Z_SD_MAESTRO_CLIENTES', 'Z_SD_CREDITO'] },
  { area: 'Calidad', prefijo: 'QM', cargos: ['Analista de calidad', 'Director técnico'],
    roles: ['Z_QM_CONSULTA', 'Z_QM_LOTES_LIBERACION', 'Z_QM_INSPECCION'] },
  { area: 'Tecnología', prefijo: 'BC', cargos: ['Analista funcional', 'Administrador SAP'],
    roles: ['Z_BC_SOPORTE', 'Z_BC_ADMIN_USUARIOS', 'Z_BC_JOBS', 'SAP_ALL_DEMO'] },
];
const COMUNES = ['Z_COMUN_FIORI_LAUNCHPAD', 'Z_COMUN_IMPRESION', 'Z_COMUN_REPORTES'];
const COMPUESTOS = ['ZC_FINANZAS_ANALISTA', 'ZC_COMPRAS_COMPRADOR', 'ZC_VENTAS_EJECUTIVO'];

export interface ArchivosDemo {
  fechaExtraccion: string;
  usr02: string;
  agrUsers: string;
  rrhh: string;
}

const pad = (n: number, l = 2) => String(n).padStart(l, '0');
function sumarDias(iso: string, dias: number): Date {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d;
}
const yyyymmdd = (d: Date) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
const ddmmyyyy = (d: Date) => `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`;

export function generarDemo(fechaExtraccion = '2026-10-20'): ArchivosDemo {
  const r = prng(20261020);
  const elegir = <T,>(l: T[]) => l[Math.floor(r() * l.length)];

  const usr: string[][] = [['Usuario', 'Tipo de usuario', 'Status bloqueo usuario', 'Válido desde', 'Válido hasta', 'Fecha última entrada', 'Hora última entrada', 'Grupo de usuarios']];
  const agr: string[][] = [['UNAME', 'AGR_NAME', 'FROM_DAT', 'TO_DAT', 'COL_FLAG', 'ORG_FLAG']];
  const hr: string[][] = [['Legajo', 'Apellido', 'Nombre', 'Correo', 'Usuario SAP', 'Estado', 'Área', 'Cargo', 'Responsable', 'País', 'Países de operación', 'Sociedad']];

  const usados = new Set<string>();
  const n = 140;
  for (let i = 0; i < n; i++) {
    const nombre = elegir(NOMBRES);
    const apellido = elegir(APELLIDOS);
    let bname = `${nombre[0]}${apellido}`.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').slice(0, 12);
    while (usados.has(bname)) bname = bname.slice(0, 10) + pad(Math.floor(r() * 99));
    usados.add(bname);
    const area = elegir(AREAS);
    const pais = r() < 0.6 ? 'UY' : 'CL';
    const ambos = r() < 0.08;
    const baja = r() < 0.07;
    const sinUsuarioEnHr = r() < 0.03;
    const legajo = `${pais}${pad(1000 + i, 5)}`;
    hr.push([
      legajo, apellido, nombre, `${nombre}.${apellido}@ejemplo-ficticio.test`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''),
      sinUsuarioEnHr ? '' : bname, baja ? 'Baja' : 'Activo', area.area, elegir(area.cargos), `Responsable ${area.area}`,
      pais === 'UY' ? 'Uruguay' : 'Chile', ambos ? 'Ambos' : pais, pais === 'UY' ? 'Ejemplo UY S.A.' : 'Ejemplo CL SpA',
    ]);

    // Cuenta SAP
    const bloqueo = baja ? (r() < 0.5 ? '64' : '0') : r() < 0.03 ? '128' : '0';
    const alta = sumarDias(fechaExtraccion, -Math.floor(200 + r() * 2500));
    const fin = r() < 0.1 ? ddmmyyyy(sumarDias(fechaExtraccion, Math.floor(-200 + r() * 500))) : '31.12.9999';
    const nunca = r() < 0.04;
    const dias = r() < 0.15 ? Math.floor(100 + r() * 400) : Math.floor(r() * 30);
    const ult = nunca ? '' : ddmmyyyy(sumarDias(fechaExtraccion, -dias));
    usr.push([bname, 'A', bloqueo, ddmmyyyy(alta), fin, ult, nunca ? '' : `${pad(7 + Math.floor(r() * 11))}:${pad(Math.floor(r() * 60))}:${pad(Math.floor(r() * 60))}`, pais === 'UY' ? 'SCIENZA_UY' : 'SCIENZA_CL']);

    // Asignaciones
    const desde = yyyymmdd(alta);
    const roles = new Set<string>(COMUNES.slice(0, 1 + Math.floor(r() * 3)));
    const cant = 2 + Math.floor(r() * (area.roles.length - 1));
    for (let k = 0; k < cant; k++) roles.add(elegir(area.roles));
    if (r() < 0.15) for (let k = 0; k < 3; k++) roles.add(elegir(elegir(AREAS).roles)); // roles cruzados
    if (r() < 0.04) for (const a of AREAS) for (const ro of a.roles.slice(0, 5)) roles.add(ro); // acumulación
    for (const rol of roles) {
      const vencida = r() < 0.06;
      const porVencer = !vencida && r() < 0.04;
      const hasta = vencida ? yyyymmdd(sumarDias(fechaExtraccion, -Math.floor(10 + r() * 300)))
        : porVencer ? yyyymmdd(sumarDias(fechaExtraccion, Math.floor(1 + r() * 25))) : '99991231';
      agr.push([bname, rol, desde, hasta, '', '']);
    }
    if (r() < 0.12) {
      const comp = elegir(COMPUESTOS);
      agr.push([bname, comp, desde, '99991231', '', '']);
      agr.push([bname, comp.replace('ZC_', 'Z_').concat('_SIMPLE'), desde, '99991231', 'X', '']);
    }
  }
  // Cuentas técnicas y genéricas (fuera de la población principal, pero visibles)
  const tecnicas: [string, string][] = [['RFC_INTEGRA', 'C'], ['BATCH_JOBS', 'B'], ['WF-BATCH', 'B'], ['SRV_FIORI', 'S'], ['REF_VENTAS', 'L'], ['DDIC', 'A'], ['SOPORTE_EXT', 'A'], ['CONSULTOR01', 'A'], ['00012345', 'A']];
  for (const [u, t] of tecnicas) {
    usr.push([u, t, '0', '01.01.2020', '31.12.9999', t === 'A' ? ddmmyyyy(sumarDias(fechaExtraccion, -3)) : '', '', 'TECNICOS']);
    agr.push([u, t === 'A' ? 'Z_BC_SOPORTE' : 'Z_BC_INTERFACES', '20200101', '99991231', '', '']);
  }
  // Una asignación de un usuario que no está en USR02 (inconsistencia de extracción)
  agr.push(['EXUSUARIO', 'Z_SD_CONSULTA', '20210101', '99991231', '', '']);

  const csv = (filas: string[][]) => filas.map((f) => f.map((c) => (/[;"\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(';')).join('\n');
  return { fechaExtraccion, usr02: csv(usr), agrUsers: csv(agr), rrhh: csv(hr) };
}

export async function cargarDemo(): Promise<number> {
  const archivos = generarDemo();
  const fuentes = [
    ['USR02', archivos.usr02, 'demo_USR02.csv'],
    ['AGR_USERS', archivos.agrUsers, 'demo_AGR_USERS.csv'],
    ['RRHH', archivos.rrhh, 'demo_RRHH.csv'],
  ] as const;
  // Primero se procesa todo (incluido el hash, que es asíncrono fuera de Dexie)
  // y después se escribe en una sola transacción, para que la app nunca vea
  // un snapshot de ejemplo a medio cargar.
  const preparadas = await Promise.all(
    fuentes.map(async ([fuente, contenido, archivo]) => {
      const filas = leerTexto(contenido);
      const fila = detectarFilaEncabezado(fuente, filas);
      const tabla = armarTabla({ nombre: 'Texto', filas }, fila);
      const mapeo = mapeoSugerido(fuente, tabla.encabezados);
      const bytes = new TextEncoder().encode(contenido);
      return {
        fuente, archivo, fila, mapeo, tamano: bytes.byteLength,
        hash: await sha256(bytes.buffer as ArrayBuffer),
        resultado: procesar(fuente, tabla, mapeo),
      };
    }),
  );
  return db.transaction('rw', [db.snapshots, db.importaciones, db.usr02, db.agrUsers, db.rrhh, db.ajustes], async () => {
    const snapshotId = await db.snapshots.add({
      nombre: 'DEMO — datos ficticios',
      fechaExtraccion: archivos.fechaExtraccion,
      sistema: 'DEMO',
      mandante: '000',
      notas: 'Datos generados automáticamente para probar la aplicación. No provienen de SAP.',
      creadoEn: new Date().toISOString(),
      esDemo: true,
    });
    for (const p of preparadas) {
      await guardarImportacion(
        {
          snapshotId, fuente: p.fuente, archivo: p.archivo, tamano: p.tamano, sha256: p.hash,
          responsable: 'Generador de ejemplo', filaEncabezado: p.fila, mapeo: p.mapeo, advertenciasLectura: [],
        },
        p.resultado,
      );
    }
    await setAjuste('snapshotActivo', snapshotId);
    return snapshotId;
  });
}
