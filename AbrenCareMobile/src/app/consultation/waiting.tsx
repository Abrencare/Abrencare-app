import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ConsultationChrome, {
  TealButton,
} from '@/components/consultation/ConsultationChrome';
import Replace from '@/components/gates/Replace';
import {
  isJoinable,
  useConsultations,
} from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { doctorById, specialtyLabel } from '@/data/doctors';
import { useServiceTheme } from '@/service/serviceTheme';

export default function ConsultationWaiting() {
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

  if (!consultation || !consultation.paid || !doctor) {
    return <Replace href="/consultation/mycare" />;
  }

  const audio = consultation.kind === 'message';
  const visit = consultation;

  function join() {
    if (!isJoinable(visit)) {
      router.replace('/consultation/mycare');
      return;
    }
    router.replace({
      pathname: visit.kind === 'message' ? '/consultation/chat' : '/consultation/call',
      params: { id: visit.id, doctor: visit.doctorId, paid: '1' },
    });
  }

  const checks: { icon: keyof typeof Ionicons.glyphMap; title: string; body: string }[] = [
    ...(audio
      ? []
      : [{ icon: 'videocam-outline' as const, title: copy.camera, body: copy.cameraOk }]),
    { icon: 'mic-outline', title: copy.mic, body: copy.micOk },
    { icon: 'wifi-outline', title: copy.connection, body: copy.connectionOk },
  ];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ConsultationChrome />
      <View style={styles.body}>
        <Text style={[styles.title, { color: theme.text }]}>
          {audio ? copy.waitingAudioTitle : copy.waitingTitle}
        </Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{copy.waitingSubtitle}</Text>

        <View style={[styles.card, { borderColor: theme.border }]}>
          <View style={styles.doctorRow}>
            <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.initials, { color: theme.accent }]}>{doctor.initials}</Text>
            </View>
            <View style={styles.doctorCopy}>
              <Text style={[styles.name, { color: theme.text }]}>{doctor.name}</Text>
              <Text style={[styles.meta, { color: theme.muted }]}>
                {specialtyLabel(doctor.specialty, t)}
              </Text>
            </View>
          </View>
          <View style={styles.whenRow}>
            <Text style={[styles.meta, { color: theme.text }]}>
              {consultation.date} · {consultation.time}
            </Text>
            <View style={[styles.chip, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.chipText, { color: theme.accent }]}>
                {copy.confirmedChip}
              </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.section, { color: theme.muted }]}>{copy.checkDevice}</Text>
        {checks.map((item) => (
          <View key={item.title} style={[styles.check, { borderColor: theme.border }]}>
            <Ionicons name="checkmark-circle" size={20} color={theme.accent} />
            <View>
              <Text style={[styles.checkTitle, { color: theme.text }]}>{item.title}</Text>
              <Text style={[styles.meta, { color: theme.muted }]}>{item.body}</Text>
            </View>
          </View>
        ))}
      </View>

      <TealButton
        label={copy.joinWaiting}
        disabled={!isJoinable(consultation)}
        onPress={join}
      />
      <Text style={[styles.note, { color: theme.muted }]}>
        {isJoinable(consultation) ? copy.waitingNote : copy.joinTooEarly}
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { flex: 1, paddingHorizontal: 20 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 8 },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 18,
  },
  doctorRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: { fontWeight: '800' },
  doctorCopy: { flex: 1 },
  name: { fontSize: 16, fontWeight: '700' },
  meta: { fontSize: 13, marginTop: 2 },
  whenRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  chip: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 11, fontWeight: '700' },
  section: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 8,
  },
  check: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
  },
  checkTitle: { fontSize: 15, fontWeight: '700' },
  note: {
    textAlign: 'center',
    fontSize: 11,
    marginHorizontal: 24,
    marginTop: 10,
    marginBottom: 12,
  },
});
