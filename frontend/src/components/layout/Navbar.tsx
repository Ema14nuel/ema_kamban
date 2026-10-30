import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import { displayName, useAuthStore } from '../../store/authStore';

import { usePomodoroStore } from '../../store/pomodoroStore';
import { mmss } from '../../lib/date';
import UserMenu from './UserMenu';
import './navbar.css';

const NAV_TABS = [
  { label: 'Inicio', path: '/' },
  { label: 'Tableros', path: '/boards' },
  { label: 'Consolidado', path: '/consolidated' },
  { label: 'Actividades', path: '/routines' },
  { label: 'Registro', path: '/log' },
  { label: 'Histórico', path: '/history' },
];

export default function Navbar({ sidebarCollapsed, onToggleSidebar }: { sidebarCollapsed: boolean; onToggleSidebar: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const query = useUiStore((s) => s.query);
  const setQuery = useUiStore((s) => s.setQuery);

  const togglePomodoroPanel = useUiStore((s) => s.togglePomodoroPanel);
  const panel = useUiStore((s) => s.panel);

  const user = useAuthStore((s) => s.user);
  const pomo = usePomodoroStore();
  const navRef = useRef<HTMLDivElement>(null);
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === location.pathname;
  const setMenuOpen = (open: boolean) => setMenuPath(open ? location.pathname : null);

  useEffect(() => {
    const el = navRef.current;
    if (!el) return;
    const measure = () => document.documentElement.style.setProperty('--nav-h', `${el.offsetHeight}px`);
    measure();
    const obs = new ResizeObserver(measure);
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuPath(null); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const initials = displayName(user)
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  function isTabActive(path: string) {
    if (path === '/boards') return location.pathname.startsWith('/boards');
    if (path === '/') return location.pathname === '/';
    return location.pathname === path;
  }

  return (
    <div className="navbar" ref={navRef}>
      <button type="button" className="navbar-sidebar-toggle" onClick={() => { setMenuOpen(false); onToggleSidebar(); }} aria-label={sidebarCollapsed ? 'Mostrar tableros' : 'Ocultar tableros'} aria-expanded={!sidebarCollapsed} aria-controls="boards-sidebar-list">▦</button>
      <button type="button" className="navbar-brand" aria-label="Ir al dashboard" onClick={() => navigate('/')}>
        <div className="navbar-logo">
          <span />
          <span className="dim" />
          <span className="dim" />
          <span />
        </div>
        <span className="navbar-title">Tableros</span>
      </button>

      <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
        <div className="navbar-tabs">
          {NAV_TABS.map((tab) => (
            <NavLink
              to={tab.path}
              end={tab.path === '/'}
              key={tab.path}
              className={`navbar-tab ${isTabActive(tab.path) ? 'active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {tab.label}
            </NavLink>
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
        </div>
      </div>

      <button
        type="button"
        className="navbar-hamburger"
        onClick={() => { if (!sidebarCollapsed) onToggleSidebar(); setMenuOpen(!menuOpen); }}
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
        aria-expanded={menuOpen}
      >
        <span />
        <span />
        <span />
      </button>

      <UserMenu initials={initials} />
    </div>
  );
}
