import { useEffect, useMemo, useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { useLogStore } from '../../store/logStore';
import { useUiStore } from '../../store/uiStore';
import { api } from '../../lib/api';
import { isCardVisibleToday } from '../../lib/schedule';
import { useBusinessToday } from '../../lib/useBusinessToday';
import { STATUSES } from '../../types';
import './dashboard.css';

type Ratio = { completed: number; total: number; percent: number | null };
interface Summary {
  recurring: Ratio;
  punctuality: Ratio;
  completed: number;
  recovered: number;
  overdue: { total: number; one_two: number; three_seven: number; over_seven: number };
  daily: { date: string; completed: number }[];
  coverage: { baseline_commitments: number; unknown_completions: number };
}
interface Metrics extends Summary {
  focus_minutes: number;
  today: string;
  boards: (Summary & { id: number; name: string; color: string })[];
}
type Period = 'today' | 'week' | 'month' | 'custom';

export default function DashboardScreen() {
  const boards = useBoardStore((s) => s.boards);
  const loaded = useBoardStore((s) => s.loaded);
  const log = useLogStore((s) => s.log);
  const openFocus = useUiStore((s) => s.openFocus);
  const today = useBusinessToday();
  const [period, setPeriod] = useState<Period>('week');
  const [boardId, setBoardId] = useState('');
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [refresh, setRefresh] = useState(0);

  const range = useMemo(() => {
    if (period === 'custom') return { start: customStart, end: customEnd };
    if (period === 'today') return { start: today, end: today };
    if (period === 'month') return { start: `${today.slice(0, 7)}-01`, end: today };
    const day = new Date(`${today}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() - (day.getUTCDay() + 6) % 7);
    return { start: day.toISOString().slice(0, 10), end: today };
  }, [period, customStart, customEnd, today]);

  useEffect(() => {
    const onVisible = () => { if (!document.hidden) setRefresh((n) => n + 1); };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('kamban:metrics-changed', onVisible);
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('kamban:metrics-changed', onVisible); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Synchronize loading with this external request; cleanup ignores stale replies.
    // eslint-disable-next-line react/set-state-in-effect
    setLoading(true);
    setError('');
    setMetrics(null);
    if (!range.start || !range.end || range.start > range.end || (Date.parse(range.end) - Date.parse(range.start)) / 86400000 > 365) {
      setLoading(false);
      setError('Selecciona un rango válido de hasta 366 días.');
      return;
    }
    const params = new URLSearchParams({ start: range.start, end: range.end });
    if (boardId) params.set('board', boardId);
    api.get<Metrics>(`/metrics/?${params}`).then((data) => {
      if (!cancelled) setMetrics(data);
    }).catch(() => {
      if (!cancelled) setError('No pudimos cargar los indicadores. Intenta de nuevo.');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [range, boardId, boards, log, revision, refresh]);

  const visibleBoards = boards.filter((board) => !boardId || board.id === boardId);
  const agenda = visibleBoards.flatMap((board) => board.columns.flatMap((column) => column.status === 'done' ? [] : column.cards.filter((card) => isCardVisibleToday(card, column.status)).map((card) => ({ card, board, status: column.status }))));
  agenda.sort((a, b) => (a.card.date || today).localeCompare(b.card.date || today) || (a.card.time || '99:99').localeCompare(b.card.time || '99:99'));
  const percent = (ratio: Ratio) => ratio.percent === null ? '—' : `${ratio.percent.toLocaleString('es-CO')} %`;
  const fraction = (ratio: Ratio) => ratio.total ? `${ratio.completed} de ${ratio.total} compromisos evaluables` : 'Sin actividades evaluables';
  const trend = metrics?.daily ?? [];
  const max = Math.max(1, ...trend.map((day) => day.completed));

  return (
    <main className="dashboard-screen">
      <header className="dashboard-head"><div><span className="dashboard-eyebrow">TU PROGRESO</span><h1>Dashboard</h1><p>Resultados, constancia y compromisos de tus tableros.</p></div><span className="dashboard-zone">Hora de Bogotá</span></header>
      <section className="dashboard-filters" aria-label="Filtros de indicadores">
        <div className="dashboard-periods" role="group" aria-label="Período">
          {([['today', 'Hoy'], ['week', 'Semana'], ['month', 'Mes'], ['custom', 'Rango']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}
        </div>
        <label className="dashboard-board-filter">Tablero<select value={boardId} onChange={(e) => setBoardId(e.target.value)}><option value="">Todos los tableros</option>{boards.map((board) => <option key={board.id} value={board.id}>{board.name}</option>)}</select></label>
        {period === 'custom' && <div className="dashboard-dates"><label>Desde<input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} /></label><label>Hasta<input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} /></label></div>}
      </section>
      <p className="dashboard-range mono">{range.start} → {range.end} · Los compromisos de hoy abiertos se evalúan al cerrar el día.</p>
      {loading && <div className="dashboard-message" role="status">Calculando tus indicadores…</div>}
      {error && <div className="dashboard-message dashboard-error" role="alert">{error}<button type="button" className="btn" onClick={() => setRevision((n) => n + 1)}>Reintentar</button></div>}
      {metrics && !loading && <>
        <section className="dashboard-stats" aria-label="Indicadores de resultados">
          <article className="dashboard-stat"><span className="dashboard-stat-label">Cumplimiento recurrente</span><strong className="dashboard-stat-value">{percent(metrics.recurring)}</strong><small>{fraction(metrics.recurring)}</small><progress max={100} value={metrics.recurring.percent ?? 0} aria-label="Cumplimiento recurrente" /></article>
          <article className="dashboard-stat"><span className="dashboard-stat-label">Puntualidad</span><strong className="dashboard-stat-value">{percent(metrics.punctuality)}</strong><small>{fraction(metrics.punctuality)}</small><progress max={100} value={metrics.punctuality.percent ?? 0} aria-label="Puntualidad" /></article>
          <article className="dashboard-stat"><span className="dashboard-stat-label">Resultados del período</span><strong className="dashboard-stat-value">{metrics.completed}</strong><small>Actividades completadas por primera vez</small></article>
          <article className="dashboard-stat dashboard-stat-warning"><span className="dashboard-stat-label">Pendientes vencidas</span><strong className="dashboard-stat-value">{metrics.overdue.total}</strong><small>Estado actual · solo no recurrentes</small><span className="dashboard-aging">1–2 días: {metrics.overdue.one_two} · 3–7: {metrics.overdue.three_seven} · +7: {metrics.overdue.over_seven}</span></article>
        </section>
        {(metrics.coverage.baseline_commitments > 0 || metrics.coverage.unknown_completions > 0) && <p className="dashboard-coverage">Histórico: {metrics.coverage.baseline_commitments} compromisos usan la fecha disponible como línea base. {metrics.coverage.unknown_completions > 0 ? `${metrics.coverage.unknown_completions} finalizaciones no tienen fecha verificable.` : 'Las fechas antiguas pueden tener precisión de día.'}</p>}
        <div className="dashboard-panels">
          <section className="dashboard-section"><h2>Resultados por día</h2><p className="dashboard-muted">Primera finalización en el período seleccionado.</p><div className="dashboard-trend" role="list" aria-label="Resultados diarios">{trend.map((day) => <div className="dashboard-trend-day" role="listitem" key={day.date} aria-label={`${day.date}: ${day.completed} completadas`}><span>{day.completed}</span><div className="dashboard-trend-track"><i style={{ height: `${day.completed / max * 100}%` }} /></div><small>{day.date.slice(8)}/{day.date.slice(5, 7)}</small></div>)}</div></section>
          <section className="dashboard-section"><h2>Esfuerzo y recuperación</h2><div className="dashboard-support"><div><strong>{metrics.recovered}</strong><span>Actividades recuperadas</span></div><div><strong>{metrics.focus_minutes}</strong><span>Minutos Pomodoro registrados</span></div></div><p className="dashboard-muted">Las recurrentes perdidas se conservan como incumplidas. Los minutos son un registro de enfoque, no una medida de calidad.</p></section>
        </div>
        <section className="dashboard-section"><h2>Resultados por tablero</h2><div className="dashboard-board-results">{metrics.boards.map((board) => <article key={board.id}><h3><span className="column-dot" style={{ background: board.color }} />{board.name}</h3><span><strong>{board.completed}</strong> completadas</span><span>Puntualidad: {percent(board.punctuality)} · {board.punctuality.completed}/{board.punctuality.total}</span><span>Recurrentes: {percent(board.recurring)} · {board.recurring.completed}/{board.recurring.total}</span></article>)}{metrics.boards.length === 0 && <p className="dashboard-muted">Crea un tablero para comenzar a registrar tus resultados.</p>}</div></section>
      </>}
      <section className="dashboard-agenda"><h2>Agenda y pendientes</h2>{agenda.length === 0 ? <p className="dashboard-muted">{loaded ? 'No hay actividades pendientes para hoy.' : 'Cargando actividades…'}</p> : <div className="dashboard-agenda-list">{agenda.map(({ card, board, status }) => <button type="button" key={card.id} className="dashboard-agenda-row" onClick={() => openFocus(board.id, card.id)}><span className="dashboard-agenda-time mono">{card.time || '--:--'}</span><span className="column-dot" style={{ background: STATUSES.find((s) => s.key === status)?.color ?? board.color }} /><span className="dashboard-agenda-info"><span className="dashboard-agenda-title">{card.title}</span><span className="dashboard-agenda-board" style={{ color: board.color }}>{board.name}{card.date && card.date < today ? ' · Vencida' : ''}</span></span></button>)}</div>}</section>
    </main>
  );
}
