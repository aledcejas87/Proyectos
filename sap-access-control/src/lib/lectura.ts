import Papa from 'papaparse';
import readXlsxFile from 'read-excel-file/browser';
import type { Fuente } from '../db/types';
import { puntajeEncabezado } from './fuentes';
import { texto, type Celda } from './sap';

// Lectura de archivos 100 % local: el archivo nunca sale del navegador.

export interface Hoja {
  nombre: string;
  filas: Celda[][];
}

export interface ArchivoLeido {
  nombre: string;
  tamano: number;
  sha256: string;
  hojas: Hoja[];
  advertencias: string[];
}

export async function sha256(buffer: ArrayBuffer): Promise<string> {
  if (!globalThis.crypto?.subtle) return 'no disponible (contexto no seguro)';
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** SAP suele exportar texto en Windows-1252; si no es UTF-8 válido, caemos a ese juego. */
export function decodificar(buffer: ArrayBuffer): { texto: string; codificacion: string } {
  try {
    const t = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    return { texto: t.replace(/^﻿/, ''), codificacion: 'UTF-8' };
  } catch {
    return { texto: new TextDecoder('windows-1252').decode(buffer), codificacion: 'Windows-1252' };
  }
}

function detectarDelimitador(t: string): string {
  const lineas = t.split(/\r?\n/).filter((l) => l.trim() && !/^[-|\s]+$/.test(l)).slice(0, 30);
  const candidatos = ['\t', ';', '|', ','];
  let mejor = ',';
  let mejorPuntaje = -1;
  for (const d of candidatos) {
    const cuentas = lineas.map((l) => l.split(d).length - 1);
    const conDelim = cuentas.filter((c) => c > 0);
    if (!conDelim.length) continue;
    // Preferimos el delimitador que aparece en más líneas y con cantidad estable.
    const moda = conDelim.sort((a, b) => conDelim.filter((x) => x === b).length - conDelim.filter((x) => x === a).length)[0];
    const estables = cuentas.filter((c) => c === moda).length;
    const puntaje = estables * 100 + moda;
    if (puntaje > mejorPuntaje) {
      mejorPuntaje = puntaje;
      mejor = d;
    }
  }
  return mejor;
}

export function leerTexto(t: string): Celda[][] {
  const delimitador = detectarDelimitador(t);
  const res = Papa.parse<string[]>(t, { delimiter: delimitador, skipEmptyLines: true });
  let filas = res.data
    // Separadores de "texto sin convertir" de SAP: líneas de guiones.
    .filter((f) => !f.every((c) => /^[-\s]*$/.test(c)));
  if (delimitador === '|') {
    // "|A|B|" deja celdas vacías en los bordes.
    filas = filas.map((f) => {
      let ini = 0;
      let fin = f.length;
      if (f[0]?.trim() === '') ini = 1;
      if (fin > ini && f[fin - 1]?.trim() === '') fin -= 1;
      return f.slice(ini, fin);
    });
  }
  return filas.map((f) => f.map((c) => c.trim()));
}

export async function leerArchivo(archivo: File): Promise<ArchivoLeido> {
  const buffer = await archivo.arrayBuffer();
  const hash = await sha256(buffer);
  const advertencias: string[] = [];
  const nombre = archivo.name.toLowerCase();

  if (nombre.endsWith('.xls')) {
    throw new Error(
      'El formato .xls (Excel 97-2003) no es compatible. Guardalo como .xlsx o exportá como texto/CSV desde SAP.',
    );
  }

  if (nombre.endsWith('.xlsx') || nombre.endsWith('.xlsm')) {
    const hojas: Hoja[] = (await readXlsxFile(buffer)).map((h) => ({
      nombre: h.sheet,
      filas: h.data as Celda[][],
    }));
    if (!hojas.length) throw new Error('No se pudo leer ninguna hoja del archivo Excel.');
    return { nombre: archivo.name, tamano: archivo.size, sha256: hash, hojas, advertencias };
  }

  const { texto: t, codificacion } = decodificar(buffer);
  if (codificacion !== 'UTF-8') advertencias.push(`Archivo de texto leído como ${codificacion}.`);
  return {
    nombre: archivo.name,
    tamano: archivo.size,
    sha256: hash,
    hojas: [{ nombre: 'Texto', filas: leerTexto(t) }],
    advertencias,
  };
}

/** Busca, entre las primeras filas, la que mejor coincide con los encabezados esperados. */
export function detectarFilaEncabezado(fuente: Fuente, filas: Celda[][]): number {
  let mejor = 0;
  let mejorPuntaje = 0;
  for (let i = 0; i < Math.min(filas.length, 25); i++) {
    const p = puntajeEncabezado(fuente, filas[i].map(texto));
    if (p > mejorPuntaje) {
      mejorPuntaje = p;
      mejor = i;
    }
  }
  if (mejorPuntaje > 0) return mejor;
  return Math.max(0, filas.findIndex((f) => f.some((c) => texto(c) !== '')));
}

export interface Tabla {
  encabezados: string[];
  filas: Celda[][];
  /** índice (0-based) de la fila de encabezado en la hoja original */
  filaEncabezado: number;
}

export function armarTabla(hoja: Hoja, filaEncabezado: number): Tabla {
  const cabecera = hoja.filas[filaEncabezado] ?? [];
  const vistos = new Map<string, number>();
  const encabezados = cabecera.map((c, i) => {
    let h = texto(c) || `Columna ${i + 1}`;
    const n = vistos.get(h) ?? 0;
    vistos.set(h, n + 1);
    if (n > 0) h = `${h} (${n + 1})`;
    return h;
  });
  const filas = hoja.filas
    .slice(filaEncabezado + 1)
    .filter((f) => f.some((c) => texto(c) !== ''));
  return { encabezados, filas, filaEncabezado };
}
