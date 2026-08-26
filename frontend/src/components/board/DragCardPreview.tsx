import type { CardDragData } from './dnd';
import './dragCardPreview.css';

export default function DragCardPreview({ data }: { data: CardDragData }) {
  return (
    <div className="drag-card-preview" style={{ borderLeftColor: data.color }}>
      {data.medalColor && <span className="drag-card-preview-medal" style={{ background: data.medalColor }} />}
      <span className="drag-card-preview-title">{data.title}</span>
    </div>
  );
}
