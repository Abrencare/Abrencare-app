import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ExecutiveAlertId = 'bp' | 'lab' | 'medication' | 'checkup';

const INITIAL_UNREAD: ExecutiveAlertId[] = ['bp', 'lab'];

type ExecutiveAlertsValue = {
  unreadCount: number;
  isUnread: (id: ExecutiveAlertId) => boolean;
  markRead: (id: ExecutiveAlertId) => void;
  markAllRead: () => void;
};

const ExecutiveAlertsContext = createContext<ExecutiveAlertsValue | null>(null);

export function ExecutiveAlertsProvider({ children }: { children: ReactNode }) {
  const [unread, setUnread] = useState<ExecutiveAlertId[]>(INITIAL_UNREAD);

  const markRead = useCallback((id: ExecutiveAlertId) => {
    setUnread((current) => current.filter((item) => item !== id));
  }, []);

  const markAllRead = useCallback(() => setUnread([]), []);

  const value = useMemo<ExecutiveAlertsValue>(
    () => ({
      unreadCount: unread.length,
      isUnread: (id) => unread.includes(id),
      markRead,
      markAllRead,
    }),
    [markAllRead, markRead, unread],
  );

  return (
    <ExecutiveAlertsContext.Provider value={value}>
      {children}
    </ExecutiveAlertsContext.Provider>
  );
}

export function useExecutiveAlerts() {
  const context = useContext(ExecutiveAlertsContext);

  if (!context) {
    throw new Error(
      'useExecutiveAlerts must be used inside an ExecutiveAlertsProvider',
    );
  }

  return context;
}
