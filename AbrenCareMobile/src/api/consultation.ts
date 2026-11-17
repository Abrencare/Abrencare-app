import { apiRequest } from '@/api/client';
import { isApiConfigured } from '@/api/config';
import { hasSession } from '@/api/session';
import type { Gender } from '@/types/auth';

async function canSend() {
  return isApiConfigured() && (await hasSession());
}

function genderToApi(gender: Gender) {
  return gender === 'preferNot' ? 'prefer_not' : gender;
}

export async function completeConsultationOnboardingRemote(input: {
  dateOfBirth: string;
  gender: Gender;
}) {
  if (!(await canSend())) {
    return null;
  }
  return apiRequest('/api/consultations/onboarding/complete/', {
    method: 'POST',
    body: {
      dateOfBirth: input.dateOfBirth,
      gender: genderToApi(input.gender),
    },
  });
}

export async function fetchConsultationProfile() {
  if (!(await canSend())) {
    return null;
  }
  return apiRequest('/api/consultations/profile/');
}

export async function fetchConsultationDoctors(specialtyId?: string) {
  if (!(await canSend())) {
    return null;
  }
  const query = specialtyId ? `?specialty=${encodeURIComponent(specialtyId)}` : '';
  return apiRequest(`/api/consultations/doctors/${query}`);
}

export async function fetchConsultationSpecialties() {
  if (!(await canSend())) {
    return null;
  }
  return apiRequest('/api/consultations/specialties/');
}

export async function bookConsultation(body: {
  doctor: number | string;
  appointment_date: string;
  appointment_time: string;
  consultation_type: 'video' | 'audio';
  language?: 'en' | 'am';
  reason_for_visit?: string;
}) {
  if (!(await canSend())) {
    return null;
  }
  return apiRequest('/api/consultations/', { method: 'POST', body });
}
