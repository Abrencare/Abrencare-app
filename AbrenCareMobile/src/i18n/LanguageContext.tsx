import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { translations, type Language } from './translations';

const STORAGE_KEY = 'abrencare-language';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (typeof translations)[Language];
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function readStoredLanguage(): Language {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    const value = storage?.getItem(STORAGE_KEY);
    if (value === 'en' || value === 'am') {
      return value;
    }
  } catch {
    // Ignore storage access errors (native, private mode).
  }
  return 'en';
}

function persistLanguage(language: Language) {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    storage?.setItem(STORAGE_KEY, language);
  } catch {
    // Ignore storage write errors.
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(readStoredLanguage);

  const value = useMemo<LanguageContextValue>(() => {
    function setLanguage(next: Language) {
      setLanguageState(next);
      persistLanguage(next);
    }

    return {
      language,
      setLanguage,
      t: translations[language],
    };
  }, [language]);

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
}
