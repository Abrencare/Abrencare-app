import AsyncStorage from '@react-native-async-storage/async-storage';

import type { CountryId } from '@/data/countries';
import { loadJson } from '@/utilities/storage';

const STORAGE_KEY = 'abrencare-family-inquiries';

export type FamilyCityId =
  | 'addis'
  | 'direDawa'
  | 'hawassa'
  | 'bahirDar'
  | 'mekelle'
  | 'gondar'
  | 'other';

export type FamilySupportId =
  | 'checkins'
  | 'nursing'
  | 'afterVisit'
  | 'medication'
  | 'unsure';

export type FamilyContactId = 'whatsapp' | 'call' | 'email';

export type FamilyJourneyStatus =
  | 'received'
  | 'contacted'
  | 'proposed'
  | 'accepted'
  | 'setup'
  | 'active';

export type FamilyProposal = {
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

export type FamilyInquiry = {
  id: string;
  name: string;
  phone: string;
  email: string;
  country: CountryId;
  city: FamilyCityId;
  support: FamilySupportId;
  contact: FamilyContactId;
  submittedAt: string;
  status: FamilyJourneyStatus;
  contactedAt?: string;
  proposedAt?: string;
  acceptedAt?: string;
  setupAt?: string;
  activatedAt?: string;
  proposal?: FamilyProposal;
};

const STATUS_ORDER: FamilyJourneyStatus[] = [
  'received',
  'contacted',
  'proposed',
  'accepted',
  'setup',
  'active',
];

export function journeyStageIndex(status: FamilyJourneyStatus) {
  if (status === 'accepted' || status === 'setup') {
    return 3;
  }
  if (status === 'active') {
    return 4;
  }
  return STATUS_ORDER.indexOf(status);
}

function isProposal(value: unknown): value is FamilyProposal {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Partial<FamilyProposal>;
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

function isInquiry(value: unknown): value is FamilyInquiry {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const item = value as Partial<FamilyInquiry>;
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

function normalizeInquiry(item: FamilyInquiry): FamilyInquiry {
  const status = STATUS_ORDER.includes(item.status) ? item.status : 'received';
  return {
    ...item,
    email: item.email ?? '',
    status,
    proposal: item.proposal && isProposal(item.proposal) ? item.proposal : undefined,
  };
}

async function writeInquiries(list: FamilyInquiry[]) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export async function loadFamilyInquiries() {
  const stored = await loadJson<FamilyInquiry[]>(STORAGE_KEY);
  if (!Array.isArray(stored)) {
    return [];
  }
  return stored.filter(isInquiry).map(normalizeInquiry);
}

export async function loadFamilyInquiry() {
  const list = await loadFamilyInquiries();
  return list[list.length - 1] ?? null;
}

export async function loadFamilyInquiryById(id: string) {
  const list = await loadFamilyInquiries();
  return list.find((item) => item.id === id) ?? null;
}

export async function saveFamilyInquiry(
  input: Omit<FamilyInquiry, 'id' | 'submittedAt' | 'status'>,
) {
  const inquiry: FamilyInquiry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: input.name.trim(),
    phone: input.phone.trim(),
    email: input.email.trim(),
    country: input.country,
    city: input.city,
    support: input.support,
    contact: input.contact,
    submittedAt: new Date().toISOString(),
    status: 'received',
  };
  const current = await loadFamilyInquiries();
  await writeInquiries([...current, inquiry]);
  return inquiry;
}

async function patchInquiry(
  id: string,
  update: (item: FamilyInquiry) => FamilyInquiry | null,
) {
  const list = await loadFamilyInquiries();
  let next: FamilyInquiry | null = null;
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

export async function markFamilyContacted(id: string) {
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

export async function shareFamilyProposal(
  id: string,
  input: Omit<FamilyProposal, 'sharedAt'>,
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

export async function acceptFamilyProposal(id: string) {
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

export async function markFamilySetupStarted(id?: string) {
  const inquiry = id ? await loadFamilyInquiryById(id) : await loadFamilyInquiry();
  if (!inquiry || inquiry.status !== 'accepted') {
    return inquiry;
  }
  return patchInquiry(inquiry.id, (item) => ({
    ...item,
    status: 'setup',
    setupAt: new Date().toISOString(),
  }));
}

export async function activateFamilyCare(id?: string) {
  const inquiry = id ? await loadFamilyInquiryById(id) : await loadFamilyInquiry();
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
