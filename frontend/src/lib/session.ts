// No store imports: every store can register cleanup without dependency cycles.
let epoch = 0;
const cleanups = new Set<() => void>();
export const sessionEpoch = () => epoch;
export const isCurrentSession = (value: number) => value === epoch;
export function onSessionReset(cleanup: () => void) { cleanups.add(cleanup); }
export function resetSessionData() {
  epoch += 1;
  for (const cleanup of cleanups) cleanup();
}
export class StaleSessionError extends Error {
  constructor() { super('La sesión cambió durante la solicitud.'); }
}
export function assertCurrentSession(value: number) {
  if (!isCurrentSession(value)) throw new StaleSessionError();
}
