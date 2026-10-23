// Exportación a CSV (separador ; y BOM, para que Excel en español lo abra bien).
export function descargarCsv(nombre: string, encabezados: string[], filas: (string | number | null | undefined)[][]) {
  const esc = (v: string | number | null | undefined) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const contenido = '﻿' + [encabezados, ...filas].map((f) => f.map(esc).join(';')).join('\r\n');
  descargarTexto(nombre, contenido, 'text/csv;charset=utf-8');
}

export function descargarTexto(nombre: string, contenido: string, tipo = 'text/plain;charset=utf-8') {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
