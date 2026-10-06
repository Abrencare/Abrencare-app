import { loadJson, saveJson } from '@/utilities/storage';

const STORAGE_KEY = 'abrencare-executive-inquiry';

export type ExecutiveInquiry = {
  name: string;
  email: string;
  phone: string;
  submittedAt: string;
};

export async function loadExecutiveInquiry() {
  const stored = await loadJson<ExecutiveInquiry>(STORAGE_KEY);
  if (
    !stored ||
    typeof stored.name !== 'string' ||
    typeof stored.email !== 'string' ||
    typeof stored.phone !== 'string'
  ) {
    return null;
  }
  return stored;
}

export function saveExecutiveInquiry(
  input: Omit<ExecutiveInquiry, 'submittedAt'>,
) {
  const inquiry: ExecutiveInquiry = {
    name: input.name.trim(),
    email: input.email.trim(),
    phone: input.phone.trim(),
    submittedAt: new Date().toISOString(),
  };
  saveJson(STORAGE_KEY, inquiry);
  return inquiry;
}
