import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUiStore } from '../../store/uiStore';
import { displayName, useAuthStore } from '../../store/authStore';

interface UserMenuProps {
  initials: string;
}

export default function UserMenu({ initials }: UserMenuProps) {
  const navigate = useNavigate();
  const open = useUiStore((s) => s.userMenuOpen);
  const toggle = useUiStore((s) => s.toggleUserMenu);
  const close = useUiStore((s) => s.closeUserMenu);
  const openModal = useUiStore((s) => s.openModal);
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [close]);

  const items = [
    { label: 'Perfil', icon: '◐', go: () => openModal({ kind: 'profile' }) },
    { label: 'Configuraciones', icon: '⚙', go: () => openModal({ kind: 'settings' }) },
    ...(user?.is_staff ? [{ label: 'Usuarios', icon: '☺', go: () => navigate('/users') }] : []),
    { label: 'Cerrar sesión', icon: '⏻', go: () => logout() },
  ];

  return (
    <div className="navbar-user" ref={ref}>
      <div className="navbar-avatar" title="Cuenta" onClick={toggle}>
        {initials}
      </div>
      {open && (
        <div className="navbar-user-menu pop-in">
          <div className="navbar-user-head">
            <span className="navbar-user-name">{displayName(user)}</span>
            <span className="navbar-user-email mono">{user?.email}</span>
          </div>
          <div className="navbar-user-items">
            {items.map((it) => (
              <div
                key={it.label}
                className="navbar-user-item"
                onClick={() => {
                  it.go();
                  close();
                }}
              >
                <span className="navbar-user-item-icon">{it.icon}</span>
                {it.label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
