export function ytId(url: string): string | null {
  const m = (url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([A-Za-z0-9_-]{6,})/);
  return m ? m[1] : null;
}
