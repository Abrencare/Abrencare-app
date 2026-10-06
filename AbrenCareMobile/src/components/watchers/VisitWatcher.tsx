import { useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useVisit } from '@/context/VisitContext';
import {
  addNotificationTapListener,
  requestNotificationPermission,
  sendVisitNotification,
} from '@/notifications/visitNotifications';
import { formatClock } from '@/utilities/familyFormat';

/** Past this, a completed visit is history and must not re-notify. */
const FRESH_MS = 10 * 60_000;

const REPORT_ROUTE = '/family/reports';

/**
 * Sends the post-visit notification the moment a visit is marked complete, and
 * opens the report when the family taps it.
 *
 * The caregiver app will call `completeVisit` over the API; until then the
 * visit closes itself when its slot ends.
 */
export function VisitWatcher() {
  const { visit, status, finishedAt, completeVisit } = useVisit();
  const { user } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const handled = useRef(new Set<string>());

  useEffect(
    () =>
      addNotificationTapListener((url) =>
        router.push(url as Parameters<typeof router.push>[0]),
      ),
    [router],
  );

  // Ask once the family is signed in, so the prompt has context.
  useEffect(() => {
    if (user) {
      void requestNotificationPermission();
    }
  }, [user]);

  useEffect(() => {
    if (status !== 'complete' || handled.current.has(visit.id)) {
      return;
    }

    if (!visit.completedAt) {
      completeVisit();
      return;
    }

    handled.current.add(visit.id);

    if (Date.now() - Date.parse(visit.completedAt) > FRESH_MS) {
      return;
    }

    const copy = t.family;
    const patient = user?.familyMembers[0]?.name ?? visit.patientName;

    sendVisitNotification({
      title: copy.pushVisitTitle
        .replace('{patient}', patient)
        .replace('{time}', formatClock(finishedAt, t)),
      body: copy.pushVisitBody
        .replace('{bp}', visit.bloodPressure)
        .replace('{nurse}', visit.nurseName),
      url: REPORT_ROUTE,
    });
  }, [completeVisit, finishedAt, status, t, user, visit]);

  return null;
}
