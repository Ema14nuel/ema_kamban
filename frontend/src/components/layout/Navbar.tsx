import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import { displayName, useAuthStore } from '../../store/authStore';
import { useBoardStore } from '../../store/boardStore';
import { usePomodoroStore } from '../../store/pomodoroStore';
import { mmss } from '../../lib/date';
import UserMenu from './UserMenu';
import './navbar.css';

const NAV_TABS = [
  { label: 'Tableros', path: '/boards' },
  { label: 'Consolidado', path: '/consolidated' },
  { label: 'Actividades', path: '/routines' },
  { label: 'Registro', path: '/log' },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const query = useUiStore((s) => s.query);
  const setQuery = useUiStore((s) => s.setQuery);
  const setActiveBoardId = useUiStore((s) => s.setActiveBoardId);
  const togglePomodoroPanel = useUiStore((s) => s.togglePomodoroPanel);
  const panel = useUiStore((s) => s.panel);
  const boards = useBoardStore((s) => s.boards);
  const user = useAuthStore((s) => s.user);
  const pomo = usePomodoroStore();
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const initials = displayName(user)
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  function isTabActive(path: string) {
    if (path === '/boards') return location.pathname.startsWith('/boards');
    return location.pathname === path;
  }

  return (
    <div className="navbar" ref={navRef}>
      <div className="navbar-brand" onClick={() => navigate('/boards')}>
        <div className="navbar-logo">
          <span />
          <span className="dim" />
          <span className="dim" />
          <span />
        </div>
        <span className="navbar-title">Tableros</span>
      </div>

      <div className="navbar-tabs">
        {NAV_TABS.map((tab) => (
          <div
            key={tab.path}
            className={`navbar-tab ${isTabActive(tab.path) ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <div className="navbar-boards">
        {boards.map((b) => (
          <div
            key={b.id}
            className="navbar-board-pill"
            onClick={() => {
              setActiveBoardId(b.id);
              navigate(`/boards/${b.id}`);
            }}
          >
            <span className="navbar-board-dot" style={{ background: b.color }} />
            {b.name}
          </div>
        ))}
      </div>

      <div className="navbar-actions">
        <input
          type="text"
          className="navbar-search"
          placeholder="Buscar…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="button" className="navbar-theme-btn" onClick={toggleTheme}>
          <span className="mono">{theme === 'dark' ? '☾' : '☀'}</span>
          {theme === 'dark' ? 'Oscuro' : 'Claro'}
        </button>
        <button
          type="button"
          className={`navbar-pomo-btn ${panel === 'pomodoro' ? 'active' : ''}`}
          onClick={togglePomodoroPanel}
        >
          <span className="mono">{mmss(pomo.left)}</span>
          Pomodoro
        </button>
        <UserMenu initials={initials} />
      </div>
    </div>
  );
}
