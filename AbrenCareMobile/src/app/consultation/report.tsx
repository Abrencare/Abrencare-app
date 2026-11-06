import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import ConsultationChrome, {
  GhostButton,
  TealButton,
} from '@/components/consultation/ConsultationChrome';
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { doctorById } from '@/data/doctors';
import { useServiceTheme } from '@/service/serviceTheme';
import { longDate } from '@/utilities/consultationFormat';

export default function ConsultationReport() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const { consultationById } = useConsultations();
  const params = useLocalSearchParams();
  const copy = t.consultationFlow;
  const id = typeof params.id === 'string' ? params.id : '';
  const consultation = consultationById(id);
  const doctor = consultation ? doctorById(consultation.doctorId) : null;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ConsultationChrome />
      <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
        <Text style={[styles.title, { color: theme.text }]}>{copy.reportsTitle}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>{copy.reportsSubtitle}</Text>

        {!consultation || !doctor ? (
          <Text style={[styles.meta, { color: theme.muted }]}>{copy.noReports}</Text>
        ) : !consultation.reportApproved ? (
          <View style={[styles.card, { borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>
              {copy.pendingReview}
            </Text>
            <Text style={[styles.meta, { color: theme.muted }]}>
              {copy.pendingReviewBody}
            </Text>
            <Text style={[styles.meta, { color: theme.muted }]}>
              {doctor.name} · {longDate(consultation.date, t)}
            </Text>
          </View>
        ) : (
          <>
            <View style={[styles.chip, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.chipText, { color: theme.accent }]}>
                {copy.clinicianApproved}
              </Text>
            </View>
            <View style={[styles.card, { borderColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.muted }]}>{t.myCare.summaryDoctor}</Text>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{doctor.name}</Text>
              <Text style={[styles.label, { color: theme.muted }]}>
                {t.consultationPay.visit}
              </Text>
              <Text style={[styles.meta, { color: theme.text }]}>
                {longDate(consultation.date, t)} ·{' '}
                {consultation.kind === 'message' ? t.consultationPay.messageVisit : copy.videoVisit}
              </Text>
            </View>
            <View style={[styles.card, { borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>
                {copy.clinicalSummary}
              </Text>
              <Text style={[styles.label, { color: theme.muted }]}>{copy.reason}</Text>
              <Text style={[styles.meta, { color: theme.text }]}>
                {consultation.concern || t.myCare.summaryNotes}
              </Text>
              <Text style={[styles.label, { color: theme.muted }]}>{copy.doctorPlan}</Text>
              <Text style={[styles.meta, { color: theme.text }]}>{t.myCare.summaryNotes}</Text>
            </View>
          </>
        )}
      </ScrollView>
      {consultation?.reportApproved ? (
        <>
          <TealButton
            label={copy.viewSigned}
            onPress={() => router.replace('/consultation/mycare')}
          />
          <GhostButton
            label={copy.bookFollow}
            onPress={() => router.push('/consultation/doctors')}
          />
        </>
      ) : (
        <TealButton
          label={copy.bookFollow}
          onPress={() => router.push('/consultation/doctors')}
        />
      )}
      <Text style={[styles.note, { color: theme.muted }]}>{copy.pendingReviewBody}</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  body: { paddingHorizontal: 20, paddingBottom: 16 },
  title: { fontSize: 26, fontWeight: '800' },
  subtitle: { fontSize: 14, marginTop: 6, marginBottom: 16 },
  chip: {
    alignSelf: 'flex-start',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginBottom: 12,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  label: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginTop: 12,
  },
  meta: { fontSize: 14, lineHeight: 20, marginTop: 4 },
  note: {
    textAlign: 'center',
    fontSize: 11,
    marginHorizontal: 24,
    marginTop: 10,
    marginBottom: 12,
  },
});
