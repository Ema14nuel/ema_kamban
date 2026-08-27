import type { ActivityCard } from '../types';
import { todayIso } from './date';

/**
 * Si se debe mostrar en el tablero/consolidado hoy: las tarjetas sin fecha
 * (backlog) y las ya completadas siempre se ven; las que tienen fecha solo
 * se ven el día que les corresponde.
 */
export function isCardVisibleToday(card: ActivityCard, status: string): boolean {
  if (status === 'done') return true;
  if (!card.date) return true;
  return card.date === todayIso();
}

/** Tarjeta con fecha ya pasada que nunca se completó — "perdida". */
export function isCardMissed(card: ActivityCard, status: string): boolean {
  if (status === 'done') return false;
  if (!card.date) return false;
  return card.date < todayIso();
}
