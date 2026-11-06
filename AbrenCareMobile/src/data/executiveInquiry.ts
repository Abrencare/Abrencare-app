import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CountryId } from '@/data/countries';
import { loadJson } from '@/utilities/storage';

const STORAGE_KEY = 'abrencare-executive-inquiries';

export type ExecutiveCityId =
  | 'addis'
  | 'direDawa'
  | 'hawassa'
  | 'bahirDar'
  | 'mekelle'
  | 'gondar'
  | 'other';

export type ExecutiveSupportId =
  | 'monitoring'
  | 'labs'
  | 'cardiac'
  | 'physician'
  | 'unsure';

export type ExecutiveContactId = 'whatsapp' | 'call' | 'email';
export type ExecutiveReachDay = 'weekdays' | 'weekends' | 'anytime';
export type ExecutiveReachSlot = 'morning' | 'midday' | 'afternoon' | 'evening';
export type ExecutiveLocationPref = 'home' | 'office';
export type ExecutiveConcernId =
  | 'bloodPressure'
  | 'diabetes'
  | 'heart'
  | 'mobility'
  | 'memory'
  | 'checkup'
  | 'other';

export const EXECUTIVE_CONCERNS: ExecutiveConcernId[] = [
  'bloodPressure',
  'diabetes',
  'heart',
  'mobility',
  'memory',
  'checkup',
  'other',
];

export function supportFromConcerns(concerns: ExecutiveConcernId[]): ExecutiveSupportId {
  if (concerns.includes('heart')) {
    return 'cardiac';
  }
  if (concerns.includes('bloodPressure')) {
    return 'monitoring';
  }
  if (concerns.includes('diabetes')) {
    return 'labs';
  }
  if (concerns.includes('checkup')) {
    return 'physician';
  }
  return 'unsure';
}

const DRAFT_KEY = 'abrencare-executive-request-draft';

export type ExecutiveRequestDraft = {
  name: string;
  phone: string;
  email: string;
  country: CountryId;
  contact: ExecutiveContactId;
  reachDay: ExecutiveReachDay;
  reachSlot: ExecutiveReachSlot;
  locationPref: ExecutiveLocationPref;
  concerns: ExecutiveConcernId[];
  note: string;
};

export type ExecutiveJourneyStatus =
  | 'received'
  | 'contacted'
  | 'proposed'
  | 'accepted'
  | 'setup'
  | 'active';

export type ExecutiveProposal = {
  recipient: string;
  services: string;
  visitFrequency: string;
  planDuration: string;
  quoteAmount: string;
  quoteCurrency: string;
  billingPeriod: string;
  exclusions: string;
  paymentTerms: string;
  cancellationTerms: string;
  sharedAt: string;
};

export type ExecutiveInquiry = {
  id: string;
  name: string;
  phone: string;
  email: string;
  country: CountryId;
  city: ExecutiveCityId;
  support: ExecutiveSupportId;
  contact: ExecutiveContactId;
  note?: string;
  concerns?: ExecutiveConcernId[];
  reachDay?: ExecutiveReachDay;
  reachSlot?: ExecutiveReachSlot;
  locationPref?: ExecutiveLocationPref;
  submittedAt: string;
  status: ExecutiveJourneyStatus;
  contactedAt?: string;
  proposedAt?: string;
  acceptedAt?: string;
  setupAt?: string;
  activatedAt?: string;
  proposal?: ExecutiveProposal;
};

const STATUS_ORDER: ExecutiveJourneyStatus[] = [
  'received',
  'contacted',
  'proposed',
  'accepted',
  'setup',
  'active',
];

function isProposal(value: unknown): value is ExecutiveProposal {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Partial<ExecutiveProposal>;
  return (
    typeof item.recipient === 'string' &&
    typeof item.services === 'string' &&
    typeof item.visitFrequency === 'string' &&
    typeof item.planDuration === 'string' &&
    typeof item.quoteAmount === 'string' &&
    typeof item.quoteCurrency === 'string' &&
    typeof item.billingPeriod === 'string' &&
    typeof item.exclusions === 'string' &&
    typeof item.paymentTerms === 'string' &&
    typeof item.cancellationTerms === 'string' &&
    typeof item.sharedAt === 'string'
  );
}

function isInquiry(value: unknown): value is ExecutiveInquiry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Partial<ExecutiveInquiry>;
  return (
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.phone === 'string' &&
    typeof item.country === 'string' &&
    typeof item.city === 'string' &&
    typeof item.support === 'string' &&
    typeof item.contact === 'string' &&
    typeof item.submittedAt === 'string'
  );
}

function normalizeInquiry(item: ExecutiveInquiry): ExecutiveInquiry {
  const status = STATUS_ORDER.includes(item.status) ? item.status : 'received';
  return {
    ...item,
    email: item.email ?? '',
    note: item.note ?? '',
    concerns: Array.isArray(item.concerns)
      ? item.concerns.filter((id): id is ExecutiveConcernId => EXECUTIVE_CONCERNS.includes(id as ExecutiveConcernId))
      : [],
    reachDay: item.reachDay ?? 'weekdays',
    reachSlot: item.reachSlot ?? 'morning',
    locationPref: item.locationPref ?? 'home',
    status,
    proposal: item.proposal && isProposal(item.proposal) ? item.proposal : undefined,
  };
}

async function writeInquiries(list: ExecutiveInquiry[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function loadExecutiveInquiries() {
  const stored = await loadJson<ExecutiveInquiry[]>(STORAGE_KEY);
  if (!Array.isArray(stored)) {
    return [];
  }
  return stored.filter(isInquiry).map(normalizeInquiry);
}

export async function loadExecutiveInquiry() {
  const list = await loadExecutiveInquiries();
  return list[list.length - 1] ?? null;
}

export async function loadExecutiveInquiryById(id: string) {
  const list = await loadExecutiveInquiries();
  return list.find((item) => item.id === id) ?? null;
}

export async function saveExecutiveInquiry(
  input: Omit<ExecutiveInquiry, 'id' | 'submittedAt' | 'status'>,
) {
  const inquiry: ExecutiveInquiry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    country: input.country,
    city: input.city,
    support: input.support,
    contact: input.contact,
    note: input.note?.trim() ?? '',
    concerns: input.concerns ?? [],
    reachDay: input.reachDay ?? 'weekdays',
    reachSlot: input.reachSlot ?? 'morning',
    locationPref: input.locationPref ?? 'home',
    submittedAt: new Date().toISOString(),
    status: 'received',
  };
  const current = await loadExecutiveInquiries();
  await writeInquiries([...current, inquiry]);
  return inquiry;
}

async function patchInquiry(
  id: string,
  update: (item: ExecutiveInquiry) => ExecutiveInquiry | null,
) {
  const list = await loadExecutiveInquiries();
  let next: ExecutiveInquiry | null = null;
  const written = list.map((item) => {
    if (item.id !== id) {
      return item;
    }
    const patched = update(item);
    next = patched ?? item;
    return next;
  });
  await writeInquiries(written);
  return next;
}

export async function markExecutiveContacted(id: string) {
  return patchInquiry(id, (item) => {
    if (item.status !== 'received') {
      return item;
    }
    return {
      ...item,
      status: 'contacted',
      contactedAt: new Date().toISOString(),
    };
  });
}

export async function shareExecutiveProposal(
  id: string,
  input: Omit<ExecutiveProposal, 'sharedAt'>,
) {
  return patchInquiry(id, (item) => {
    if (item.status !== 'contacted' && item.status !== 'proposed') {
      return item;
    }
    const now = new Date().toISOString();
    return {
      ...item,
      status: 'proposed',
      proposedAt: item.proposedAt ?? now,
      proposal: {
        recipient: input.recipient.trim(),
        services: input.services.trim(),
        visitFrequency: input.visitFrequency.trim(),
        planDuration: input.planDuration.trim(),
        quoteAmount: input.quoteAmount.trim(),
        quoteCurrency: input.quoteCurrency.trim(),
        billingPeriod: input.billingPeriod.trim(),
        exclusions: input.exclusions.trim(),
        paymentTerms: input.paymentTerms.trim(),
        cancellationTerms: input.cancellationTerms.trim(),
        sharedAt: now,
      },
    };
  });
}

export async function acceptExecutiveProposal(id: string) {
  return patchInquiry(id, (item) => {
    if (item.status !== 'proposed' || !item.proposal) {
      return item;
    }
    return {
      ...item,
      status: 'accepted',
      acceptedAt: new Date().toISOString(),
    };
  });
}

export async function markExecutiveSetupStarted(id?: string) {
  const inquiry = id ? await loadExecutiveInquiryById(id) : await loadExecutiveInquiry();
  if (!inquiry || inquiry.status !== 'accepted') {
    return inquiry;
  }
  return patchInquiry(inquiry.id, (item) => ({
    ...item,
    status: 'setup',
    setupAt: new Date().toISOString(),
  }));
}

export async function activateExecutiveCare(id?: string) {
  const inquiry = id ? await loadExecutiveInquiryById(id) : await loadExecutiveInquiry();
  if (!inquiry || (inquiry.status !== 'setup' && inquiry.status !== 'accepted')) {
    return inquiry;
  }
  return patchInquiry(inquiry.id, (item) => ({
    ...item,
    status: 'active',
    setupAt: item.setupAt ?? new Date().toISOString(),
    activatedAt: new Date().toISOString(),
  }));
}

export function emptyExecutiveDraft(country: CountryId): ExecutiveRequestDraft {
  return {
    name: '',
    phone: '',
    email: '',
    country,
    contact: 'call',
    reachDay: 'weekdays',
    reachSlot: 'morning',
    locationPref: 'home',
    concerns: [],
    note: '',
  };
}

function isDraft(value: unknown): value is ExecutiveRequestDraft {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Partial<ExecutiveRequestDraft>;
  return (
    typeof item.name === 'string' &&
    typeof item.phone === 'string' &&
    typeof item.email === 'string' &&
    typeof item.country === 'string' &&
    typeof item.contact === 'string' &&
    typeof item.reachDay === 'string' &&
    typeof item.reachSlot === 'string' &&
    typeof item.locationPref === 'string'
  );
}

function normalizeDraft(item: ExecutiveRequestDraft): ExecutiveRequestDraft {
  return {
    ...item,
    concerns: Array.isArray(item.concerns)
      ? item.concerns.filter((id): id is ExecutiveConcernId => EXECUTIVE_CONCERNS.includes(id as ExecutiveConcernId))
      : [],
    note: typeof item.note === 'string' ? item.note : '',
  };
}

export async function loadExecutiveRequestDraft() {
  const stored = await loadJson<ExecutiveRequestDraft>(DRAFT_KEY);
  return isDraft(stored) ? normalizeDraft(stored) : null;
}

export async function saveExecutiveRequestDraft(draft: ExecutiveRequestDraft) {
  await AsyncStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export async function clearExecutiveRequestDraft() {
  await AsyncStorage.removeItem(DRAFT_KEY);
}
