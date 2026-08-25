export function tint(hex: string | undefined, alpha: number): string {
  const h = (hex || '#888888').replace('#', '');
  const full = h.length === 3
    ? h.split('').map((c) => c + c).join('')
    : h;
  const n = parseInt(full, 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r},${g},${b},${alpha})`;
}
