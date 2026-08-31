import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'abrencare-account';

export type AuthUser = {
  name: string;
  email: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isSignedIn: boolean;
  signIn: (email: string) => AuthUser;
  signUp: (name: string, email: string) => AuthUser;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): AuthUser | null {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    const raw = storage?.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<AuthUser>;
    if (typeof parsed.email === 'string' && typeof parsed.name === 'string') {
      return { name: parsed.name, email: parsed.email };
    }
  } catch {
    // Ignore storage access errors (native, private mode).
  }
  return null;
}

function persistUser(user: AuthUser | null) {
  try {
    const storage = (globalThis as { localStorage?: Storage }).localStorage;
    if (user) {
      storage?.setItem(STORAGE_KEY, JSON.stringify(user));
    } else {
      storage?.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore storage write errors.
  }
}

function nameFromEmail(email: string) {
  const handle = email.split('@')[0] ?? '';

  const readable = handle
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

  return readable || 'AbrenCare member';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(readStoredUser);

  const value = useMemo<AuthContextValue>(() => {
    function commit(next: AuthUser) {
      setUser(next);
      persistUser(next);
      return next;
    }

    return {
      user,
      isSignedIn: user !== null,
      signIn: (email: string) =>
        commit({ name: nameFromEmail(email), email: email.trim() }),
      signUp: (name: string, email: string) =>
        commit({
          name: name.trim() || nameFromEmail(email),
          email: email.trim(),
        }),
      signOut: () => {
        setUser(null);
        persistUser(null);
      },
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export function initialsFor(user: AuthUser | null) {
  if (!user) {
    return 'AC';
  }

  return user.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}
