import React, { useState } from 'react';
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
import { useConsultations } from '@/context/ConsultationContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { doctorById } from '@/data/doctors';
import { useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

export default function ConsultationPrescriptions() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const type = useLandingType('consultation');
  const { isDark } = useAppTheme();
  const glass = glassTints(isDark, 'consultation');
  const { consultationById, upcoming, recent } = useConsultations();
  const params = useLocalSearchParams();
  const copy = t.consultationFlow;

  const id = typeof params.id === 'string' ? params.id : '';
  const consultation = (id ? consultationById(id) : null) || recent[0] || upcoming[0] || null;
  const doctor = consultation ? doctorById(consultation.doctorId) : null;

  // Determine if prescription was issued
  const issued = consultation ? consultation.prescriptionIssued === true : false;
  const prescriptionsList = consultation?.prescriptions || [];
  const hasMedications = issued && prescriptionsList.length > 0;

  // Find next booked appointment
  const nextBooked = upcoming.find((visit) => visit.id !== consultation?.id);
  const nextDoctor = nextBooked ? doctorById(nextBooked.doctorId) : null;

  const [pharmacySent, setPharmacySent] = useState(false);

  function handlePharmacyOrder() {
    setPharmacySent(true);
    Alert.alert(
      'Pharmacy Order Initiated',
      'Your authorized prescription has been sent to our verified partner pharmacy network in Addis Ababa. A pharmacist will contact you for delivery confirmation.',
      [{ text: t.myCare?.ok || 'OK' }],
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ConsultationChrome onBack={() => router.replace('/consultation/mycare')} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Title & Subtitle */}
        <View style={styles.headerBlock}>
          <Text style={[styles.title, type.headline, { color: theme.text }]}>
            {copy.rxTitle}
          </Text>
          <Text style={[styles.subtitle, type.bodySmall, { color: theme.muted }]}>
            {copy.rxSubtitle}
          </Text>
        </View>

        {/* Card 1: Prescription Status */}
        {hasMedications ? (
          /* When Doctor Ordered Prescriptions */
          <GlassCard
            tint={glass.card}
            border={glass.border}
            sheen={glass.sheen}
            shadowColor={glassShadow('consultation')}
            style={styles.card}
          >
            <View style={styles.rxHeaderRow}>
              <View style={[styles.rxIconCircle, { backgroundColor: theme.accentSoft }]}>
                <Ionicons name="medkit" size={20} color={theme.accent} />
              </View>
              <View style={styles.rxHeaderCopy}>
                <Text style={[styles.rxHeaderTitle, type.label, { color: theme.text }]}>
                  Doctor-Authorized Medications
                </Text>
                <Text style={[styles.rxHeaderSubtitle, type.caption, { color: theme.muted }]}>
                  {doctor ? `Prescribed by ${doctor.name}` : 'Prescription active'}
                </Text>
              </View>
              <View style={styles.authorizedPill}>
                <Ionicons name="checkmark-done" size={11} color="#2E7D32" />
                <Text style={styles.authorizedPillText}>AUTHORIZED</Text>
              </View>
            </View>

            <View style={[styles.divider, { backgroundColor: glass.border }]} />

            {/* List of Medications */}
            <View style={styles.medList}>
              {prescriptionsList.map((item, index) => (
                <View key={item.id || index} style={styles.medItem}>
                  <View style={styles.medTopRow}>
                    <View style={styles.medBullet}>
                      <Ionicons name="fitness" size={14} color={theme.accent} />
                    </View>
                    <View style={styles.medNameBlock}>
                      <Text style={[styles.medName, type.label, { color: theme.text }]}>
                        {item.name}
                      </Text>
                      <Text style={[styles.medDosage, type.caption, { color: theme.accent, fontFamily: type.sansSemi }]}>
                        {item.dosage}
                      </Text>
                    </View>
                    <View style={[styles.durationChip, { backgroundColor: theme.accentSoft }]}>
                      <Ionicons name="time-outline" size={11} color={theme.accent} />
                      <Text style={[styles.durationText, { color: theme.accent }]}>
                        {item.duration}
                      </Text>
                    </View>
                  </View>

                  <Text style={[styles.medInstructions, type.bodySmall, { color: theme.muted }]}>
                    {item.instructions}
                  </Text>

                  {item.pharmacyNote ? (
                    <Text style={[styles.medNote, type.caption, { color: theme.muted }]}>
                      Note: {item.pharmacyNote}
                    </Text>
                  ) : null}

                  {index < prescriptionsList.length - 1 ? (
                    <View style={[styles.innerDivider, { backgroundColor: glass.border }]} />
                  ) : null}
                </View>
              ))}
            </View>

            <View style={[styles.divider, { backgroundColor: glass.border }]} />

            {/* Pharmacy Fulfillment Guide */}
            <View style={styles.pharmacyGuide}>
              <View style={styles.pharmacyIconWrap}>
                <Ionicons name="business-outline" size={16} color={theme.accent} />
              </View>
              <Text style={[styles.pharmacyText, type.caption, { color: theme.muted }]}>
                Valid at all licensed pharmacies in Ethiopia. You can present this digital record or request direct delivery through Nordic AbrenCare Pharmacy.
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.pharmacyBtn,
                { backgroundColor: theme.accentSoft, borderColor: theme.border },
                pressed && styles.pressed,
              ]}
              onPress={handlePharmacyOrder}
            >
              <Ionicons
                name={pharmacySent ? 'checkmark-circle' : 'cart-outline'}
                size={16}
                color={theme.accent}
              />
              <Text style={[styles.pharmacyBtnText, type.button, { color: theme.accent }]}>
                {pharmacySent ? 'Fulfillment Requested' : 'Order through Partner Pharmacy'}
              </Text>
            </Pressable>
          </GlassCard>
        ) : (
          /* When NO Prescription Issued (Matching Screen 15) */
          <GlassCard
            tint={glass.card}
            border={glass.border}
            sheen={glass.sheen}
            shadowColor={glassShadow('consultation')}
            style={[styles.card, styles.noRxCard]}
          >
            <View style={[styles.plusCircle, { backgroundColor: theme.accentSoft }]}>
              <Ionicons name="add" size={24} color={theme.accent} />
            </View>
            <Text style={[styles.noRxTitle, type.label, { color: theme.text }]}>
              {copy.noRx}
            </Text>
            <Text style={[styles.noRxSubtitle, type.bodySmall, { color: theme.muted }]}>
              {copy.noRxBody}
            </Text>
          </GlassCard>
        )}

        {/* Card 2: Recommended Next Step */}
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor={glassShadow('consultation')}
          style={styles.card}
        >
          <Text style={[styles.nextStepTitle, type.label, { color: theme.text }]}>
            {copy.nextStep}
          </Text>
          <Text style={[styles.nextStepBody, type.bodySmall, { color: theme.muted }]}>
            {copy.nextStepBody}
          </Text>

          <View style={[styles.divider, { backgroundColor: glass.border }]} />

          <Text style={[styles.nextApptLabel, type.kicker, { color: theme.muted }]}>
            {copy.nextAppt?.toUpperCase() || 'YOUR NEXT APPOINTMENT'}
          </Text>
          <Text style={[styles.nextApptValue, type.body, { color: theme.text }]}>
            {nextBooked
              ? `${nextBooked.date} · ${nextBooked.time}${nextDoctor ? ` with ${nextDoctor.name}` : ''}`
              : copy.notBooked}
          </Text>
        </GlassCard>

        {/* Action Buttons */}
        <View style={styles.buttonStack}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}
            onPress={() => router.push('/consultation/doctors')}
          >
            <Text style={[styles.primaryButtonText, type.button]}>
              {copy.bookFollow}
            </Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryButton,
              { borderColor: glass.border, backgroundColor: glass.well },
              pressed && styles.pressed,
            ]}
            onPress={() =>
              consultation
                ? router.push({
                    pathname: '/consultation/report',
                    params: { id: consultation.id },
                  })
                : router.push('/consultation/mycare')
            }
          >
            <Ionicons name="document-text-outline" size={16} color={theme.text} />
            <Text style={[styles.secondaryButtonText, type.button, { color: theme.text }]}>
              {copy.viewSigned || 'View consultation report'}
            </Text>
          </Pressable>
        </View>

        {/* Disclaimer Note */}
        <Text style={[styles.disclaimerNote, type.caption, { color: theme.muted }]}>
          {copy.notEmergency}
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
  },
  headerBlock: {
    marginBottom: 18,
  },
  title: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  card: {
    padding: 18,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginVertical: 14,
  },
  innerDivider: {
    height: 1,
    marginVertical: 12,
  },
  noRxCard: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  plusCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  noRxTitle: {
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  noRxSubtitle: {
    textAlign: 'center',
    fontSize: 13,
    lineHeight: 19,
    marginTop: 6,
    maxWidth: 320,
  },
  rxHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rxIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxHeaderCopy: {
    flex: 1,
  },
  rxHeaderTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  rxHeaderSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  authorizedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(46, 125, 50, 0.1)',
  },
  authorizedPillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2E7D32',
  },
  medList: {
    width: '100%',
  },
  medItem: {
    width: '100%',
  },
  medTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  medBullet: {
    marginTop: 2,
  },
  medNameBlock: {
    flex: 1,
  },
  medName: {
    fontSize: 15,
    fontWeight: '700',
  },
  medDosage: {
    fontSize: 12,
    marginTop: 2,
  },
  durationChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '600',
  },
  medInstructions: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
    marginLeft: 24,
  },
  medNote: {
    fontSize: 11,
    fontStyle: 'italic',
    marginTop: 4,
    marginLeft: 24,
  },
  pharmacyGuide: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    marginBottom: 12,
  },
  pharmacyIconWrap: {
    marginTop: 2,
  },
  pharmacyText: {
    flex: 1,
    fontSize: 11,
    lineHeight: 16,
  },
  pharmacyBtn: {
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  pharmacyBtnText: {
    fontSize: 13,
    fontWeight: '700',
  },
  nextStepTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  nextStepBody: {
    fontSize: 13,
    lineHeight: 19,
  },
  nextApptLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  nextApptValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  buttonStack: {
    width: '100%',
    gap: 10,
    marginTop: 6,
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
  disclaimerNote: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 16,
    marginTop: 16,
    paddingHorizontal: 12,
  },
  pressed: {
    opacity: 0.88,
  },
});
