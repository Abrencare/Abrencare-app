import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import type { VisitKind } from '@/data/consultationPricing';
import { addDays, fromDateKey, toDateKey } from '@/context/AppointmentsContext';
import { loadJson, saveJson } from '@/utilities/storage';

const STORAGE_KEY = 'abrencare-consultations';

export type Consultation = {
  id: string;
  doctorId: string;
  /** Calendar day as YYYY-MM-DD so it stays stable across time zones. */
  date: string;
  /** 24h clock as HH:mm. */
  time: string;
  kind: VisitKind;
  paid: boolean;
  completed: boolean;
  reportApproved?: boolean;
  prescriptionIssued?: boolean;
  concern?: string;
};

/** What the booking screen is currently building up. */
export type BookingDraft = {
  doctorId: string | null;
  date: string | null;
  kind: VisitKind;
  concern: string;
};

type ConsultationContextValue = {
  ready: boolean;
  consultations: Consultation[];
  upcoming: Consultation[];
  recent: Consultation[];
  /** Suggested follow-up day, 30 days after the most recent visit. */
  followUpDate: string | null;
  draft: BookingDraft;
  setDraft: (patch: Partial<BookingDraft>) => void;
  book: (
    doctorId: string,
    date: string,
    time: string,
    kind?: VisitKind,
    concern?: string,
  ) => Consultation;
  consultationById: (id: string | null | undefined) => Consultation | null;
  completeVisit: (id: string) => void;
  hasPaidVisit: (doctorId: string) => boolean;
  cancel: (id: string) => void;
  isSlotTaken: (doctorId: string, date: string, time: string) => boolean;
};

const ConsultationContext = createContext<ConsultationContextValue | null>(null);

export function consultationStart(consultation: Consultation) {
  const [hours, minutes] = (consultation.time || '00:00').split(':').map(Number);
  const date = fromDateKey(consultation.date || toDateKey(new Date()));
  date.setHours(hours ?? 0, minutes ?? 0, 0, 0);
  return date;
}

/** A consultation can be joined from 10 minutes before until 30 after. */
export function isJoinable(consultation: Consultation) {
  const start = consultationStart(consultation).getTime();
  const now = Date.now();
  return now >= start - 10 * 60_000 && now <= start + 30 * 60_000;
}

function seedConsultations(): Consultation[] {
  return [];
}

export function ConsultationProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(true);
  const [consultations, setConsultations] =
    useState<Consultation[]>(seedConsultations);
  const [draft, setDraftState] = useState<BookingDraft>(() => ({
    doctorId: null,
    date: toDateKey(new Date()),
    kind: 'video',
    concern: '',
  }));

  // Set once the user edits, so a slow read can never resurrect what they
  // just cancelled.
  const edited = useRef(false);

  useEffect(() => {
    let active = true;

    loadJson<Consultation[]>(STORAGE_KEY)
      .then((stored) => {
        if (!active || edited.current || !Array.isArray(stored)) {
          return;
        }
        setConsultations(
          stored
            .filter(
              (item) =>
                item &&
                typeof item.id === 'string' &&
                typeof item.doctorId === 'string' &&
                typeof item.date === 'string' &&
                typeof item.time === 'string',
            )
            .map((item) => ({
              ...item,
              kind:
                (item.kind as string) === 'message' ||
                (item.kind as string) === 'audio'
                  ? 'message'
                  : 'video',
              paid: item.paid !== false,
            })),
        );
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<ConsultationContextValue>(() => {
    function commit(next: Consultation[]) {
      edited.current = true;
      setConsultations(next);
      saveJson(STORAGE_KEY, next);
    }

    const now = Date.now();
    const isPast = (consultation: Consultation) =>
      consultation.completed || consultationStart(consultation).getTime() < now;

    const upcoming = consultations
      .filter((consultation) => !isPast(consultation))
      .sort(
        (a, b) =>
          consultationStart(a).getTime() - consultationStart(b).getTime(),
      );

    const recent = consultations
      .filter(isPast)
      .sort(
        (a, b) =>
          consultationStart(b).getTime() - consultationStart(a).getTime(),
      );

    const lastVisit = recent[0];

    return {
      ready,
      consultations,
      upcoming,
      recent,
      followUpDate: lastVisit
        ? toDateKey(addDays(consultationStart(lastVisit), 30))
        : null,
      draft,
      setDraft: (patch) => {
        setDraftState((current) => ({ ...current, ...patch }));
      },
      book: (doctorId, date, time, kind = 'video', concern = '') => {
        const created: Consultation = {
          id: `consultation-${Date.now()}`,
          doctorId,
          date,
          time,
          kind,
          paid: true,
          completed: false,
          concern: concern.trim() || undefined,
        };
        commit([...consultations, created]);
        return created;
      },
      consultationById: (id) =>
        consultations.find((consultation) => consultation.id === id) ?? null,
      completeVisit: (id) => {
        commit(
          consultations.map((consultation) =>
            consultation.id === id
              ? { ...consultation, completed: true }
              : consultation,
          ),
        );
      },
      hasPaidVisit: (doctorId) =>
        consultations.some(
          (consultation) =>
            consultation.doctorId === doctorId &&
            consultation.paid &&
            !consultation.completed,
        ),
      cancel: (id) => {
        commit(
          consultations.filter((consultation) => consultation.id !== id),
        );
      },
      isSlotTaken: (doctorId, date, time) =>
        consultations.some(
          (consultation) =>
            consultation.doctorId === doctorId &&
            consultation.date === date &&
            consultation.time === time,
        ),
    };
  }, [consultations, draft, ready]);

  return (
    <ConsultationContext.Provider value={value}>
      {children}
    </ConsultationContext.Provider>
  );
}

export function useConsultations() {
  const context = useContext(ConsultationContext);
  if (!context) {
    throw new Error(
      'useConsultations must be used within ConsultationProvider',
    );
  }
  return context;
}
