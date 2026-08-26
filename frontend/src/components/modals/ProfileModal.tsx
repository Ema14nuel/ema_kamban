import { useUiStore } from '../../store/uiStore';
import { displayName, useAuthStore } from '../../store/authStore';
import Modal from '../common/Modal';

export default function ProfileModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const user = useAuthStore((s) => s.user);
  const name = displayName(user);

  const initials = name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

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
          }}
        >
          {initials}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <span style={{ fontSize: 15, fontWeight: 750 }}>{name}</span>
          <span className="mono" style={{ fontSize: 12, color: 'var(--dim)' }}>
            {user?.email}
          </span>
        </div>
      </div>
    </Modal>
  );
}
