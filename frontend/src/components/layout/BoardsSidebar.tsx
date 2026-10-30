import { NavLink } from 'react-router-dom';
import { useBoardStore } from '../../store/boardStore';
import { useUiStore } from '../../store/uiStore';
import './boardsSidebar.css';

interface BoardsSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}

export default function BoardsSidebar({ collapsed, onToggle, onNavigate }: BoardsSidebarProps) {
  const boards = useBoardStore((s) => s.boards);
  const setActiveBoardId = useUiStore((s) => s.setActiveBoardId);

  return (
    <aside className={`boards-sidebar ${collapsed ? 'is-collapsed' : ''}`} aria-label="Barra lateral de tableros">
      <div className="boards-sidebar-head">
        {!collapsed && <span>Mis tableros <small>{boards.length}</small></span>}
        <button type="button" onClick={onToggle} aria-label={collapsed ? 'Expandir tableros' : 'Minimizar tableros'} title={collapsed ? 'Expandir tableros' : 'Minimizar tableros'} aria-expanded={!collapsed} aria-controls="boards-sidebar-list">{collapsed ? '»' : '«'}</button>
      </div>
      <nav id="boards-sidebar-list" className="boards-sidebar-list" aria-label="Mis tableros">
        {boards.map((board) => (
          <NavLink key={board.id} to={`/boards/${board.id}`} title={board.name} aria-label={board.name} className={({ isActive }) => `boards-sidebar-link ${isActive ? 'active' : ''}`} onClick={() => { setActiveBoardId(board.id); onNavigate(); }}>
            <span className="boards-sidebar-dot" style={{ background: board.color }} aria-hidden="true" />
            {!collapsed && <span className="boards-sidebar-name">{board.name}</span>}
          </NavLink>
        ))}
        {!collapsed && boards.length === 0 && <p className="boards-sidebar-empty">Aún no tienes tableros.</p>}
      </nav>
    </aside>
  );
}
