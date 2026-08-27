import { useState } from 'react';
import { useBoardStore } from '../../store/boardStore';
import { useRoutineStore, emptyRoutineForm, routineSummary, type RoutineForm } from '../../store/routineStore';
import { DAY_KEYS, DAY_LABELS, type DayKey } from '../../types';
import Select2 from '../common/Select2';
import DayScheduleRow from './DayScheduleRow';
import './routines.css';

export default function RoutinesScreen() {
  const boards = useBoardStore((s) => s.boards);
  const routines = useRoutineStore((s) => s.routines);
  const createRoutine = useRoutineStore((s) => s.createRoutine);
  const removeRoutine = useRoutineStore((s) => s.removeRoutine);

  const [form, setForm] = useState<RoutineForm>(emptyRoutineForm());
  const [feedback, setFeedback] = useState('');

  function patch(p: Partial<RoutineForm>) {
    setForm((f) => ({ ...f, ...p }));
  }

  function patchAllDays(p: Partial<RoutineForm['days'][DayKey]>) {
    const days = { ...form.days };
    DAY_KEYS.forEach((k) => {
      days[k] = { ...days[k], ...p };
    });
    setForm((f) => ({ ...f, days }));
  }

  function patchDay(key: DayKey, p: Partial<RoutineForm['days'][DayKey]>) {
    setForm((f) => ({ ...f, days: { ...f.days, [key]: { ...f.days[key], ...p } } }));
  }

  async function onSubmit() {
    const created = await createRoutine(form);
    if (created > 0) {
      setFeedback(`Se crearon ${created} actividades.`);
      setForm(emptyRoutineForm());
    } else {
      setFeedback('Revisa el nombre, el tablero y el rango de fechas.');
    }
  }

  const allOn = DAY_KEYS.every((k) => form.days[k].on);
  const boardOptions = boards.map((b) => ({ id: b.id, label: b.name, color: b.color }));

  return (
    <div className="routines-screen">
      <div className="routines-form">
        <h1>Actividades recurrentes</h1>
        <p className="mono">Programa una actividad para varios días a la vez.</p>

        <div className="field">
          <label>Nombre de la actividad</label>
          <input type="text" value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="Ej. Revisión diaria" />
        </div>

        <div className="field">
          <label>Descripción</label>
          <textarea value={form.description} onChange={(e) => patch({ description: e.target.value })} rows={3} placeholder="Opcional" />
        </div>

        <div className="field">
          <label>Tablero</label>
          <Select2 options={boardOptions} value={form.boardId} onChange={(id) => patch({ boardId: id })} placeholder="Elegir tablero" />
        </div>

        <div className="row-2">
          <div className="field">
            <label>Fecha inicio</label>
            <input type="date" value={form.from} onChange={(e) => patch({ from: e.target.value })} />
          </div>
          <div className="field">
            <label>Fecha fin</label>
            <input type="date" value={form.to} onChange={(e) => patch({ to: e.target.value })} />
          </div>
        </div>

        <div className="schedule-block">
          <span className="schedule-label">Horario por día</span>
          <DayScheduleRow
            label="Todos"
            allRow
            schedule={{ on: allOn, mode: form.days.mon.mode, time: form.days.mon.time, start: form.days.mon.start, end: form.days.mon.end }}
            onChange={(p) => patchAllDays(p)}
          />
          {DAY_KEYS.map((k) => (
            <DayScheduleRow key={k} label={DAY_LABELS[k]} schedule={form.days[k]} onChange={(p) => patchDay(k, p)} />
          ))}
        </div>

        {feedback && <p className="routines-feedback mono">{feedback}</p>}
        <button type="button" className="btn btn-accent btn-block" onClick={onSubmit}>
          Programar actividades
        </button>
      </div>

      <div className="routines-list">
        <span className="routines-list-label">Programaciones</span>
        {routines.length === 0 && <div className="routines-empty">Aún no has programado actividades.</div>}
        {routines.map((r) => {
          const board = boards.find((b) => b.id === r.boardId);
          return (
            <div key={r.id} className="routine-card card-fade">
              <div className="routine-card-head">
                <span className="routine-card-title">{r.title}</span>
                <button
                  type="button"
                  className="activity-remove"
                  onClick={() => {
                    if (
                      confirm(
                        `¿Borrar "${r.title}"? Las actividades pendientes generadas por esta programación se borran de los tableros. Las que ya se completaron o se perdieron quedan en el Histórico.`,
                      )
                    ) {
                      removeRoutine(r.id);
                    }
                  }}
                  aria-label="Borrar"
                >
                  ✕
                </button>
              </div>
              {board && (
                <span className="routine-chip mono" style={{ color: board.color, background: `${board.color}22` }}>
                  {board.name}
                </span>
              )}
              {r.description && <p className="routine-description">{r.description}</p>}
              <span className="routine-range mono">
                {r.from} → {r.to}
              </span>
              <span className="routine-count mono">{r.count} actividades creadas</span>
              <span className="routine-summary">{routineSummary(r)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
