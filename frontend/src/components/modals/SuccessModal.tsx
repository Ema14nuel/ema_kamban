import { useUiStore } from '../../store/uiStore';
import Modal from '../common/Modal';

/** Confirmación breve y explícita tras crear una actividad o rutina. */
export default function SuccessModal() {
  const modal = useUiStore((s) => s.modal);
  const closeModal = useUiStore((s) => s.closeModal);

  return (
    <Modal
      title="Actividad creada"
      onClose={closeModal}
      footer={<button type="button" className="btn btn-accent" onClick={closeModal}>Entendido</button>}
      width={400}
    >
      <p>{modal.message || 'La actividad se creó correctamente.'}</p>
    </Modal>
  );
}
