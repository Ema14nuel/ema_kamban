import './fab.css';

interface FabProps {
  onClick: () => void;
}

export default function Fab({ onClick }: FabProps) {
  return (
    <button type="button" className="fab" onClick={onClick} aria-label="Nueva actividad">
      <span className="fab-bar fab-bar-h" />
      <span className="fab-bar fab-bar-v" />
    </button>
  );
}
