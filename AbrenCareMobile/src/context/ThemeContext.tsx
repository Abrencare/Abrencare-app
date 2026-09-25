import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'abrencare-theme';

export type ThemeMode = 'light' | 'dark';

export type HomePalette = {
  page: string;
  card: string;
  border: string;
  text: string;
  muted: string;
  chip: string;
  icon: string;
  iconMuted: string;
  button: string;
  buttonBorder: string;
  nav: string;
  navBorder: string;
  navActive: string;
  navInactive: string;
  continue: string;
  continueKicker: string;
  continueTitle: string;
  continueChevron: string;
  dropdown: string;
  dropdownBorder: string;
  overlay: string;
  divider: string;
  gold: string;
  heroFade: [string, string, string, string];
};

const lightPalette: HomePalette = {
  page: '#F7F8F6',
  card: '#FFFFFF',
  border: '#E7EEEA',
  text: '#16332C',
  muted: '#5C6B65',
  chip: 'rgba(231,238,234,0.94)',
  icon: '#16332C',
  iconMuted: '#5C6B65',
  button: '#FFFFFF',
  buttonBorder: '#D5DDD8',
  nav: '#FFFFFF',
  navBorder: '#E7EEEA',
  navActive: '#1A4A42',
  navInactive: '#8A938E',
  continue: '#1A3A32',
  continueKicker: '#C9D4CE',
  continueTitle: '#FFFFFF',
  continueChevron: '#C9D4CE',
  dropdown: '#FFFFFF',
  dropdownBorder: '#E7EEEA',
  overlay: 'rgba(15, 22, 19, 0.12)',
  divider: '#E7EEEA',
  gold: '#C4A05A',
  heroFade: ['#FFFFFF', 'rgba(255,255,255,0.94)', 'rgba(255,255,255,0.35)', 'transparent'],
};

const darkPalette: HomePalette = {
  page: '#0E1412',
  card: '#1A221F',
  border: '#2C3833',
  text: '#F1F5F3',
  muted: '#A3B0AA',
  chip: 'rgba(14, 28, 25, 0.82)',
  icon: '#F1F5F3',
  iconMuted: '#A3B0AA',
  button: '#1A221F',
  buttonBorder: '#2C3833',
  nav: '#1A221F',
  navBorder: '#2C3833',
  navActive: '#C9E4D8',
  navInactive: '#7A8681',
  continue: '#243830',
  continueKicker: '#A3B0AA',
  continueTitle: '#F1F5F3',
  continueChevron: '#7A8681',
  dropdown: '#1A221F',
  dropdownBorder: '#2C3833',
  overlay: 'rgba(4, 8, 7, 0.22)',
  divider: '#2C3833',
  gold: '#C4A05A',
  heroFade: ['#1A221F', 'rgba(26,34,31,0.94)', 'rgba(26,34,31,0.42)', 'transparent'],
};

type ThemeContextValue = {
  mode: ThemeMode;
  isDark: boolean;
  colors: HomePalette;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredMode(): ThemeMode {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    const value = storage?.getItem(STORAGE_KEY);
    if (value === 'light' || value === 'dark') {
      return value;
    }
  } catch {
    // Ignore storage access errors (native, private mode).
  }
  return 'light';
}

function persistMode(mode: ThemeMode) {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    storage?.setItem(STORAGE_KEY, mode);
  } catch {
    // Ignore storage write errors.
  }
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);

  const value = useMemo<ThemeContextValue>(() => {
    function setMode(next: ThemeMode) {
      setModeState(next);
      persistMode(next);
    }

    return {
      mode,
      isDark: mode === 'dark',
      colors: mode === 'dark' ? darkPalette : lightPalette,
      setMode,
      toggleTheme: () => setMode(mode === 'dark' ? 'light' : 'dark'),
    };
  }, [mode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useAppTheme must be used within AppThemeProvider');
  }
  return context;
}
