import { useRef, useState } from 'react';
import { useUiStore } from '../../store/uiStore';
import { displayName, useAuthStore } from '../../store/authStore';
import Modal from '../common/Modal';

export default function ProfileModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const user = useAuthStore((s) => s.user);
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar);
  const removeAvatar = useAuthStore((s) => s.removeAvatar);
  const name = displayName(user);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setUploading(true);
    await uploadAvatar(file);
    setUploading(false);
  }

  return (
    <Modal title="Perfil" onClose={closeModal} footer={<button type="button" className="btn btn-accent" onClick={closeModal}>Cerrar</button>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: 'var(--accent)',
            color: '#fff',
            display: 'grid',
            placeItems: 'center',
            fontWeight: 800,
            fontSize: 16,
            flex: '0 0 auto',
            overflow: 'hidden',
          }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            initials
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 15, fontWeight: 750 }}>{name}</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>
            {user?.email}
          </span>
        </div>
      </div>

      <div className="field">
        <label>Foto de perfil</label>
        <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onPickFile} />
        <div className="row-2">
          <button type="button" className="btn" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? 'Subiendo…' : user?.avatar ? 'Cambiar foto' : 'Subir foto'}
          </button>
          {user?.avatar && (
            <button type="button" className="btn btn-danger" onClick={removeAvatar}>
              Quitar foto
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
