import React, { useState } from 'react';
import {
  Modal,
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
import { doctorById, specialtyLabel } from '@/data/doctors';
import { useServiceTheme } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';
import { longDate } from '@/utilities/consultationFormat';

export default function ConsultationReport() {
  const router = useRouter();
  const { t } = useLanguage();
  const theme = useServiceTheme('consultation');
  const type = useLandingType('consultation');
  const { isDark } = useAppTheme();
  const glass = glassTints(isDark, 'consultation');
  const { consultationById } = useConsultations();
  const params = useLocalSearchParams();
  const copy = t.consultationFlow;

  const id = typeof params.id === 'string' ? params.id : '';
  const consultation = consultationById(id);
  const doctor = consultation ? doctorById(consultation.doctorId) : null;

  const [modalVisible, setModalVisible] = useState(false);

  if (!consultation || !doctor) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
        <ConsultationChrome onBack={() => router.replace('/consultation/mycare')} />
        <View style={styles.emptyContainer}>
          <Text style={[styles.missing, type.body, { color: theme.muted }]}>
            {copy.noReports || 'No consultation report found.'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const visitKindLabel =
    consultation.kind === 'audio'
      ? copy.audioVisit || 'Audio consultation'
      : copy.videoVisit || 'Video consultation';

  const durationStr = `${consultation.clinicalSummary?.durationMinutes || 30} minutes`;
  const signedDateStr = consultation.clinicalSummary?.signedAt || longDate(consultation.date, t);
  const reasonText = consultation.clinicalSummary?.reason || consultation.concern || 'Follow-up discussion';
  const planText =
    consultation.clinicalSummary?.doctorPlan ||
    'Review the signed clinical note for assessment, advice and any recommended follow-up.';
  const hasPrescriptions = consultation.prescriptionIssued === true;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.background }]}>
      <ConsultationChrome onBack={() => router.replace('/consultation/mycare')} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header Title & Subtitle */}
        <View style={styles.headerBlock}>
          <Text style={[styles.title, type.headline, { color: theme.text }]}>
            {copy.reportsTitle}
          </Text>
          <Text style={[styles.subtitle, type.bodySmall, { color: theme.muted }]}>
            {copy.reportsSubtitle}
          </Text>

          {/* Status Badge */}
          <View style={styles.pillRow}>
            <View style={styles.approvedPill}>
              <Ionicons name="shield-checkmark" size={13} color="#2E7D32" />
              <Text style={[styles.approvedPillText, type.kicker]}>
                {copy.clinicianApproved}
              </Text>
            </View>
          </View>
        </View>

        {/* Card 1: Doctor & Consultation Metadata */}
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor={glassShadow('consultation')}
          style={styles.card}
        >
          <Text style={[styles.metaLabel, type.kicker, { color: theme.muted }]}>
            {t.consultationPay?.doctor?.toUpperCase() || 'DOCTOR'}
          </Text>
          <View style={styles.doctorRow}>
            <View style={[styles.avatar, { backgroundColor: theme.accentSoft }]}>
              <Text style={[styles.avatarText, { color: theme.accent, fontFamily: type.sansSemi }]}>
                {doctor.initials}
              </Text>
            </View>
            <View style={styles.doctorCopy}>
              <Text style={[styles.doctorName, type.label, { color: theme.text }]}>
                {doctor.name}
              </Text>
              <Text style={[styles.doctorSpecialty, type.caption, { color: theme.muted }]}>
                {specialtyLabel(doctor.specialty, t)} · Lic. ET-MD-{doctor.id.slice(0, 4).toUpperCase()}
              </Text>
            </View>
          </View>

          <View style={[styles.divider, { backgroundColor: glass.border }]} />

          <Text style={[styles.metaLabel, type.kicker, { color: theme.muted }]}>
            {t.consultationPay?.visit?.toUpperCase() || 'CONSULTATION'}
          </Text>
          <Text style={[styles.metaValue, type.body, { color: theme.text }]}>
            {longDate(consultation.date, t)} · {visitKindLabel} · {durationStr}
          </Text>
        </GlassCard>

        {/* Card 2: Clinical Summary */}
        <GlassCard
          tint={glass.card}
          border={glass.border}
          sheen={glass.sheen}
          shadowColor={glassShadow('consultation')}
          style={styles.card}
        >
          <View style={styles.summaryTitleRow}>
            <Ionicons name="document-text-outline" size={18} color={theme.accent} />
            <Text style={[styles.cardTitle, type.label, { color: theme.text }]}>
              {copy.clinicalSummary}
            </Text>
          </View>

          <Text style={[styles.fieldLabel, type.kicker, { color: theme.muted }]}>
            {copy.reason?.toUpperCase() || 'REASON FOR VISIT'}
          </Text>
          <Text style={[styles.fieldValue, type.body, { color: theme.text }]}>
            {reasonText}
          </Text>

          <View style={[styles.divider, { backgroundColor: glass.border }]} />

          <Text style={[styles.fieldLabel, type.kicker, { color: theme.muted }]}>
            {copy.doctorPlan?.toUpperCase() || "DOCTOR'S PLAN"}
          </Text>
          <Text style={[styles.fieldValue, type.bodySmall, { color: theme.text }]}>
            {planText}
          </Text>

          <View style={styles.signatureBadge}>
            <Ionicons name="checkmark-done" size={14} color="#2E7D32" />
            <Text style={[styles.signatureText, type.caption, { color: theme.muted }]}>
              Digitally verified & signed by {doctor.name} on {signedDateStr}
            </Text>
          </View>
        </GlassCard>

        {/* Card 3: Prescriptions Banner (if doctor ordered anything) */}
        {hasPrescriptions ? (
          <GlassCard
            tint={glass.update}
            border={glass.border}
            sheen={glass.sheen}
            shadowColor={glassShadow('consultation')}
            style={styles.rxCard}
          >
            <View style={styles.rxCardHeader}>
              <View style={[styles.rxIconCircle, { backgroundColor: theme.accentSoft }]}>
                <Ionicons name="medkit-outline" size={18} color={theme.accent} />
              </View>
              <View style={styles.rxCopy}>
                <Text style={[styles.rxTitle, type.label, { color: theme.text }]}>
                  {copy.prescriptions || 'Doctor-Authorized Prescriptions'}
                </Text>
                <Text style={[styles.rxSubtitle, type.caption, { color: theme.muted }]}>
                  Medication orders issued during this visit
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.rxButton,
                { backgroundColor: theme.accent },
                pressed && styles.pressed,
              ]}
              onPress={() =>
                router.push({
                  pathname: '/consultation/prescriptions',
                  params: { id: consultation.id },
                })
              }
            >
              <Text style={[styles.rxButtonText, type.button]}>
                View Prescriptions & Follow-up
              </Text>
              <Ionicons name="arrow-forward" size={15} color="#FFFFFF" />
            </Pressable>
          </GlassCard>
        ) : null}

        {/* Action Buttons */}
        <View style={styles.buttonStack}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.accent },
              pressed && styles.pressed,
            ]}
            onPress={() => setModalVisible(true)}
          >
            <Ionicons name="document-attach-outline" size={16} color="#FFFFFF" />
            <Text style={[styles.primaryButtonText, type.button]}>
              {copy.viewSigned}
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
              router.push({
                pathname: '/consultation/doctors',
                params: { doctor: doctor.id },
              })
            }
          >
            <Ionicons name="calendar-outline" size={16} color={theme.text} />
            <Text style={[styles.secondaryButtonText, type.button, { color: theme.text }]}>
              {copy.bookFollow}
            </Text>
          </Pressable>
        </View>

        {/* Footer Note */}
        <Text style={[styles.footerNote, type.caption, { color: theme.muted }]}>
          {copy.pendingReviewBody}
        </Text>
      </ScrollView>

      {/* Signed Report Document Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalSafe, { backgroundColor: theme.background }]}>
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalTitle, type.label, { color: theme.text }]}>
                Official Clinical Note
              </Text>
              <Pressable
                onPress={() => setModalVisible(false)}
                style={styles.modalCloseBtn}
                hitSlop={8}
              >
                <Ionicons name="close-circle" size={26} color={theme.muted} />
              </Pressable>
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={[styles.docSheet, { backgroundColor: glass.card, borderColor: glass.border }]}>
              {/* Header Letterhead */}
              <View style={styles.docHeader}>
                <Text style={[styles.docBrand, { color: theme.accent, fontFamily: type.display }]}>
                  Nordic AbrenCare Digital Clinic
                </Text>
                <Text style={[styles.docSubBrand, type.caption, { color: theme.muted }]}>
                  Telehealth Consultation Services · Addis Ababa, Ethiopia
                </Text>
                <View style={[styles.docDivider, { backgroundColor: glass.border }]} />
              </View>

              {/* Consultation Details */}
              <View style={styles.docGrid}>
                <View style={styles.docCol}>
                  <Text style={[styles.docLabel, type.kicker, { color: theme.muted }]}>ATTENDING CLINICIAN</Text>
                  <Text style={[styles.docVal, type.bodySmall, { color: theme.text }]}>{doctor.name}</Text>
                  <Text style={[styles.docSubVal, type.caption, { color: theme.muted }]}>{specialtyLabel(doctor.specialty, t)}</Text>
                </View>
                <View style={styles.docCol}>
                  <Text style={[styles.docLabel, type.kicker, { color: theme.muted }]}>DATE OF CONSULTATION</Text>
                  <Text style={[styles.docVal, type.bodySmall, { color: theme.text }]}>{signedDateStr}</Text>
                  <Text style={[styles.docSubVal, type.caption, { color: theme.muted }]}>{visitKindLabel}</Text>
                </View>
              </View>

              <View style={[styles.docDivider, { backgroundColor: glass.border }]} />

              {/* Clinical Notes Section */}
              <Text style={[styles.docSectionTitle, type.label, { color: theme.text }]}>Reason for Consultation</Text>
              <Text style={[styles.docText, type.bodySmall, { color: theme.text }]}>{reasonText}</Text>

              <Text style={[styles.docSectionTitle, type.label, { color: theme.text, marginTop: 14 }]}>Assessment & Clinical Plan</Text>
              <Text style={[styles.docText, type.bodySmall, { color: theme.text }]}>{planText}</Text>

              {hasPrescriptions ? (
                <>
                  <Text style={[styles.docSectionTitle, type.label, { color: theme.text, marginTop: 14 }]}>Prescribed Regimen</Text>
                  <Text style={[styles.docText, type.bodySmall, { color: theme.text }]}>
                    Doctor has issued an official prescription document. View full medication directions in the Prescriptions section.
                  </Text>
                </>
              ) : null}

              {/* Official Stamp & Signature Block */}
              <View style={styles.stampBlock}>
                <View style={styles.sealCircle}>
                  <Ionicons name="medical" size={20} color="#1A3A32" />
                  <Text style={styles.sealText}>VERIFIED CLINIC</Text>
                </View>
                <View style={styles.signCopy}>
                  <Text style={[styles.signName, { color: theme.text, fontFamily: type.display }]}>{doctor.name}</Text>
                  <Text style={[styles.signTitle, type.caption, { color: theme.muted }]}>Licensed Practitioner · Nordic AbrenCare</Text>
                </View>
              </View>
            </View>

            <Pressable
              style={[styles.modalDoneBtn, { backgroundColor: theme.accent }]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.modalDoneBtnText, type.button]}>Close Report</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
    marginBottom: 12,
  },
  pillRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  approvedPill: {
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
  approvedPillText: {
    color: '#2E7D32',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  card: {
    padding: 18,
    marginBottom: 16,
  },
  metaLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
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
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  doctorCopy: {
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
  divider: {
    height: 1,
    marginVertical: 14,
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  fieldLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
  signatureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  signatureText: {
    fontSize: 11,
    flex: 1,
  },
  rxCard: {
    padding: 16,
    marginBottom: 16,
  },
  rxCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  rxIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rxCopy: {
    flex: 1,
  },
  rxTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  rxSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  rxButton: {
    height: 44,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  rxButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
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
  footerNote: {
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
  modalSafe: {
    flex: 1,
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalContent: {
    padding: 20,
    paddingBottom: 40,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  docSheet: {
    borderWidth: 1,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  docHeader: {
    marginBottom: 12,
  },
  docBrand: {
    fontSize: 20,
    fontWeight: '700',
  },
  docSubBrand: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 10,
  },
  docDivider: {
    height: 1,
    marginVertical: 12,
  },
  docGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  docCol: {
    flex: 1,
  },
  docLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.1,
    marginBottom: 4,
  },
  docVal: {
    fontSize: 13,
    fontWeight: '700',
  },
  docSubVal: {
    fontSize: 11,
    marginTop: 1,
  },
  docSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  docText: {
    fontSize: 13,
    lineHeight: 18,
  },
  stampBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.08)',
  },
  sealCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#1A3A32',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  sealText: {
    fontSize: 6,
    fontWeight: '800',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 2,
    color: '#1A3A32',
  },
  signCopy: {
    flex: 1,
  },
  signName: {
    fontSize: 16,
    fontWeight: '700',
  },
  signTitle: {
    fontSize: 11,
    marginTop: 2,
  },
  modalDoneBtn: {
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
