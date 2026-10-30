import { useEffect, useState } from 'react';
import { todayIso } from './date';

export function useBusinessToday() {
  const [today, setToday] = useState(todayIso);
  useEffect(() => {
    const update = () => setToday(todayIso());
    const timer = window.setInterval(update, 30000);
    document.addEventListener('visibilitychange', update);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', update); };
  }, []);
  return today;
}
