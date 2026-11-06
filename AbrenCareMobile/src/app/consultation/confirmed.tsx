import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ConsultationChrome, {
  GhostButton,
  TealButton,
} from '@/components/consultation/ConsultationChrome';
import {
  isJoinable,
  useConsultations,
} from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  CONSULTATION_PRICE_ETB,
  formatEtb,
} from '@/data/consultationPricing';
import { doctorById, specialtyLabel } from '@/data/doctors';
import { useServiceTheme } from '@/service/serviceTheme';
import { longDate } from '@/utilities/consultationFormat';

export default function ConsultationConfirmed() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const { ready, consultationById } = useConsultations();
  const params = useLocalSearchParams();
  const copy = t.consultationFlow;
  const id = typeof params.id === 'string' ? params.id : '';
  const consultation = consultationById(id);
  const doctor = consultation ? doctorById(consultation.doctorId) : null;

  if (!ready) {
    return null;
  }

  if (!consultation || !doctor) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <ConsultationChrome />
        <Text style={[styles.missing, { color: theme.muted }]}>
          {copy.noneAvailable}
        </Text>
      </SafeAreaView>
    );
  }

  const visit = consultation;
  const clinician = doctor;

  function openAppointment() {
    if (isJoinable(visit)) {
      router.replace({
        pathname: '/consultation/waiting',
        params: { id },
      });
      return;
    }
    router.replace('/consultation/mycare');
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ConsultationChrome kicker={copy.paymentSuccess} />
      <View style={styles.body}>
        <View style={[styles.check, { backgroundColor: theme.accentSoft }]}>
          <Ionicons name="checkmark" size={32} color={theme.accent} />
        </View>
        <Text style={[styles.title, { color: theme.text }]}>{copy.confirmedTitle}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{copy.confirmedBody}</Text>

        <View style={[styles.card, { borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.accent }]}>
            {visit.kind === 'message' ? t.consultationPay.messageVisit : copy.videoConsult}
          </Text>
          <Text style={[styles.when, { color: theme.text }]}>
            {longDate(visit.date, t)}
          </Text>
          <Text style={[styles.meta, { color: theme.muted }]}>
            {visit.time}
          </Text>

          <View style={styles.doctorRow}>
            <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.initials, { color: theme.accent }]}>
                {clinician.initials}
              </Text>
            </View>
            <View style={styles.doctorCopy}>
              <Text style={[styles.doctorName, { color: theme.text }]}>{clinician.name}</Text>
              <Text style={[styles.meta, { color: theme.muted }]}>
                {specialtyLabel(clinician.specialty, t)}
              </Text>
            </View>
            <View style={[styles.paid, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.paidText, { color: theme.accent }]}>
                {copy.paymentReceived}
              </Text>
            </View>
          </View>

          <Text style={[styles.meta, { color: theme.muted, marginTop: 12 }]}>
            {copy.amountPaid}: {formatEtb(CONSULTATION_PRICE_ETB)}
          </Text>
        </View>
      </View>

      <TealButton label={copy.viewAppointment} onPress={openAppointment} />
      <GhostButton
        label={copy.addCalendar}
        onPress={() => Alert.alert(copy.calendarTitle, copy.calendarBody)}
      />
      <Text style={[styles.note, { color: theme.muted }]}>{copy.confirmNote}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20, alignItems: 'center' },
  check: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 22 },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.1, marginBottom: 8 },
  when: { fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 4 },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 16,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontWeight: '800' },
  doctorCopy: { flex: 1 },
  doctorName: { fontSize: 15, fontWeight: '700' },
  paid: { borderRadius: 12, paddingHorizontal: 8, paddingVertical: 4 },
  paidText: { fontSize: 11, fontWeight: '700' },
  note: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    marginHorizontal: 24,
    marginTop: 12,
    marginBottom: 14,
  },
  missing: { textAlign: 'center', marginTop: 40 },
});
