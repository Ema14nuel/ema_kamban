import { useUiStore } from '../../store/uiStore';
import BoardModal from './BoardModal';
import NewActivityModal from './NewActivityModal';
import NewColumnModal from './NewColumnModal';
import ProfileModal from './ProfileModal';
import SettingsModal from './SettingsModal';

export default function ModalsRoot() {
  const kind = useUiStore((s) => s.modal.kind);

  if (kind === 'board') return <BoardModal />;
  if (kind === 'activity') return <NewActivityModal />;
  if (kind === 'column') return <NewColumnModal />;
  if (kind === 'profile') return <ProfileModal />;
  if (kind === 'settings') return <SettingsModal />;
  return null;
}
