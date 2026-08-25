import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import ColumnsView from './ColumnsView';
import CalendarView from './CalendarView';
import './boardDetail.css';

export default function BoardDetail() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const boards = useBoardStore((s) => s.boards);
  const countOf = useBoardStore((s) => s.countOf);
  const boardView = useUiStore((s) => s.boardView);
  const setBoardView = useUiStore((s) => s.setBoardView);
  const setActiveBoardId = useUiStore((s) => s.setActiveBoardId);
  const openModal = useUiStore((s) => s.openModal);
  const openFocus = useUiStore((s) => s.openFocus);

  const board = boards.find((b) => b.id === boardId);

  useEffect(() => {
    if (board) setActiveBoardId(board.id);
  }, [board, setActiveBoardId]);

  if (!board) {
    return (
      <div className="board-detail-missing">
        <p>Este tablero ya no existe.</p>
        <button type="button" className="btn" onClick={() => navigate('/boards')}>
          Volver a tableros
        </button>
      </div>
    );
  }

  const bg = board.bgType === 'image' ? `url("${board.bgValue}") center/cover no-repeat, #22262f` : board.bgValue;
  const entries = board.columns.flatMap((c) => c.cards.map((card) => ({ card, board })));

  return (
    <div className="board-detail" style={{ background: bg }}>
      <div className="board-detail-tint">
        <div className="board-subheader">
          <button type="button" className="board-back" onClick={() => navigate('/boards')}>
            ← Tableros
          </button>
          <span className="board-subheader-dot" style={{ background: board.color }} />
          <span className="board-subheader-name">{board.name}</span>
          <span className="board-subheader-count mono">{countOf(board)}</span>
          <div className="board-subheader-tabs">
            <div className={`board-tab ${boardView === 'columns' ? 'active' : ''}`} onClick={() => setBoardView('columns')}>
              Columnas
            </div>
            <div className={`board-tab ${boardView === 'calendar' ? 'active' : ''}`} onClick={() => setBoardView('calendar')}>
              Calendario
            </div>
          </div>
          <button type="button" className="board-config" onClick={() => openModal({ kind: 'board', boardId: board.id })}>
            ⚙ Configurar
          </button>
        </div>

        <div className="board-content">
          {boardView === 'columns' ? (
            <ColumnsView board={board} />
          ) : (
            <CalendarView entries={entries} onOpenCard={(bId, cardId) => openFocus(bId, cardId)} />
          )}
        </div>
      </div>
    </div>
  );
}
