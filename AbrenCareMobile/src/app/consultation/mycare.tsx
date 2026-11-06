import {
  Alert,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useAuth } from '@/context/AuthContext';
import {
  isJoinable,
  useConsultations,
  type Consultation,
} from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { doctorById, specialtyLabel } from '@/data/doctors';
import { useServiceTheme } from '@/service/serviceTheme';
import { longDate } from '@/utilities/consultationFormat';

export default function ConsultationMyCare() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const { user } = useAuth();
  const { upcoming, recent, followUpDate, cancel } = useConsultations();
  const copy = t.consultationFlow;
  const approved = recent.filter((item) => item.reportApproved);
  const prescriptions = recent.filter((item) => item.prescriptionIssued);

  function join(consultation: Consultation) {
    if (!isJoinable(consultation)) {
      Alert.alert(t.myCare.joinTitle, copy.joinTooEarly, [{ text: t.myCare.ok }]);
      return;
    }
    router.push({
      pathname: '/consultation/waiting',
      params: { id: consultation.id },
    });
  }

  function handleCancel(consultation: Consultation) {
    Alert.alert(t.myCare.cancelTitle, t.myCare.cancelMessage, [
      { text: t.myCare.cancelKeep, style: 'cancel' },
      {
        text: t.myCare.cancelConfirm,
        style: 'destructive',
        onPress: () => cancel(consultation.id),
      },
    ]);
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.kicker, { color: theme.muted }]}>{copy.digital}</Text>
        <Text style={[styles.title, { color: theme.text }]}>{t.myCare.title}</Text>
        {user?.name ? (
          <Text style={[styles.patient, { color: theme.muted }]}>{user.name}</Text>
        ) : null}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.section, { color: theme.muted }]}>{t.myCare.upcoming}</Text>
        {upcoming.length === 0 ? (
          <Empty
            icon="calendar-outline"
            title={t.myCare.noUpcoming}
            hint={t.myCare.noUpcomingHint}
            action={copy.book}
            onPress={() => router.push('/consultation/doctors')}
          />
        ) : (
          upcoming.map((consultation) => {
            const doctor = doctorById(consultation.doctorId);
            if (!doctor) {
              return null;
            }
            return (
              <View key={consultation.id} style={[styles.card, { borderColor: theme.border }]}>
                <Text style={[styles.cardKicker, { color: theme.accent }]}>
                  {consultation.kind === 'audio' ? copy.audioConsult : copy.videoConsult}
                </Text>
                <Text style={[styles.cardTitle, { color: theme.text }]}>{doctor.name}</Text>
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {specialtyLabel(doctor.specialty, t)} · {longDate(consultation.date, t)} ·{' '}
                  {consultation.time}
                </Text>
                <View style={styles.actions}>
                  <Pressable
                    style={[styles.primary, { backgroundColor: theme.accent }]}
                    onPress={() => join(consultation)}
                  >
                    <Text style={styles.primaryText}>{t.myCare.join}</Text>
                  </Pressable>
                  <Pressable onPress={() => handleCancel(consultation)}>
                    <Text style={[styles.link, { color: theme.muted }]}>{t.myCare.cancel}</Text>
                  </Pressable>
                </View>
              </View>
            );
          })
        )}

        <Text style={[styles.section, { color: theme.muted }]}>{t.myCare.recent}</Text>
        {recent.length === 0 ? (
          <Empty icon="document-text-outline" title={t.myCare.noRecent} />
        ) : (
          recent.map((consultation) => {
            const doctor = doctorById(consultation.doctorId);
            if (!doctor) {
              return null;
            }
            return (
              <Pressable
                key={consultation.id}
                style={[styles.card, { borderColor: theme.border }]}
                onPress={() =>
                  router.push({
                    pathname: '/consultation/report',
                    params: { id: consultation.id },
                  })
                }
              >
                <Text style={[styles.cardTitle, { color: theme.text }]}>{doctor.name}</Text>
                <Text style={[styles.meta, { color: theme.muted }]}>
                  {longDate(consultation.date, t)} · {t.myCare.completed}
                </Text>
                <Text style={[styles.meta, { color: theme.accent }]}>
                  {consultation.reportApproved
                    ? copy.clinicianApproved
                    : copy.pendingReview}
                </Text>
              </Pressable>
            );
          })
        )}

        <Text style={[styles.section, { color: theme.muted }]}>{copy.reports}</Text>
        {approved.length === 0 ? (
          <Empty
            icon="document-outline"
            title={copy.noReports}
            hint={copy.noReportsHint}
          />
        ) : (
          approved.map((consultation) => (
            <Pressable
              key={consultation.id}
              style={[styles.card, { borderColor: theme.border }]}
              onPress={() =>
                router.push({
                  pathname: '/consultation/report',
                  params: { id: consultation.id },
                })
              }
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {doctorById(consultation.doctorId)?.name}
              </Text>
              <Text style={[styles.meta, { color: theme.accent }]}>
                {copy.clinicianApproved}
              </Text>
            </Pressable>
          ))
        )}

        <Text style={[styles.section, { color: theme.muted }]}>{copy.prescriptions}</Text>
        {prescriptions.length === 0 ? (
          <Empty
            icon="medkit-outline"
            title={copy.noPrescriptions}
            hint={copy.noPrescriptionsHint}
          />
        ) : (
          prescriptions.map((consultation) => (
            <Pressable
              key={consultation.id}
              style={[styles.card, { borderColor: theme.border }]}
              onPress={() =>
                router.push({
                  pathname: '/consultation/prescriptions',
                  params: { id: consultation.id },
                })
              }
            >
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {doctorById(consultation.doctorId)?.name}
              </Text>
            </Pressable>
          ))
        )}

        <Text style={[styles.section, { color: theme.muted }]}>{copy.followUps}</Text>
        <View style={[styles.card, { borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>{copy.nextStep}</Text>
          <Text style={[styles.meta, { color: theme.muted }]}>{copy.nextStepBody}</Text>
          <Text style={[styles.meta, { color: theme.muted }]}>
            {copy.nextAppt}: {followUpDate ?? copy.notBooked}
          </Text>
          <Pressable
            style={[styles.primary, { backgroundColor: theme.accent, marginTop: 12 }]}
            onPress={() => router.push('/consultation/doctors')}
          >
            <Text style={styles.primaryText}>{copy.bookFollow}</Text>
          </Pressable>
        </View>

        <Text style={[styles.note, { color: theme.muted }]}>{copy.notEmergency}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Empty({
  icon,
  title,
  hint,
  action,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  hint?: string;
  action?: string;
  onPress?: () => void;
}) {
  const theme = useServiceTheme('consultation');
  return (
    <View style={[styles.empty, { borderColor: theme.border }]}>
      <Ionicons name={icon} size={22} color={theme.muted} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
      {hint ? <Text style={[styles.meta, { color: theme.muted }]}>{hint}</Text> : null}
      {action && onPress ? (
        <Pressable
          style={[styles.primary, { backgroundColor: theme.accent, marginTop: 12 }]}
          onPress={onPress}
        >
          <Text style={styles.primaryText}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 10 },
  kicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  title: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  patient: { fontSize: 13, marginTop: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 28 },
  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 20,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 10,
  },
  cardKicker: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 14 },
  primary: {
    height: 40,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: { color: '#FFFFFF', fontWeight: '700' },
  link: { fontWeight: '600' },
  empty: {
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  note: { fontSize: 12, lineHeight: 18, marginTop: 12 },
});
