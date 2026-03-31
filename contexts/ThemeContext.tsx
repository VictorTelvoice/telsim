
import React, { createContext, useContext, useState, useEffect } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function currentHashPath(): string {
  if (typeof window === 'undefined') return '/';
  const hash = window.location.hash || '';
  if (!hash.startsWith('#')) return '/';
  const raw = hash.slice(1) || '/';
  return raw.startsWith('/') ? raw : `/${raw}`;
}

function allowsDarkTheme(path: string): boolean {
  return path.startsWith('/dashboard') || path.startsWith('/web') || path.startsWith('/admin');
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('telsim_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });
  const [path, setPath] = useState<string>(() => currentHashPath());

  useEffect(() => {
    const syncPath = () => setPath(currentHashPath());
    window.addEventListener('hashchange', syncPath);
    window.addEventListener('popstate', syncPath);
    return () => {
      window.removeEventListener('hashchange', syncPath);
      window.removeEventListener('popstate', syncPath);
    };
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    const canUseDark = allowsDarkTheme(path);
    if (theme === 'dark' && canUseDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('telsim_theme', theme);
  }, [theme, path]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
