import { useUiStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import { SPRITES } from '../../types';
import Modal from '../common/Modal';
import './settings.css';

export default function SettingsModal() {
  const closeModal = useUiStore((s) => s.closeModal);
  const theme = useUiStore((s) => s.theme);
  const toggleTheme = useUiStore((s) => s.toggleTheme);
  const user = useAuthStore((s) => s.user);
  const updateProfile = useAuthStore((s) => s.updateProfile);

  return (
    <Modal title="Configuraciones" onClose={closeModal} footer={<button type="button" className="btn btn-accent" onClick={closeModal}>Listo</button>}>
      <div className="field">
        <label>Tema</label>
        <div className="row-2">
          <button type="button" className={`btn ${theme === 'light' ? 'btn-accent' : ''}`} onClick={() => theme !== 'light' && toggleTheme()}>
            Claro
          </button>
          <button type="button" className={`btn ${theme === 'dark' ? 'btn-accent' : ''}`} onClick={() => theme !== 'dark' && toggleTheme()}>
            Oscuro
          </button>
        </div>
      </div>

      <div className="field">
        <label>Personaje</label>
        <div className="sprite-grid">
          {SPRITES.map((s) => (
            <div key={s.k} className={`sprite-card ${user?.sprite === s.k ? 'active' : ''}`} onClick={() => updateProfile({ sprite: s.k })}>
              <img src={s.src} alt={s.name} />
              <span>{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="settings-toggle-row">
        <span>Avisar al terminar un pomodoro</span>
        <div
          className={`toggle-switch ${user?.notify_on_pomodoro ? 'on' : ''}`}
          onClick={() => updateProfile({ notify_on_pomodoro: !user?.notify_on_pomodoro })}
        >
          <span className="toggle-knob" />
        </div>
      </div>
    </Modal>
  );
}
