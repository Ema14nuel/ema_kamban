import type { ActivityCard } from '../types';
import { todayIso } from './date';

/** Una ocurrencia recurrente vencida solo pertenece al histórico. */
export function isExpiredRecurring(card: ActivityCard, status: string): boolean {
  return Boolean((card.isRecurring || card.routineId) && isCardMissed(card, status));
}

/**
 * Si se debe mostrar en el tablero/consolidado hoy: las tarjetas sin fecha
 * (backlog) y las pendientes vencidas permanecen visibles hasta completarlas.
 * Las futuras esperan al día que les corresponde.
 */
export function isCardVisibleToday(card: ActivityCard, status: string): boolean {
  if (status === 'done') {
    // Solo se mantienen en el tablero las completadas esta semana. Las de
    // semanas anteriores continúan disponibles en Histórico.
    if (!card.doneAt) return false;
    const today = todayIso();
    const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
    const monday = new Date(`${today}T12:00:00Z`);
    monday.setUTCDate(monday.getUTCDate() - (weekday === 0 ? 6 : weekday - 1));
    return card.doneAt >= monday.toISOString().slice(0, 10) && card.doneAt <= today;
  }
  if (!card.date) return true;
  if (card.isRecurring || card.routineId) return card.date === todayIso();
  return card.date <= todayIso();
}

/** Días de calendario vencidos; no depende de la hora ni de cambios horarios. */
export function overdueDays(card: ActivityCard, status: string): number {
  if (card.isRecurring || card.routineId || !isCardMissed(card, status)) return 0;
  const due = Date.parse(`${card.date}T00:00:00Z`);
  const today = Date.parse(`${todayIso()}T00:00:00Z`);
  return Number.isFinite(due) ? Math.max(0, Math.round((today - due) / 86400000)) : 0;
}

/** Tarjeta con fecha ya pasada que nunca se completó — "perdida". */
export function isCardMissed(card: ActivityCard, status: string): boolean {
  if (status === 'done') return false;
  if (!card.date) return false;
  return card.date < todayIso();
}
