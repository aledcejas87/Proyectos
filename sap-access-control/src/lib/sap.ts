// Interpretación de valores SAP. Las tablas exportadas desde SE16N llegan con
// formatos distintos según el método de exportación (Excel, texto sin
// convertir, CSV) y el idioma de logon, así que cada lector es tolerante y
// devuelve null cuando no puede interpretar el valor con certeza.

export type Celda = string | number | boolean | Date | null | undefined;

export type OrdenFecha = 'DMY' | 'MDY';

const SIN_FECHA = new Set(['', '00000000', '0', '00.00.0000', '00/00/0000', '0000-00-00']);
/** Fechas "abiertas" que SAP usa para indicar "sin límite". */
const FECHA_ABIERTA = '9999-12-31';

function iso(y: number, m: number, d: number): string | null {
  if (y < 1900 || y > 9999 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  const fecha = new Date(Date.UTC(y, m - 1, d));
  if (fecha.getUTCMonth() !== m - 1) return null; // 31/02, etc.
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

function desdeSerialExcel(n: number): string | null {
  // Serial de Excel (sistema 1900): día 25569 = 1970-01-01.
  if (n < 1 || n > 2958465) return null;
  const ms = Math.round((n - 25569) * 86400000);
  const f = new Date(ms);
  return iso(f.getUTCFullYear(), f.getUTCMonth() + 1, f.getUTCDate());
}

export interface ResultadoFecha {
  valor: string | null;
  /** true si había un valor que no pudo interpretarse */
  invalido: boolean;
}

/**
 * Convierte una celda a fecha ISO. Vacío / 00000000 => null (sin dato).
 * `orden` resuelve fechas con barras ambiguas (por defecto día/mes/año).
 */
export function leerFecha(celda: Celda, orden: OrdenFecha = 'DMY'): ResultadoFecha {
  if (celda === null || celda === undefined) return { valor: null, invalido: false };
  if (celda instanceof Date) {
    if (Number.isNaN(celda.getTime())) return { valor: null, invalido: true };
    return {
      valor: iso(celda.getUTCFullYear(), celda.getUTCMonth() + 1, celda.getUTCDate()),
      invalido: false,
    };
  }
  if (typeof celda === 'number') {
    if (celda === 0) return { valor: null, invalido: false };
    if (celda >= 19000101 && celda <= 99991231) {
      const s = String(Math.trunc(celda));
      const v = iso(+s.slice(0, 4), +s.slice(4, 6), +s.slice(6, 8));
      return { valor: v, invalido: v === null };
    }
    const v = desdeSerialExcel(celda);
    return { valor: v, invalido: v === null };
  }
  const s = String(celda).trim();
  if (SIN_FECHA.has(s)) return { valor: null, invalido: false };

  let m = /^(\d{4})(\d{2})(\d{2})$/.exec(s);
  if (m) {
    const v = iso(+m[1], +m[2], +m[3]);
    return { valor: v, invalido: v === null };
  }
  m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[ T].*)?$/.exec(s);
  if (m) {
    const v = iso(+m[1], +m[2], +m[3]);
    return { valor: v, invalido: v === null };
  }
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:\s.*)?$/.exec(s);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    // El punto (DD.MM.AAAA) es el formato SAP europeo: siempre día primero.
    const diaPrimero = s.includes('.') || orden === 'DMY';
    const v = diaPrimero ? iso(+m[3], b, a) : iso(+m[3], a, b);
    return { valor: v, invalido: v === null };
  }
  if (/^\d+(\.\d+)?$/.test(s)) return leerFecha(Number(s), orden);
  return { valor: null, invalido: true };
}

/**
 * Detecta si una columna con fechas "nn/nn/aaaa" está en día/mes o mes/día.
 * Devuelve null si no hay evidencia (todas las partes <= 12).
 */
export function detectarOrdenFecha(celdas: Celda[]): { orden: OrdenFecha | null; conflicto: boolean } {
  let dmy = false;
  let mdy = false;
  for (const c of celdas) {
    if (typeof c !== 'string') continue;
    const m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})/.exec(c.trim());
    if (!m) continue;
    if (+m[1] > 12) dmy = true;
    if (+m[2] > 12) mdy = true;
  }
  if (dmy && mdy) return { orden: 'DMY', conflicto: true };
  if (mdy) return { orden: 'MDY', conflicto: false };
  if (dmy) return { orden: 'DMY', conflicto: false };
  return { orden: null, conflicto: false };
}

export function leerHora(celda: Celda): string | null {
  if (celda === null || celda === undefined || celda === '') return null;
  const fmt = (h: number, mi: number, se: number) =>
    h > 23 || mi > 59 || se > 59
      ? null
      : `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}:${String(se).padStart(2, '0')}`;
  if (celda instanceof Date) return fmt(celda.getUTCHours(), celda.getUTCMinutes(), celda.getUTCSeconds());
  if (typeof celda === 'number') {
    if (celda > 0 && celda < 1) {
      const total = Math.round(celda * 86400);
      return fmt(Math.floor(total / 3600), Math.floor((total % 3600) / 60), total % 60);
    }
    return leerHora(String(Math.trunc(celda)).padStart(6, '0'));
  }
  const s = String(celda).trim();
  let m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
  if (m) return fmt(+m[1], +m[2], +(m[3] ?? 0));
  m = /^(\d{2})(\d{2})(\d{2})$/.exec(s.padStart(6, '0'));
  if (m) return fmt(+m[1], +m[2], +m[3]);
  return null;
}

export function texto(celda: Celda): string {
  if (celda === null || celda === undefined) return '';
  if (celda instanceof Date) {
    // Excel guarda las horas sueltas como fechas del 30/12/1899.
    if (celda.getUTCFullYear() < 1900) return leerHora(celda) ?? '';
    return celda.toISOString().slice(0, 10);
  }
  return String(celda).trim();
}

/** Usuarios SAP: SAP los guarda en mayúsculas; normalizamos para conciliar. */
export function normalizarUsuario(celda: Celda): string {
  return texto(celda).toUpperCase();
}

// ---------------------------------------------------------------------------
// USR02

export const TIPOS_USUARIO: Record<string, { etiqueta: string; humano: boolean }> = {
  A: { etiqueta: 'Diálogo', humano: true },
  B: { etiqueta: 'Sistema', humano: false },
  C: { etiqueta: 'Comunicación', humano: false },
  L: { etiqueta: 'Referencia', humano: false },
  S: { etiqueta: 'Servicio', humano: false },
};

export function etiquetaTipo(ustyp: string): string {
  return TIPOS_USUARIO[ustyp]?.etiqueta ?? (ustyp ? `Desconocido (${ustyp})` : 'Sin tipo');
}

/** Bits de UFLAG documentados por SAP. Cualquier otro bit se reporta como no reconocido. */
export const BITS_UFLAG: { bit: number; etiqueta: string }[] = [
  { bit: 32, etiqueta: 'Bloqueo global por administrador (CUA)' },
  { bit: 64, etiqueta: 'Bloqueo local por administrador' },
  { bit: 128, etiqueta: 'Bloqueo por intentos fallidos de contraseña' },
];

export function decodificarUflag(uflag: number | null): { bloqueada: boolean; motivos: string[]; desconocido: boolean } {
  if (uflag === null) return { bloqueada: false, motivos: [], desconocido: false };
  const motivos: string[] = [];
  let resto = uflag;
  for (const { bit, etiqueta } of BITS_UFLAG) {
    if (uflag & bit) {
      motivos.push(etiqueta);
      resto &= ~bit;
    }
  }
  if (resto !== 0) motivos.push(`Indicador no reconocido (${resto})`);
  return { bloqueada: uflag !== 0, motivos, desconocido: resto !== 0 };
}

export type EstadoVigencia = 'vigente' | 'vencida' | 'futura';

/** Vigencia de un rango [desde, hasta] respecto de una fecha de referencia. */
export function vigencia(desde: string | null, hasta: string | null, ref: string): EstadoVigencia {
  if (desde && desde > ref) return 'futura';
  if (hasta && hasta !== FECHA_ABIERTA && hasta < ref) return 'vencida';
  return 'vigente';
}

export function esFechaAbierta(fecha: string | null): boolean {
  return fecha === null || fecha === FECHA_ABIERTA;
}

export function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000);
}

// ---------------------------------------------------------------------------
// RR. HH.

export function leerPais(celda: Celda): ('UY' | 'CL')[] {
  const s = texto(celda)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (!s) return [];
  if (/AMBOS|UY\s*[/,;+Y-]\s*CL|CL\s*[/,;+Y-]\s*UY/.test(s)) return ['UY', 'CL'];
  const paises: ('UY' | 'CL')[] = [];
  if (/\bUY\b|URUGUAY|\bURY\b/.test(s)) paises.push('UY');
  if (/\bCL\b|CHILE|\bCHL\b/.test(s)) paises.push('CL');
  return paises;
}

const VIGENTE_SI = /^(SI|S|YES|Y|TRUE|1|X|ACTIVO|ACTIVA|VIGENTE|ALTA|EN ACTIVIDAD)$/;
const VIGENTE_NO = /^(NO|N|FALSE|0|INACTIVO|INACTIVA|BAJA|EGRESADO|EGRESADA|DESVINCULADO|DESVINCULADA|NO VIGENTE)$/;

export function leerVigente(celda: Celda): boolean | null {
  if (typeof celda === 'boolean') return celda;
  const s = texto(celda)
    .toUpperCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  if (!s) return null;
  if (VIGENTE_SI.test(s)) return true;
  if (VIGENTE_NO.test(s)) return false;
  return null;
}
