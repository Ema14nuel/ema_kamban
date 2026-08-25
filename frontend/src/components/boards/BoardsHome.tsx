import { useNavigate } from 'react-router-dom';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import { tint } from '../../lib/color';
import './boardsHome.css';

export default function BoardsHome() {
  const navigate = useNavigate();
  const boards = useBoardStore((s) => s.boards);
  const removeBoard = useBoardStore((s) => s.removeBoard);
  const countOf = useBoardStore((s) => s.countOf);
  const pendingCountOf = useBoardStore((s) => s.pendingCountOf);
  const query = useUiStore((s) => s.query);
  const openModal = useUiStore((s) => s.openModal);
  const setActiveBoardId = useUiStore((s) => s.setActiveBoardId);

  const visible = boards.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()));
  const totalCards = boards.reduce((n, b) => n + countOf(b), 0);

  function bgOf(b: (typeof boards)[number]) {
    if (b.bgType === 'image') return `url("${b.bgValue}") center/cover no-repeat, #22262f`;
    return b.bgValue;
  }

  return (
    <div className="boards-home">
      <div className="boards-home-head">
        <h1>Tus tableros</h1>
        <p className="mono">
          {boards.length} tableros · {totalCards} actividades
        </p>
      </div>
      <div className="boards-grid">
        {visible.map((b) => (
          <div
            key={b.id}
            className="board-card card-fade"
            onClick={() => {
              setActiveBoardId(b.id);
              navigate(`/boards/${b.id}`);
            }}
          >
            <div className="board-card-cover" style={{ background: bgOf(b) }}>
              <button
                type="button"
                className="board-card-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm(`¿Borrar el tablero "${b.name}"?`)) removeBoard(b.id);
                }}
                aria-label="Borrar tablero"
              >
                ✕
              </button>
            </div>
            <div className="board-card-body" style={{ borderTopColor: b.color }}>
              <div className="board-card-title-row">
                <span className="board-card-dot" style={{ background: b.color }} />
                <span className="board-card-name">{b.name}</span>
              </div>
              <div className="board-card-chips mono">
                <span className="board-card-chip" style={{ background: tint(b.color, 0.16) }}>
                  {countOf(b)} actividades
                </span>
                <span className="board-card-chip">{pendingCountOf(b)} pending</span>
                {b.musicUrl && <span className="board-card-chip">♪ audio</span>}
              </div>
            </div>
          </div>
        ))}
        <div className="board-card-new" onClick={() => openModal({ kind: 'board' })}>
          <div className="board-card-new-icon">+</div>
          <span>Crear un tablero nuevo</span>
        </div>
      </div>
    </div>
  );
}
