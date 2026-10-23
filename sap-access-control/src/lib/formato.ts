export function fecha(iso: string | null | undefined): string {
  if (!iso) return '—';
  if (iso === '9999-12-31') return 'Sin límite';
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function fechaHora(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('es-UY', { dateStyle: 'short', timeStyle: 'short' });
}

export function numero(n: number): string {
  return n.toLocaleString('es-UY');
}

export function bytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function plural(n: number, uno: string, varios: string): string {
  return `${numero(n)} ${n === 1 ? uno : varios}`;
}
