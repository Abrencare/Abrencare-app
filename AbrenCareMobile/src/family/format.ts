import type { Ionicons } from '@expo/vector-icons';

import { addDays, fromDateKey, toDateKey } from './AppointmentsContext';
import type { AppointmentType } from './AppointmentsContext';
import type { en } from '@/i18n/translations';

type Copy = typeof en;

export const APPOINTMENT_TYPES: AppointmentType[] = [
  'homeVisit',
  'nurseCheck',
  'doctorVisit',
  'labSample',
];

export const TIME_SLOTS = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'];

export const REMINDER_OPTIONS: (number | null)[] = [null, 15, 60, 1440];

export const typeIcons: Record<AppointmentType, keyof typeof Ionicons.glyphMap> = {
  homeVisit: 'home-outline',
  nurseCheck: 'pulse-outline',
  doctorVisit: 'videocam-outline',
  labSample: 'flask-outline',
};

/** "Today", "Tomorrow" or "Thu, 3 September" in the active language. */
export function formatDateKey(dateKey: string, t: Copy) {
  const today = new Date();

  if (dateKey === toDateKey(today)) {
    return t.calendar.today;
  }
  if (dateKey === toDateKey(addDays(today, 1))) {
    return t.calendar.tomorrow;
  }

  const date = fromDateKey(dateKey);
  return `${t.calendar.weekdaysShort[date.getDay()]}, ${date.getDate()} ${
    t.calendar.months[date.getMonth()]
  }`;
}

export function reminderLabel(minutes: number | null, t: Copy) {
  switch (minutes) {
    case 15:
      return t.familyAppointments.remind15;
    case 60:
      return t.familyAppointments.remind60;
    case 1440:
      return t.familyAppointments.remind1440;
    default:
      return t.familyAppointments.reminderNone;
  }
}

/** Grid cells for a month, padded with nulls so weeks line up. */
export function monthGrid(year: number, month: number) {
  const firstWeekday = new Date(year, month, 1).getDay();
  const dayCount = new Date(year, month + 1, 0).getDate();

  const cells: (number | null)[] = Array.from(
    { length: firstWeekday },
    () => null,
  );

  for (let day = 1; day <= dayCount; day += 1) {
    cells.push(day);
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}
