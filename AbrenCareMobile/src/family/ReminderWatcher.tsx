import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';

import { appointmentDate, useAppointments } from './AppointmentsContext';
import { formatDateKey } from './format';
import { useLanguage } from '@/i18n/LanguageContext';

const CHECK_INTERVAL_MS = 30_000;

/**
 * Fires appointment reminders while the app is open. Device-level push
 * notifications would need expo-notifications and a new native build.
 */
export function ReminderWatcher() {
  const { appointments } = useAppointments();
  const { t } = useLanguage();
  const alreadyFired = useRef(new Set<string>());

  useEffect(() => {
    function check() {
      const now = Date.now();

      appointments.forEach((appointment) => {
        if (
          appointment.reminderMinutes === null ||
          alreadyFired.current.has(appointment.id)
        ) {
          return;
        }

        const startsAt = appointmentDate(appointment).getTime();
        const remindAt = startsAt - appointment.reminderMinutes * 60_000;

        if (now >= remindAt && now < startsAt) {
          alreadyFired.current.add(appointment.id);

          Alert.alert(
            t.familyAppointments.reminderBanner,
            `${t.familyAppointments.types[appointment.type]} · ${formatDateKey(
              appointment.date,
              t,
            )} ${appointment.time} · ${t.familyAppointments.withLabel} ${
              appointment.withName
            }`,
          );
        }
      });
    }

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [appointments, t]);

  return null;
}
