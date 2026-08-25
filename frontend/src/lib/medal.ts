import type { ActivityCard, Medal, StatusKey } from '../types';
import { todayIso } from './date';

export function medalOf(card: ActivityCard, status: StatusKey): Medal | null {
  if (status !== 'done') return null;
  const done = card.doneAt || todayIso();
  if (!card.date) {
    return { tier: 'oro', color: 'var(--medal-oro)', shade: 'var(--medal-oro-shade)', label: 'A tiempo' };
  }
  const diff = Math.round(
    (new Date(`${done}T00:00:00`).getTime() - new Date(`${card.date}T00:00:00`).getTime()) / 86400000,
  );
  if (diff <= 0) return { tier: 'oro', color: 'var(--medal-oro)', shade: 'var(--medal-oro-shade)', label: 'A tiempo' };
  if (diff <= 2) return { tier: 'plata', color: 'var(--medal-plata)', shade: 'var(--medal-plata-shade)', label: 'Hasta 2 días tarde' };
  return { tier: 'bronce', color: 'var(--medal-bronce)', shade: 'var(--medal-bronce-shade)', label: 'Más de 2 días tarde' };
}
