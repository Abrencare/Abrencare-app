import { apiRequest } from '@/api/client';
import { isApiConfigured } from '@/api/config';
import { hasSession } from '@/api/session';
import type { Gender, MonitorFrequency, MonitorMetric } from '@/types/auth';

async function canSend() {
  return isApiConfigured() && (await hasSession());
}

function genderToApi(gender: Gender) {
  return gender === 'preferNot' ? 'prefer_not' : gender;
}

export async function saveExecutiveProfileRemote(input: {
  dateOfBirth: string;
  gender: Gender;
  heightCm: string;
  weightKg: string;
}) {
  if (!(await canSend())) {
    return null;
  }
  return apiRequest('/api/executive/profile/', {
    method: 'POST',
    body: {
      dateOfBirth: input.dateOfBirth,
      gender: genderToApi(input.gender),
      heightCm: input.heightCm,
      weightKg: input.weightKg,
    },
  });
}

export async function saveExecutiveCareRemote(input: {
  monitoring: MonitorMetric[];
  frequency: MonitorFrequency;
}) {
  if (!(await canSend())) {
    return null;
  }
  return apiRequest('/api/executive/care/', {
    method: 'POST',
    body: {
      monitoring: input.monitoring,
      frequency: input.frequency,
    },
  });
}

export async function completeExecutiveOnboardingRemote(input?: {
  dateOfBirth?: string;
  gender?: Gender;
  heightCm?: string;
  weightKg?: string;
  monitoring?: MonitorMetric[];
  frequency?: MonitorFrequency;
}) {
  if (!(await canSend())) {
    return null;
  }
  const body: Record<string, unknown> = {};
  if (input?.dateOfBirth) {
    body.dateOfBirth = input.dateOfBirth;
  }
  if (input?.gender) {
    body.gender = genderToApi(input.gender);
  }
  if (input?.heightCm) {
    body.heightCm = input.heightCm;
  }
  if (input?.weightKg) {
    body.weightKg = input.weightKg;
  }
  if (input?.monitoring) {
    body.monitoring = input.monitoring;
  }
  if (input?.frequency) {
    body.frequency = input.frequency;
  }
  return apiRequest('/api/executive/onboarding/complete/', {
    method: 'POST',
    body,
  });
}

export async function fetchExecutiveMe() {
  if (!(await canSend())) {
    return null;
  }
  return apiRequest('/api/executive/me/');
}
