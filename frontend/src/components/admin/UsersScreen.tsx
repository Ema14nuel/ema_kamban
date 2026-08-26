import { useEffect, useState } from 'react';
import { useAdminUsersStore, type AdminUser } from '../../store/adminUsersStore';
import { useAuthStore } from '../../store/authStore';
import UserFormModal from './UserFormModal';
import './users.css';

export default function UsersScreen() {
  const users = useAdminUsersStore((s) => s.users);
  const loading = useAdminUsersStore((s) => s.loading);
  const error = useAdminUsersStore((s) => s.error);
  const fetchUsers = useAdminUsersStore((s) => s.fetchUsers);
  const setActive = useAdminUsersStore((s) => s.setActive);
  const currentUserId = useAuthStore((s) => s.user?.id);

  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return (
    <div className="users-screen">
      <div className="users-head">
        <div>
          <h1>Usuarios</h1>
          <p className="mono">{users.length} cuentas registradas</p>
        </div>
        <button type="button" className="btn btn-accent" onClick={() => setEditing('new')}>
          + Nuevo usuario
        </button>
      </div>

      {error && <p className="users-error mono">{error}</p>}

      <div className="users-table">
        <div className="users-row users-row-head mono">
          <span>Usuario</span>
          <span>Correo</span>
          <span>Rol</span>
          <span>Estado</span>
          <span />
        </div>
        {loading && users.length === 0 && <div className="users-empty">Cargando…</div>}
        {!loading && users.length === 0 && <div className="users-empty">No hay usuarios todavía.</div>}
        {users.map((u) => (
          <div key={u.id} className="users-row">
            <span className="users-name">
              {u.first_name || u.last_name ? `${u.first_name} ${u.last_name}`.trim() : u.username}
            </span>
            <span className="mono users-email">{u.email}</span>
            <span>
              {u.is_staff ? <span className="users-badge badge-admin">Admin</span> : <span className="users-badge">Usuario</span>}
            </span>
            <span>
              {u.is_active ? <span className="users-badge badge-active">Activo</span> : <span className="users-badge badge-inactive">Inactivo</span>}
            </span>
            <span className="users-actions">
              <button type="button" className="btn" onClick={() => setEditing(u)}>
                Editar
              </button>
              <button
                type="button"
                className={`btn ${u.is_active ? 'btn-danger' : 'btn-accent'}`}
                disabled={u.id === currentUserId}
                title={u.id === currentUserId ? 'No puedes desactivar tu propia cuenta' : undefined}
                onClick={() => setActive(u.id, !u.is_active)}
              >
                {u.is_active ? 'Desactivar' : 'Activar'}
              </button>
            </span>
          </div>
        ))}
      </div>

      {editing && <UserFormModal user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </div>
  );
}
