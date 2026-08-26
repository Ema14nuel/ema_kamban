export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function toIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function mmss(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatShortDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}

/** Formats an ISO datetime string (e.g. a backend created_at) as a short date. */
export function formatIsoDateTimeShort(isoDateTime: string | undefined): string {
  if (!isoDateTime) return '';
  return new Date(isoDateTime).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

/** Formats a millisecond timestamp as a full date + time, for trace/history entries. */
export function formatDateTime(ms: number): string {
  return new Date(ms).toLocaleString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
