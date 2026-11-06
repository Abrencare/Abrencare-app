import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ConsultationChrome, {
  GhostButton,
  TealButton,
} from '@/components/consultation/ConsultationChrome';
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { useServiceTheme } from '@/service/serviceTheme';

export default function ConsultationPrescriptions() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const { consultationById, upcoming } = useConsultations();
  const params = useLocalSearchParams();
  const copy = t.consultationFlow;
  const id = typeof params.id === 'string' ? params.id : '';
  const consultation = id ? consultationById(id) : null;
  const issued = consultation?.prescriptionIssued === true;
  const nextBooked = upcoming.find((visit) => visit.id !== consultation?.id);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ConsultationChrome />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>{copy.rxTitle}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{copy.rxSubtitle}</Text>

        <View style={[styles.card, styles.rxCard, { borderColor: theme.border }]}>
          <View style={[styles.plus, { backgroundColor: theme.accentSoft }]}>
            <Ionicons
              name={issued ? 'medkit-outline' : 'add'}
              size={22}
              color={theme.accent}
            />
          </View>
          <Text style={[styles.cardTitle, styles.center, { color: theme.text }]}>
            {issued ? copy.prescriptions : copy.noRx}
          </Text>
          <Text style={[styles.meta, styles.center, { color: theme.muted }]}>
            {issued ? copy.rxSubtitle : copy.noRxBody}
          </Text>
        </View>

        <View style={[styles.card, { borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text, textAlign: 'left' }]}>
            {copy.nextStep}
          </Text>
          <Text style={[styles.meta, { color: theme.muted, textAlign: 'left' }]}>
            {copy.nextStepBody}
          </Text>
          <Text style={[styles.label, { color: theme.muted }]}>{copy.nextAppt}</Text>
          <Text style={[styles.meta, { color: theme.text, textAlign: 'left' }]}>
            {nextBooked
              ? `${nextBooked.date} · ${nextBooked.time}`
              : copy.notBooked}
          </Text>
        </View>
      </ScrollView>
      <TealButton
        label={copy.bookFollow}
        onPress={() => router.push('/consultation/doctors')}
      />
      <GhostButton
        label={copy.viewReport}
        onPress={() =>
          consultation
            ? router.push({
                pathname: '/consultation/report',
                params: { id: consultation.id },
              })
            : router.push('/consultation/mycare')
        }
      />
      <Text style={[styles.note, { color: theme.muted }]}>{copy.notEmergency}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 16 },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    marginBottom: 12,
  },
  rxCard: {
    alignItems: 'center',
  },
  center: {
    textAlign: 'center',
  },
  plus: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center' },
  meta: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 6 },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 14,
  },
  note: {
    textAlign: 'center',
    fontSize: 11,
    marginHorizontal: 24,
    marginTop: 10,
    marginBottom: 12,
  },
});
