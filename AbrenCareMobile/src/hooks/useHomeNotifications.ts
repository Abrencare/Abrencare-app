import { useCallback, useEffect, useState } from 'react';

import type { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router/build/useFocusEffect';

import { useAppointments } from '@/context/AppointmentsContext';
import { useAuth } from '@/context/AuthContext';
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { useVisit } from '@/context/VisitContext';
import { doctorById, to12Hour } from '@/data/doctors';
import { loadExecutiveInquiry, type ExecutiveInquiry } from '@/data/executiveInquiry';
import { loadFamilyInquiry, type FamilyInquiry } from '@/data/familyInquiry';
import { activeFamilyMember } from '@/utilities/familyMember';
import { formatClock, formatDateKey } from '@/utilities/familyFormat';

export type HomeNotice = {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  body: string;
  href: string;
};

function familyNotice(inquiry: FamilyInquiry, t: ReturnType<typeof useLanguage>['t']): HomeNotice | null {
  if (inquiry.status === 'proposed') {
    return {
      id: 'family-care-accepted',
      icon: 'checkmark-circle-outline',
      color: '#1A3A32',
      title: t.header.careAccepted,
      body: t.header.careAcceptedFamily,
      href: '/family-care-plan',
    };
  }
  if (inquiry.status === 'accepted' || inquiry.status === 'setup') {
    return {
      id: 'family-plan-approved',
      icon: 'checkmark-circle-outline',
      color: '#1A3A32',
      title: t.header.careAccepted,
      body: t.header.planApprovedFamily,
      href: '/signup?service=family',
    };
  }
  return null;
}

function executiveNotice(
  inquiry: ExecutiveInquiry,
  t: ReturnType<typeof useLanguage>['t'],
): HomeNotice | null {
  if (inquiry.status === 'proposed') {
    return {
      id: 'executive-care-accepted',
      icon: 'checkmark-circle-outline',
      color: '#C4A05A',
      title: t.header.careAccepted,
      body: t.header.careAcceptedExecutive,
      href: '/executive-care-plan',
    };
  }
  if (inquiry.status === 'accepted' || inquiry.status === 'setup') {
    return {
      id: 'executive-plan-approved',
      icon: 'checkmark-circle-outline',
      color: '#C4A05A',
      title: t.header.careAccepted,
      body: t.header.planApprovedExecutive,
      href: '/open-care?service=executive',
    };
  }
  return null;
}

/** Alerts for signed-in care and for requests that are still waiting. */
export function useHomeNotifications(): HomeNotice[] {
  const { t } = useLanguage();
  const { user, hasService } = useAuth();
  const { nextAppointment } = useAppointments();
  const { visit, status, finishedAt } = useVisit();
  const { upcoming } = useConsultations();
  const [familyInquiry, setFamilyInquiry] = useState<FamilyInquiry | null>(null);
  const [executiveInquiry, setExecutiveInquiry] = useState<ExecutiveInquiry | null>(null);

  const refresh = useCallback(() => {
    loadFamilyInquiry().then(setFamilyInquiry);
    loadExecutiveInquiry().then(setExecutiveInquiry);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  const notices: HomeNotice[] = [];

  if (familyInquiry && !hasService('family')) {
    const notice = familyNotice(familyInquiry, t);
    if (notice) {
      notices.push(notice);
    }
  }

  if (executiveInquiry && !hasService('executive')) {
    const notice = executiveNotice(executiveInquiry, t);
    if (notice) {
      notices.push(notice);
    }
  }

  if (hasService('family')) {
    const patient = activeFamilyMember(user)?.name ?? visit.patientName;

    if (status === 'live') {
      notices.push({
        id: 'family-live',
        icon: 'pulse-outline',
        color: '#8B9A7C',
        title: t.family.visitInProgress,
        body: t.family.visitSubtitle,
        href: user?.activeFamilyMemberId ? '/family' : '/family-home',
      });
    } else if (status === 'complete') {
      notices.push({
        id: 'family-done',
        icon: 'checkmark-circle-outline',
        color: '#8B9A7C',
        title: t.family.visitDoneTitle.replace('{time}', formatClock(finishedAt, t)),
        body: t.family.visitDoneBody.replace('{nurse}', visit.nurseName),
        href: user?.activeFamilyMemberId ? '/family/reports' : '/family-home',
      });
    } else if (nextAppointment) {
      notices.push({
        id: 'family-visit',
        icon: 'calendar-outline',
        color: '#C4A05A',
        title: t.header.appointmentTitle,
        body: `${patient} · ${formatDateKey(nextAppointment.date, t)} · ${to12Hour(nextAppointment.time)}`,
        href: user?.activeFamilyMemberId ? '/family/appointments' : '/family-home',
      });
    } else {
      notices.push({
        id: 'family-care',
        icon: 'heart-outline',
        color: '#8B9A7C',
        title: t.header.careTitle,
        body: t.header.careBody,
        href: '/family-home',
      });
    }
  }

  if (hasService('executive')) {
    notices.push({
      id: 'executive-bp',
      icon: 'warning-outline',
      color: '#C45B4A',
      title: t.executiveAlerts.bpTitle,
      body: t.executiveAlerts.bpBody,
      href: '/executive/alerts',
    });
    notices.push({
      id: 'executive-lab',
      icon: 'document-text-outline',
      color: '#C4A05A',
      title: t.executiveAlerts.labTitle,
      body: t.executiveAlerts.labBody,
      href: '/executive/reports',
    });
  }

  if (hasService('consultation')) {
    const next = upcoming[0];
    const doctor = next ? doctorById(next.doctorId) : null;

    if (next && doctor) {
      notices.push({
        id: 'consultation-booked',
        icon: 'videocam-outline',
        color: '#7E93A8',
        title: t.consultation.bookedTitle,
        body: `${doctor.name} · ${formatDateKey(next.date, t)} · ${to12Hour(next.time)}`,
        href: '/consultation/mycare',
      });
    } else {
      notices.push({
        id: 'consultation-now',
        icon: 'chatbubbles-outline',
        color: '#7E93A8',
        title: t.consultationChat.sectionLabel,
        body: t.consultationChat.sectionHint,
        href: '/consultation',
      });
    }
  }

  return notices;
}
