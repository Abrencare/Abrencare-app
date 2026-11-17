import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { bookConsultation } from '@/api/consultation';
import { parseVisitKind, type VisitKind } from '@/data/consultationPricing';
import { addDays, fromDateKey, toDateKey } from '@/context/AppointmentsContext';
import { loadJson, saveJson } from '@/utilities/storage';

const STORAGE_KEY = 'abrencare-consultations';

export type PrescriptionItem = {
  id: string;
  name: string;
  dosage: string;
  instructions: string;
  duration: string;
  refills?: number;
  pharmacyNote?: string;
};

export type ClinicalSummary = {
  reason: string;
  doctorPlan: string;
  assessment?: string;
  durationMinutes?: number;
  signedAt?: string;
  followUpRecommended?: boolean;
};

export type BookOptions = {
  doctorId: string;
  date: string;
  time: string;
  kind?: VisitKind;
  concern?: string;
  immediate?: boolean;
};

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
  prescriptions?: PrescriptionItem[];
  clinicalSummary?: ClinicalSummary;
  concern?: string;
  immediate?: boolean;
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
    doctorIdOrOptions: string | BookOptions,
    date?: string,
    time?: string,
    kind?: VisitKind,
    concern?: string,
  ) => Consultation;
  consultationById: (id: string | null | undefined) => Consultation | null;
  completeVisit: (
    id: string,
    options?: {
      reportApproved?: boolean;
      prescriptionIssued?: boolean;
      prescriptions?: PrescriptionItem[];
      clinicalSummary?: Partial<ClinicalSummary>;
    },
  ) => void;
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

/**
 * Demo join rule: any paid visit that is not finished can be joined.
 * (Production would keep a start-time window.)
 */
export function isJoinable(consultation: Consultation) {
  return Boolean(consultation.paid && !consultation.completed);
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
                (item.kind as string) === 'audio' ||
                (item.kind as string) === 'message'
                  ? 'audio'
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
      book: (doctorIdOrOptions, maybeDate, maybeTime, maybeKind = 'video', maybeConcern = '') => {
        let doctorId = '';
        let date = '';
        let time = '';
        let kind: VisitKind = 'video';
        let concern = '';
        let immediate = false;

        if (typeof doctorIdOrOptions === 'object' && doctorIdOrOptions !== null) {
          doctorId = doctorIdOrOptions.doctorId;
          date = doctorIdOrOptions.date;
          time = doctorIdOrOptions.time;
          kind = parseVisitKind(doctorIdOrOptions.kind || 'video');
          concern = doctorIdOrOptions.concern || '';
          immediate = Boolean(doctorIdOrOptions.immediate);
        } else {
          doctorId = doctorIdOrOptions;
          date = maybeDate || toDateKey(new Date());
          time = maybeTime || '10:00';
          kind = parseVisitKind(maybeKind);
          concern = maybeConcern;
        }

        const created: Consultation = {
          id: `consultation-${Date.now()}`,
          doctorId,
          date,
          time,
          kind,
          paid: true,
          completed: false,
          immediate,
          concern: concern.trim() || undefined,
        };
        commit([...consultations, created]);
        // Backend doctor ids are integers. Local demo doctors keep string ids
        // and stay offline until the catalog is loaded from the API.
        if (/^[1-9]\d*$/.test(doctorId)) {
          void bookConsultation({
            doctor: Number(doctorId),
            appointment_date: date,
            appointment_time: time,
            consultation_type: kind === 'audio' ? 'audio' : 'video',
            language: 'en',
            reason_for_visit: concern.trim() || undefined,
          }).catch(() => undefined);
        }
        return created;
      },
      consultationById: (id) =>
        consultations.find((consultation) => consultation.id === id) ?? null,
      completeVisit: (id, options) => {
        commit(
          consultations.map((consultation) => {
            if (consultation.id !== id) {
              return consultation;
            }
            const defaultPrescriptions: PrescriptionItem[] = [
              {
                id: 'rx-1',
                name: 'Amoxicillin 500mg',
                dosage: '1 capsule three times daily',
                instructions: 'Take with food and full glass of water. Complete full course.',
                duration: '7 days',
                refills: 0,
                pharmacyNote: 'Quality certified generic or brand equivalent',
              },
              {
                id: 'rx-2',
                name: 'Paracetamol 500mg',
                dosage: '1-2 tablets every 6 hours',
                instructions: 'As needed for fever or mild pain. Maximum 4g daily.',
                duration: '5 days',
                refills: 1,
                pharmacyNote: 'Over-the-counter or pharmacy fulfillment',
              },
            ];

            const signedDateStr = new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return {
              ...consultation,
              completed: true,
              reportApproved: options?.reportApproved ?? true,
              prescriptionIssued: options?.prescriptionIssued ?? true,
              prescriptions:
                options?.prescriptions ??
                (options?.prescriptionIssued === false ? [] : defaultPrescriptions),
              clinicalSummary: {
                reason:
                  options?.clinicalSummary?.reason ||
                  consultation.concern ||
                  'Follow-up discussion and clinical review',
                doctorPlan:
                  options?.clinicalSummary?.doctorPlan ||
                  'Review the signed clinical note for assessment, advice and any recommended follow-up.',
                assessment:
                  options?.clinicalSummary?.assessment ||
                  'Patient evaluated. Clinical recommendations provided. Medication prescribed as indicated.',
                durationMinutes:
                  options?.clinicalSummary?.durationMinutes || 30,
                signedAt: options?.clinicalSummary?.signedAt || signedDateStr,
                followUpRecommended: options?.clinicalSummary?.followUpRecommended ?? true,
              },
            };
          }),
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
