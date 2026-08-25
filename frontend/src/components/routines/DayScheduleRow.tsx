import type { DaySchedule } from '../../types';

interface DayScheduleRowProps {
  label: string;
  schedule: DaySchedule;
  onChange: (patch: Partial<DaySchedule>) => void;
  allRow?: boolean;
}

export default function DayScheduleRow({ label, schedule, onChange, allRow }: DayScheduleRowProps) {
  return (
    <div className={`day-row ${allRow ? 'day-row-all' : ''}`} style={{ opacity: !allRow && !schedule.on ? 0.45 : 1 }}>
      <div className="day-row-check" onClick={() => onChange({ on: !schedule.on })} data-on={schedule.on}>
        {schedule.on ? '✓' : ''}
      </div>
      <span className="day-row-label">{label}</span>
      <div className="day-row-mode">
        <button type="button" className={schedule.mode === 'fixed' ? 'active' : ''} onClick={() => onChange({ mode: 'fixed' })}>
          Hora fija
        </button>
        <button type="button" className={schedule.mode === 'range' ? 'active' : ''} onClick={() => onChange({ mode: 'range' })}>
          Rango
        </button>
      </div>
      {schedule.mode === 'fixed' ? (
        <input type="time" value={schedule.time} onChange={(e) => onChange({ time: e.target.value })} />
      ) : (
        <div className="day-row-range">
          <input type="time" value={schedule.start} onChange={(e) => onChange({ start: e.target.value })} />
          <span>–</span>
          <input type="time" value={schedule.end} onChange={(e) => onChange({ end: e.target.value })} />
        </div>
      )}
    </div>
  );
}
