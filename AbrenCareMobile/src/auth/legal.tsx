import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/build/useFocusEffect';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import { useAppTheme } from '@/context/ThemeContext';
import { useLanguage } from '@/context/LanguageContext';
import { loadFamilyInquiry, type FamilyProposal } from '@/data/familyInquiry';
import { useLandingType } from '@/theme/landingType';

const SECTION_ICONS = [
  'document-text-outline',
  'chatbubble-ellipses-outline',
  'reader-outline',
  'checkmark-circle-outline',
  'card-outline',
  'refresh-outline',
  'person-outline',
  'alert-circle-outline',
  'lock-closed-outline',
] as const;

export default function LegalScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const { t } = useLanguage();
  const type = useLandingType('family');
  const { colors, isDark } = useAppTheme();
  const doc = Array.isArray(params.doc) ? params.doc[0] : params.doc;
  const privacy = doc === 'privacy';
  const [proposal, setProposal] = useState<FamilyProposal | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (privacy) {
        setProposal(null);
        return;
      }
      loadFamilyInquiry().then((inquiry) => setProposal(inquiry?.proposal ?? null));
    }, [privacy]),
  );

  const ink = isDark ? '#E7EEEA' : '#1A3A32';
  const headBg = isDark ? colors.continue : '#E7EEEA';
  const border = isDark ? colors.border : '#D5E3DC';
  const rows = proposal
    ? [
        { label: t.familyPlan.careFor, value: proposal.recipient },
        {
          label: t.familyPlan.monthlyFee,
          value: [proposal.quoteAmount, proposal.quoteCurrency].filter(Boolean).join(' '),
        },
        { label: t.familyPlan.billing, value: proposal.billingPeriod },
        { label: t.familyPlan.paymentTitle, value: proposal.paymentTerms },
        { label: t.familyPlan.cancelTitle, value: proposal.cancellationTerms },
        { label: t.familyPlan.exclusionsTitle, value: proposal.exclusions },
      ].filter((row) => row.value.trim().length > 0)
    : [];

  if (privacy) {
    return (
      <FamilyRequestChrome>
        <Text style={[styles.kicker, type.kicker, { color: colors.muted }]}>{t.legal.updated}</Text>
        <Text style={[styles.title, type.headline, { color: colors.text }]}>{t.legal.privacyTitle}</Text>
        <Text style={[styles.intro, type.body, { color: colors.muted }]}>{t.legal.privacyBody}</Text>
      </FamilyRequestChrome>
    );
  }

  return (
    <FamilyRequestChrome>
      <Text style={[styles.kicker, type.kicker, { color: colors.muted }]}>{t.legal.termsKicker}</Text>
      <Text style={[styles.title, type.headline, { color: colors.text }]}>{t.legal.termsTitle}</Text>
      <Text style={[styles.updated, type.caption, { color: colors.muted }]}>{t.legal.updated}</Text>
      <Text style={[styles.intro, type.body, { color: colors.muted }]}>{t.legal.termsIntro}</Text>

      {rows.length > 0 ? (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: border }]}>
          <View style={[styles.head, { backgroundColor: headBg }]}>
            <Ionicons name="pricetag-outline" size={16} color={ink} />
            <Text style={[styles.headText, type.label, { color: ink }]}>{t.legal.yourProposal}</Text>
          </View>
          <View style={styles.body}>
            {rows.map((row) => (
              <View key={row.label} style={styles.row}>
                <Text style={[styles.rowLabel, type.caption, { color: colors.muted }]}>{row.label}</Text>
                <Text style={[styles.rowValue, type.bodySmall, { color: colors.text }]}>{row.value}</Text>
              </View>
            ))}
            <Text style={[styles.note, type.caption, { color: colors.muted }]}>{t.legal.proposalNote}</Text>
          </View>
        </View>
      ) : null}

      {t.legal.termsSections.map((section, index) => (
        <View
          key={section.title}
          style={[styles.card, { backgroundColor: colors.card, borderColor: border }]}
        >
          <View style={[styles.head, { backgroundColor: headBg }]}>
            <Ionicons name={SECTION_ICONS[index] ?? 'ellipse-outline'} size={16} color={ink} />
            <Text style={[styles.headText, type.label, { color: ink }]}>{section.title}</Text>
          </View>
          <View style={styles.body}>
            <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>{section.body}</Text>
          </View>
        </View>
      ))}

      <Pressable style={styles.privacyRow} onPress={() => router.push('/legal?doc=privacy')}>
        <Text style={[styles.privacyLink, type.bodySmall]}>{t.legal.privacyLink}</Text>
        <Ionicons name="chevron-forward" size={14} color="#3D7A9A" />
      </Pressable>
    </FamilyRequestChrome>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginBottom: 10,
  },
  title: {
    marginBottom: 6,
  },
  updated: {
    marginBottom: 12,
  },
  intro: {
    lineHeight: 24,
    marginBottom: 16,
  },
  card: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headText: {
    flex: 1,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  row: {
    marginBottom: 12,
  },
  rowLabel: {
    marginBottom: 2,
  },
  rowValue: {
    lineHeight: 20,
  },
  note: {
    lineHeight: 18,
    marginTop: 2,
  },
  sectionBody: {
    lineHeight: 22,
  },
  privacyRow: {
    marginTop: 6,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  privacyLink: {
    color: '#3D7A9A',
    fontWeight: '600',
  },
});
