import { useCallback, useEffect, useState } from 'react';

export type ThemeMode = 'light' | 'dark';

const THEME_KEY = 'projecao-tema';

function systemTheme(): ThemeMode {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function savedTheme(): ThemeMode | null {
  try {
    const v = localStorage.getItem(THEME_KEY);
    return v === 'light' || v === 'dark' ? v : null;
  } catch {
    return null;
  }
}

/** Tema efetivo: o escolhido pela pessoa ou, se nenhum, o do sistema. */
export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => savedTheme() ?? systemTheme());

  useEffect(() => {
    if (savedTheme()) return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const onChange = () => setTheme(mq.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = next;
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch {
        // sem armazenamento: vale só nesta aba
      }
      return next;
    });
  }, []);

  return { theme, toggle };
}
