import React from 'react';
import {
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useConsultations } from '@/context/ConsultationContext';
import { toDateKey } from '@/context/AppointmentsContext';
import {
  CONSULTATION_PRICE_ETB,
  formatEtb,
  type VisitKind,
} from '@/data/consultationPricing';
import { doctorById, specialtyLabel } from '@/data/doctors';
import { useLanguage } from '@/context/LanguageContext';
import { useThemedStyles } from '@/theme/useThemedStyles';

const BLUE = '#7E93A8';

function nowSlot() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(
    now.getMinutes(),
  ).padStart(2, '0')}`;
}

export default function ConsultationPay() {
  const styles = useThemedStyles(baseStyles);
  const { t } = useLanguage();
  const router = useRouter();
  const { book } = useConsultations();
  const params = useLocalSearchParams();

  const doctorId = typeof params.doctor === 'string' ? params.doctor : '';
  const kind: VisitKind = params.kind === 'message' ? 'message' : 'video';
  const date =
    typeof params.date === 'string' && params.date.length > 0
      ? params.date
      : toDateKey(new Date());
  const time =
    typeof params.time === 'string' && params.time.length > 0
      ? params.time
      : nowSlot();
  const next =
    params.next === 'call' || params.next === 'chat' || params.next === 'mycare'
      ? params.next
      : kind === 'message'
        ? 'chat'
        : 'call';

  const doctor = doctorById(doctorId);

  function confirmPay() {
    if (!doctor) {
      return;
    }

    book(doctor.id, date, time, kind);

    if (next === 'mycare') {
      router.replace('/consultation/mycare');
      return;
    }

    router.replace({
      pathname: next === 'chat' ? '/consultation/chat' : '/consultation/call',
      params: { doctor: doctor.id, paid: '1' },
    });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
              return;
            }
            router.replace('/consultation');
          }}
          style={styles.back}
          hitSlop={10}
        >
          <Ionicons name="chevron-back" size={22} color="#172B42" />
        </Pressable>
        <Text style={styles.kicker}>{t.consultationPay.kicker}</Text>
        <View style={styles.spacer} />
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{t.consultationPay.title}</Text>
        <Text style={styles.subtitle}>{t.consultationPay.subtitle}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t.consultationPay.visit}</Text>
          <Text style={styles.cardValue}>
            {kind === 'message'
              ? t.consultationPay.messageVisit
              : t.consultationPay.videoVisit}
          </Text>

          {doctor ? (
            <>
              <Text style={styles.cardLabel}>{t.consultationPay.doctor}</Text>
              <Text style={styles.cardValue}>
                {doctor.name} · {specialtyLabel(doctor.specialty, t)}
              </Text>
            </>
          ) : null}

          <Text style={styles.cardLabel}>{t.consultationPay.when}</Text>
          <Text style={styles.cardValue}>
            {date} · {time}
          </Text>

          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>{t.consultationPay.due}</Text>
            <Text style={styles.amount}>{formatEtb(CONSULTATION_PRICE_ETB)}</Text>
          </View>
        </View>

        <Text style={styles.note}>{t.consultationPay.samePrice}</Text>
      </View>

      <Pressable
        style={[styles.button, !doctor && styles.buttonOff]}
        onPress={confirmPay}
        disabled={!doctor}
      >
        <Ionicons name="card-outline" size={18} color="#FFFFFF" />
        <Text style={styles.buttonText}>
          {t.consultationPay.payNow.replace(
            '{amount}',
            formatEtb(CONSULTATION_PRICE_ETB),
          )}
        </Text>
      </Pressable>
    </SafeAreaView>
  );
}

const baseStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 10,
  },
  back: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EDF1F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    color: BLUE,
  },
  spacer: { width: 36 },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#172B42',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#667384',
    marginBottom: 22,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDE3EA',
    padding: 18,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
    color: '#8A94A0',
    marginBottom: 4,
    marginTop: 10,
  },
  cardValue: {
    fontSize: 15,
    color: '#172B42',
    fontWeight: '600',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#E8EDF2',
  },
  amountLabel: {
    fontSize: 14,
    color: '#667384',
  },
  amount: {
    fontSize: 22,
    fontWeight: '700',
    color: BLUE,
  },
  note: {
    marginTop: 16,
    fontSize: 13,
    lineHeight: 20,
    color: '#667384',
  },
  button: {
    marginHorizontal: 20,
    marginBottom: 20,
    height: 54,
    borderRadius: 16,
    backgroundColor: BLUE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonOff: { opacity: 0.45 },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
