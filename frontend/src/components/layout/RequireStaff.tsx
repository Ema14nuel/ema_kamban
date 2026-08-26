import type { ReactElement } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function RequireStaff({ children }: { children: ReactElement }) {
  const isStaff = useAuthStore((s) => s.user?.is_staff);
  if (!isStaff) return <Navigate to="/boards" replace />;
  return children;
}
