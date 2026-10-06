import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { toDateKey } from '@/context/AppointmentsContext';
import { loadJson, saveJson } from '@/utilities/storage';

const STORAGE_KEY = 'abrencare-visit';
const TICK_MS = 30_000;

export type VisitStatus = 'upcoming' | 'live' | 'complete';

export type Visit = {
  id: string;
  /** Calendar day as YYYY-MM-DD. */
  dateKey: string;
  patientName: string;
  nurseName: string;
  /** ISO timestamps. */
  arrivedAt: string;
  endsAt: string;
  /** Set when the caregiver marks the visit finished. */
  completedAt: string | null;
  bloodPressure: string;
  medicationConfirmed: boolean;
  noteCount: number;
};

type VisitContextValue = {
  visit: Visit;
  status: VisitStatus;
  /** Timestamp shown in the post-visit summary. */
  finishedAt: string;
  /** Called by the caregiver app (today: by VisitWatcher when the slot ends). */
  completeVisit: () => void;
};

const VisitContext = createContext<VisitContextValue | null>(null);

function atTime(day: Date, hours: number, minutes: number) {
  const date = new Date(day);
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

function seedVisit(now: Date): Visit {
  const dateKey = toDateKey(now);

  return {
    id: `visit-${dateKey}`,
    dateKey,
    patientName: 'Ato Tadesse',
    nurseName: 'Nurse Meron Girma',
    arrivedAt: atTime(now, 10, 2),
    endsAt: atTime(now, 10, 48),
    completedAt: null,
    bloodPressure: '128/82',
    medicationConfirmed: true,
    noteCount: 1,
  };
}

export function visitStatus(visit: Visit, now: number): VisitStatus {
  if (visit.completedAt) {
    return 'complete';
  }

  if (now < Date.parse(visit.arrivedAt)) {
    return 'upcoming';
  }

  if (now >= Date.parse(visit.endsAt)) {
    return 'complete';
  }

  return 'live';
}

export function VisitProvider({ children }: { children: ReactNode }) {
  const [visit, setVisit] = useState<Visit>(() => seedVisit(new Date()));
  const [now, setNow] = useState(() => Date.now());
  const edited = useRef(false);

  useEffect(() => {
    let active = true;

    loadJson<Visit>(STORAGE_KEY).then((stored) => {
      if (!active || edited.current || !stored || typeof stored !== 'object') {
        return;
      }

      // A stored visit from an earlier day is history; today gets a fresh one.
      if (stored.dateKey === toDateKey(new Date())) {
        setVisit(stored);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const completeVisit = useCallback(() => {
    setVisit((current) => {
      if (current.completedAt) {
        return current;
      }

      // Never claim the visit finished later than it actually did.
      const ended = Math.min(Date.now(), Date.parse(current.endsAt));
      const next = { ...current, completedAt: new Date(ended).toISOString() };

      edited.current = true;
      saveJson(STORAGE_KEY, next);
      return next;
    });
  }, []);

  const value = useMemo<VisitContextValue>(() => {
    const status = visitStatus(visit, now);

    return {
      visit,
      status,
      finishedAt: visit.completedAt ?? visit.endsAt,
      completeVisit,
    };
  }, [completeVisit, now, visit]);

  return <VisitContext.Provider value={value}>{children}</VisitContext.Provider>;
}

export function useVisit() {
  const context = useContext(VisitContext);

  if (!context) {
    throw new Error('useVisit must be used within a VisitProvider');
  }

  return context;
}
