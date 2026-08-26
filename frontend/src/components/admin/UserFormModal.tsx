import { useState } from 'react';
import { useAdminUsersStore, type AdminUser } from '../../store/adminUsersStore';
import Modal from '../common/Modal';

interface UserFormModalProps {
  user: AdminUser | null;
  onClose: () => void;
}

export default function UserFormModal({ user, onClose }: UserFormModalProps) {
  const createUser = useAdminUsersStore((s) => s.createUser);
  const updateUser = useAdminUsersStore((s) => s.updateUser);
  const error = useAdminUsersStore((s) => s.error);

  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [password, setPassword] = useState('');
  const [isStaff, setIsStaff] = useState(user?.is_staff || false);
  const [saving, setSaving] = useState(false);

  const isEditing = !!user;

  async function onSave() {
    if (!username.trim() || !email.trim()) return;
    if (!isEditing && !password) return;
    setSaving(true);
    const ok = isEditing
      ? await updateUser(user.id, { username: username.trim(), email: email.trim(), first_name: firstName, last_name: lastName, is_staff: isStaff })
      : await createUser({ username: username.trim(), email: email.trim(), first_name: firstName, last_name: lastName, password, is_staff: isStaff });
    setSaving(false);
    if (ok) onClose();
  }

  return (
    <Modal
      title={isEditing ? 'Editar usuario' : 'Nuevo usuario'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          <button type="button" className="btn btn-accent" disabled={saving} onClick={onSave}>
            {isEditing ? 'Guardar' : 'Crear'}
          </button>
        </>
      }
    >
      {error && <p className="users-error mono">{error}</p>}
      <div className="row-2">
        <div className="field">
          <label>Usuario</label>
          <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="nombre.usuario" />
        </div>
        <div className="field">
          <label>Correo</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@empresa.com" />
        </div>
      </div>
      <div className="row-2">
        <div className="field">
          <label>Nombre</label>
          <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>
        <div className="field">
          <label>Apellido</label>
          <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} />
        </div>
      </div>
      {!isEditing && (
        <div className="field">
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
        </div>
      )}
      <label className="users-checkbox-row">
        <input type="checkbox" checked={isStaff} onChange={(e) => setIsStaff(e.target.checked)} />
        Es administrador (puede ver esta pantalla y gestionar usuarios)
      </label>
    </Modal>
  );
}
