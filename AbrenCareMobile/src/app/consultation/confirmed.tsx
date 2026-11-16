import React from 'react';
import {
  Alert,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ConsultationChrome from '@/components/consultation/ConsultationChrome';
import { GlassCard, glassShadow, glassTints } from '@/components/executive/GlassCard';
import { isJoinable, useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { CONSULTATION_PRICE_ETB, formatEtb } from '@/data/consultationPricing';
import { doctorById, specialtyLabel } from '@/data/doctors';
import { useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';
import { longDate } from '@/utilities/consultationFormat';

export default function ConsultationConfirmed() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const type = useLandingType('consultation');
  const { isDark } = useAppTheme();
  const glass = glassTints(isDark, 'consultation');
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
        <ConsultationChrome onBack={() => router.replace('/consultation')} />
        <View style={styles.emptyContainer}>
          <Text style={[styles.missing, type.body, { color: theme.muted }]}>
            {copy.noneAvailable}
          </Text>
        </View>
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

  function handleAddCalendar() {
    const formattedDate = longDate(visit.date, t);
    Alert.alert(
      copy.calendarTitle || 'Add to Calendar',
      `Your consultation with ${clinician.name} is reserved for ${formattedDate} at ${visit.time} (EAT). A reminder will be sent before the visit.`,
      [{ text: t.myCare?.ok || 'OK' }],
    );
  }

  const visitLabel =
    visit.kind === 'audio'
      ? copy.audioConsult?.toUpperCase() || 'AUDIO CONSULTATION'
      : copy.videoConsult?.toUpperCase() || 'VIDEO CONSULTATION';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ConsultationChrome onBack={() => router.replace('/consultation/mycare')} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Pill */}
        <View style={styles.statusPillWrap}>
          <View style={styles.successPill}>
            <Ionicons name="checkmark-circle" size={13} color="#2E7D32" />
            <Text style={[styles.successPillText, type.kicker]}>
              {copy.paymentSuccess}
            </Text>
          </View>
        </View>

        {/* Large Executive Checkmark Badge */}
        <View style={styles.checkOuterRing}>
          <View style={[styles.checkInnerCircle, { backgroundColor: isDark ? '#162822' : '#FFFFFF' }]}>
            <Ionicons name="checkmark" size={32} color="#2E7D32" />
          </View>
        </View>

        {/* Title & Subtitle */}
        <Text style={[styles.title, type.headline, { color: theme.text }]}>
          {copy.confirmedTitle}
        </Text>
        <Text style={[styles.subtitle, type.bodySmall, { color: theme.muted }]}>
          {copy.confirmedBody}
        </Text>

        {/* Executive GlassCard Appointment Details */}
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor={glassShadow('consultation')}
          style={styles.card}
        >
          {/* Visit Kind Badge */}
          <View style={[styles.kindPill, { backgroundColor: theme.accentSoft }]}>
            <Ionicons
              name={visit.kind === 'audio' ? 'call' : 'videocam'}
              size={12}
              color={theme.accent}
            />
            <Text style={[styles.kindText, { color: theme.accent, fontFamily: type.sansSemi }]}>
              {visitLabel}
            </Text>
          </View>

          {/* Date & Time */}
          <Text style={[styles.dateText, { color: theme.text, fontFamily: type.display }]}>
            {longDate(visit.date, t)}
          </Text>
          <Text style={[styles.timeText, type.bodySmall, { color: theme.muted }]}>
            {visit.time}, Ethiopia time (EAT)
          </Text>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: glass.border }]} />

          {/* Doctor Info Row */}
          <View style={styles.doctorRow}>
            <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.initials, { color: theme.accent, fontFamily: type.sansSemi }]}>
                {clinician.initials}
              </Text>
            </View>

            <View style={styles.doctorInfo}>
              <Text style={[styles.doctorName, type.label, { color: theme.text }]}>
                {clinician.name}
              </Text>
              <Text style={[styles.doctorSpecialty, type.caption, { color: theme.muted }]}>
                {specialtyLabel(clinician.specialty, t)}
              </Text>
            </View>

            <View style={styles.paidBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#2E7D32" />
              <Text style={styles.paidBadgeText}>
                {copy.paymentReceived}
              </Text>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: glass.border }]} />

          {/* Amount Paid */}
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, type.bodySmall, { color: theme.muted }]}>
              {copy.amountPaid || 'Amount paid'}:
            </Text>
            <Text style={[styles.amountValue, type.label, { color: theme.text }]}>
              {formatEtb(CONSULTATION_PRICE_ETB)}
            </Text>
          </View>
        </GlassCard>

        {/* Action Buttons */}
        <View style={styles.buttonStack}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}
            onPress={openAppointment}
          >
            <Text style={[styles.primaryButtonText, type.button]}>
              {copy.viewAppointment}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: glass.border, backgroundColor: glass.well },
              pressed && styles.pressed,
            ]}
            onPress={handleAddCalendar}
          >
            <Ionicons name="calendar-outline" size={16} color={theme.text} />
            <Text style={[styles.secondaryButtonText, type.button, { color: theme.text }]}>
              {copy.addCalendar}
            </Text>
          </Pressable>
        </View>

        {/* Helper Note */}
        <Text style={[styles.confirmNote, type.caption, { color: theme.muted }]}>
          {copy.confirmNote}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 40,
    maxWidth: 500,
    width: '100%',
    alignSelf: 'center',
    alignItems: 'center',
  },
  statusPillWrap: {
    marginBottom: 16,
    alignItems: 'center',
  },
  successPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(46, 125, 50, 0.22)',
  },
  successPillText: {
    color: '#2E7D32',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  checkOuterRing: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(46, 125, 50, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(46, 125, 50, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  checkInnerCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2E7D32',
    shadowOpacity: 0.14,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  title: {
    textAlign: 'center',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
    marginBottom: 20,
  },
  card: {
    width: '100%',
    padding: 20,
    marginBottom: 22,
  },
  kindPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  kindText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  dateText: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
  },
  timeText: {
    fontSize: 13,
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  doctorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontSize: 15,
    fontWeight: '700',
  },
  doctorInfo: {
    flex: 1,
  },
  doctorName: {
    fontSize: 15,
    fontWeight: '700',
  },
  doctorSpecialty: {
    fontSize: 12,
    marginTop: 2,
  },
  paidBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
  },
  paidBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2E7D32',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    fontSize: 13,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  buttonStack: {
    width: '100%',
    gap: 10,
  },
  primaryButton: {
    width: '100%',
    height: 52,
    borderRadius: 26,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    width: '100%',
    height: 50,
    borderRadius: 25,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  confirmNote: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  missing: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});
