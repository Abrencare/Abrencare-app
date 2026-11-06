import { useMemo, useState } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import BrandLogo, { BrandHomeLink } from '@/components/ui/BrandLogo';
import { fromDateKey, toDateKey } from '@/context/AppointmentsContext';
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  CONSULTATION_PRICE_ETB,
  formatEtb,
} from '@/data/consultationPricing';
import {
  CONSULTATION_MINUTES,
  doctorById,
  mondayFirstWeekdays,
  monthGridMondayFirst,
  specialtyLabel,
} from '@/data/doctors';
import { monthTitle } from '@/utilities/consultationFormat';

const BLUE = '#7E93A8';

export default function ConsultationBooking() {
  const { t } = useLanguage();
  const router = useRouter();
  const { draft, setDraft, isSlotTaken } = useConsultations();

  const [time, setTime] = useState<string | null>(null);

  const today = new Date();
  const todayKey = toDateKey(today);
  const selectedDate = draft.date ?? todayKey;
  const doctor = doctorById(draft.doctorId);
  const kind = draft.kind || 'video';

  const [view, setView] = useState(() => {
    const start = fromDateKey(selectedDate);
    return { year: start.getFullYear(), month: start.getMonth() };
  });

  const slots = useMemo(() => {
    if (!doctor) {
      return [];
    }

    return doctor.slots.filter((slot) => {
      if (isSlotTaken(doctor.id, selectedDate, slot)) {
        return false;
      }
      if (selectedDate !== todayKey) {
        return true;
      }
      const minutesNow = today.getHours() * 60 + today.getMinutes();
      const [hours, mins] = slot.split(':').map(Number);
      return (hours ?? 0) * 60 + (mins ?? 0) > minutesNow;
    });
  }, [doctor, selectedDate, todayKey, today, isSlotTaken]);

  const cells = monthGridMondayFirst(view.year, view.month);
  const weekdays = mondayFirstWeekdays(t);
  const atFirstMonth =
    view.year === today.getFullYear() && view.month === today.getMonth();
  const canBook = Boolean(doctor && selectedDate && time);

  function pickDate(day: number) {
    setDraft({ date: toDateKey(new Date(view.year, view.month, day)) });
    setTime(null);
  }

  function shiftMonth(delta: number) {
    setView((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  }

  function handleConfirm() {
    if (!doctor || !time) {
      return;
    }
    router.push({
      pathname: '/consultation/pay',
      params: {
        doctor: doctor.id,
        kind,
        date: selectedDate,
        time,
      },
    });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <BrandHomeLink style={styles.brandRow}>
          <BrandLogo size={34} link={false} />
        </BrandHomeLink>
        <Text style={styles.headerLabel}>{t.consultation.headerLabel}</Text>
        <Text style={styles.headerTitle}>{t.consultation.title}</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {doctor ? (
          <View style={styles.doctorCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{doctor.initials}</Text>
            </View>
            <View style={styles.doctorInfo}>
              <Text style={styles.doctorName}>{doctor.name}</Text>
              <Text style={styles.doctorSpecialty}>
                {specialtyLabel(doctor.specialty, t)}
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/consultation/doctors')}>
              <Text style={styles.changeDoctor}>{t.consultationFlow.pickDoctor}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.hintCard}
            onPress={() => router.push('/consultation/doctors')}
          >
            <Ionicons name="person-outline" size={17} color={BLUE} />
            <Text style={styles.hintText}>{t.consultation.pickDoctor}</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>{t.consultation.selectDate}</Text>

        <View style={styles.card}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => shiftMonth(-1)}
              disabled={atFirstMonth}
            >
              <Ionicons
                name="chevron-back"
                size={18}
                color={atFirstMonth ? '#D6DAE0' : BLUE}
              />
            </TouchableOpacity>

            <Text style={styles.monthTitle}>
              {monthTitle(view.year, view.month, t)}
            </Text>

            <TouchableOpacity
              style={styles.monthButton}
              onPress={() => shiftMonth(1)}
            >
              <Ionicons name="chevron-forward" size={18} color={BLUE} />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {weekdays.map((label) => (
              <Text key={label} style={styles.weekday}>
                {label}
              </Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {cells.map((day, index) => {
              if (day === null) {
                return <View key={`blank-${index}`} style={styles.dayCell} />;
              }

              const key = toDateKey(new Date(view.year, view.month, day));
              const isPast = key < todayKey;
              const isSelected = key === selectedDate;
              const isToday = key === todayKey;

              return (
                <TouchableOpacity
                  key={key}
                  style={styles.dayCell}
                  onPress={() => pickDate(day)}
                  disabled={isPast}
                >
                  <View
                    style={[
                      styles.dayInner,
                      isToday && !isSelected && styles.dayToday,
                      isSelected && styles.daySelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isPast && styles.dayPast,
                        isSelected && styles.daySelectedText,
                      ]}
                    >
                      {day}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Text style={styles.sectionLabel}>{t.consultation.selectTime}</Text>

        {!doctor ? (
          <View style={styles.hintCard}>
            <Ionicons name="information-circle-outline" size={17} color={BLUE} />
            <Text style={styles.hintText}>{t.consultation.pickDoctor}</Text>
          </View>
        ) : slots.length === 0 ? (
          <View style={styles.hintCard}>
            <Ionicons name="time-outline" size={17} color="#B4BAC1" />
            <Text style={styles.hintText}>{t.consultation.noSlots}</Text>
          </View>
        ) : (
          <View style={styles.chipWrap}>
            {slots.map((slot) => {
              const selected = time === slot;
              return (
                <TouchableOpacity
                  key={slot}
                  style={[styles.slot, selected && styles.slotSelected]}
                  onPress={() => setTime(slot)}
                >
                  <Text
                    style={[
                      styles.slotText,
                      selected && styles.slotTextSelected,
                    ]}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={styles.infoText}>
          {(kind === 'message'
            ? t.consultationPay.messageVisit
            : t.consultation.videoInfo
          ).replace('30', String(CONSULTATION_MINUTES))}
        </Text>

        <TouchableOpacity
          style={[styles.bookButton, !canBook && styles.bookButtonDisabled]}
          onPress={handleConfirm}
          disabled={!canBook}
        >
          <Ionicons
            name={kind === 'message' ? 'chatbubble' : 'videocam'}
            size={17}
            color="#FFFFFF"
          />
          <Text style={styles.bookButtonText}>
            {t.consultation.confirm.replace(
              '450 ETB',
              formatEtb(CONSULTATION_PRICE_ETB),
            )}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 28 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  brandRow: {
    alignItems: 'center',
    marginBottom: 10,
  },
  headerLabel: {
    fontSize: 10,
    letterSpacing: 1.3,
    color: BLUE,
    fontWeight: '700',
    marginBottom: 3,
  },
  headerTitle: {
    fontSize: 24,
    color: '#172B42',
    fontWeight: '700',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  doctorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginBottom: 18,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E4EAF1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#243040',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#172B42',
  },
  doctorSpecialty: {
    fontSize: 12,
    color: '#667384',
    marginTop: 2,
  },
  changeDoctor: {
    fontSize: 12,
    fontWeight: '700',
    color: BLUE,
  },
  sectionLabel: {
    fontSize: 10,
    letterSpacing: 1.3,
    color: BLUE,
    fontWeight: '700',
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    marginBottom: 20,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 14,
    paddingBottom: 12,
  },
  monthButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F4F7FB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#172B42',
  },
  weekRow: {
    flexDirection: 'row',
    paddingBottom: 6,
  },
  weekday: {
    width: `${100 / 7}%` as `${number}%`,
    textAlign: 'center',
    fontSize: 10,
    letterSpacing: 0.5,
    color: '#A8AEB4',
    fontWeight: '600',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingBottom: 12,
  },
  dayCell: {
    width: `${100 / 7}%` as `${number}%`,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayInner: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayToday: {
    borderWidth: 1.5,
    borderColor: BLUE,
  },
  daySelected: {
    backgroundColor: BLUE,
  },
  dayText: {
    fontSize: 14,
    color: '#34475D',
  },
  dayPast: {
    color: '#CDD2D8',
  },
  daySelectedText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hintCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 15,
    marginBottom: 20,
  },
  hintText: {
    flex: 1,
    fontSize: 13,
    color: '#7C8389',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 18,
  },
  slot: {
    minWidth: 78,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#EAF0F7',
    alignItems: 'center',
  },
  slotSelected: {
    backgroundColor: BLUE,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#34475D',
  },
  slotTextSelected: {
    color: '#FFFFFF',
  },
  infoText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#98A0A8',
    marginBottom: 14,
  },
  bookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    height: 52,
    borderRadius: 26,
    backgroundColor: BLUE,
  },
  bookButtonDisabled: {
    backgroundColor: '#C3CEDF',
  },
  bookButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
