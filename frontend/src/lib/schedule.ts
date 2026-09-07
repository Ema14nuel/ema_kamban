import type { ActivityCard } from '../types';
import { todayIso } from './date';

/**
 * Si se debe mostrar en el tablero/consolidado hoy: las tarjetas sin fecha
 * (backlog) y las ya completadas siempre se ven; las que tienen fecha solo
 * se ven el día que les corresponde.
 */
export function isCardVisibleToday(card: ActivityCard, status: string): boolean {
  if (status === 'done') {
    // Solo se mantienen en el tablero las completadas esta semana. Las de
    // semanas anteriores continúan disponibles en Histórico.
    if (!card.doneAt) return false;
    const today = todayIso();
    const weekday = new Date(`${today}T12:00:00`).getDay();
    const monday = new Date(`${today}T12:00:00`);
    monday.setDate(monday.getDate() - (weekday === 0 ? 6 : weekday - 1));
    return card.doneAt >= monday.toISOString().slice(0, 10) && card.doneAt <= today;
  }
  if (!card.date) return true;
  return card.date === todayIso();
}

/** Tarjeta con fecha ya pasada que nunca se completó — "perdida". */
export function isCardMissed(card: ActivityCard, status: string): boolean {
  if (status === 'done') return false;
  if (!card.date) return false;
  return card.date < todayIso();
}
