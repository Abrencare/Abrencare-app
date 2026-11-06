import { SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useLocalSearchParams, useRouter } from 'expo-router';

import ConsultationChrome, {
  TealButton,
} from '@/components/consultation/ConsultationChrome';
import { toDateKey } from '@/context/AppointmentsContext';
import { useAuth } from '@/context/AuthContext';
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import {
  CONSULTATION_PRICE_ETB,
  formatEtb,
  parseVisitKind,
} from '@/data/consultationPricing';
import { doctorById, specialtyLabel } from '@/data/doctors';
import { useServiceTheme } from '@/service/serviceTheme';

function nowSlot() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
}

export default function ConsultationPay() {
  const styles = useStyles();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const router = useRouter();
  const { user } = useAuth();
  const { book, draft } = useConsultations();
  const params = useLocalSearchParams();
  const copy = t.consultationFlow;

  const doctorId = typeof params.doctor === 'string' ? params.doctor : '';
  const kind = parseVisitKind(params.kind);
  const immediate = params.immediate === '1';
  const date =
    typeof params.date === 'string' && params.date.length > 0
      ? params.date
      : toDateKey(new Date());
  const time =
    typeof params.time === 'string' && params.time.length > 0
      ? params.time
      : nowSlot();
  const concern =
    typeof params.concern === 'string' && params.concern.trim().length > 0
      ? params.concern
      : draft.concern || user?.healthConcern || '';

  const doctor = doctorById(doctorId);

  function confirmPay() {
    if (!doctor) {
      return;
    }

    const created = book({
      doctorId: doctor.id,
      date,
      time,
      kind,
      concern,
      immediate,
    });

    router.replace({
      pathname: '/consultation/confirmed',
      params: { id: created.id },
    });
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ConsultationChrome kicker={t.consultationPay.kicker} showBrand />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.body}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[styles.title, { color: theme.text }]}>{t.consultationPay.title}</Text>
        <Text style={[styles.subtitle, { color: theme.muted }]}>
          {t.consultationPay.subtitle}
        </Text>

        <View style={[styles.card, { borderColor: theme.border }]}>
          <Text style={[styles.label, { color: theme.muted }]}>{t.consultationPay.visit}</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {kind === 'audio' ? copy.audioVisit : copy.videoVisit}
          </Text>

          {doctor ? (
            <>
              <Text style={[styles.label, { color: theme.muted }]}>
                {t.consultationPay.doctor}
              </Text>
              <Text style={[styles.value, { color: theme.text }]}>
                {doctor.name} · {specialtyLabel(doctor.specialty, t)}
              </Text>
            </>
          ) : null}

          <Text style={[styles.label, { color: theme.muted }]}>{t.consultationPay.when}</Text>
          <Text style={[styles.value, { color: theme.text }]}>
            {immediate ? copy.consultNow : `${date} · ${time}`}
          </Text>

          {concern ? (
            <>
              <Text style={[styles.label, { color: theme.muted }]}>{copy.concernLabel}</Text>
              <Text style={[styles.value, { color: theme.text }]}>{concern}</Text>
            </>
          ) : null}

          <View style={[styles.amountRow, { borderTopColor: theme.border }]}>
            <Text style={[styles.amountLabel, { color: theme.muted }]}>
              {t.consultationPay.due}
            </Text>
            <Text style={[styles.amount, { color: theme.accent }]}>
              {formatEtb(CONSULTATION_PRICE_ETB)}
            </Text>
          </View>
        </View>

        <Text style={[styles.section, { color: theme.muted }]}>{copy.included}</Text>
        <Text style={[styles.note, { color: theme.muted }]}>{copy.included1}</Text>
        <Text style={[styles.note, { color: theme.muted }]}>{copy.included2}</Text>
        <Text style={[styles.note, { color: theme.muted }]}>{copy.included3}</Text>

        <Text style={[styles.section, { color: theme.muted }]}>{copy.refund}</Text>
        <Text style={[styles.note, { color: theme.muted }]}>{copy.refundBody}</Text>
        <Text style={[styles.note, { color: theme.muted }]}>{copy.samplePrice}</Text>
        <Text style={[styles.note, { color: theme.muted }]}>{copy.payNotConnected}</Text>
      </ScrollView>

      <TealButton
        label={t.consultationPay.payNow.replace(
          '{amount}',
          formatEtb(CONSULTATION_PRICE_ETB),
        )}
        icon="card-outline"
        disabled={!doctor}
        onPress={confirmPay}
      />
      <Text style={[styles.emergency, { color: theme.muted }]}>{copy.notEmergency}</Text>
    </SafeAreaView>
  );
}

function useStyles() {
  return StyleSheet.create({
    safe: { flex: 1 },
    scroll: { flex: 1 },
    body: { paddingHorizontal: 20, paddingBottom: 16 },
    title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.4, marginBottom: 8 },
    subtitle: { fontSize: 15, lineHeight: 22, marginBottom: 18 },
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 18,
      borderWidth: 1,
      padding: 18,
    },
    label: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      marginBottom: 4,
      marginTop: 10,
    },
    value: { fontSize: 15, fontWeight: '600' },
    amountRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 18,
      paddingTop: 14,
      borderTopWidth: 1,
    },
    amountLabel: { fontSize: 14 },
    amount: { fontSize: 22, fontWeight: '700' },
    section: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      marginTop: 18,
      marginBottom: 6,
    },
    note: { fontSize: 13, lineHeight: 20 },
    emergency: {
      textAlign: 'center',
      fontSize: 11,
      marginHorizontal: 24,
      marginTop: 10,
      marginBottom: 12,
    },
  });
}
