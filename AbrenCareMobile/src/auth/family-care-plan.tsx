import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router/build/useFocusEffect';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import FamilyIconWell from '@/components/family/FamilyIconWell';
import FamilyProfilePhoto from '@/components/family/FamilyProfilePhoto';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { CARE_LINE } from '@/data/contact';
import {
  acceptFamilyProposal,
  activateFamilyCare,
  loadFamilyInquiry,
  markFamilySetupStarted,
  type FamilyCaregiverRelationshipId,
  type FamilyInquiry,
} from '@/data/familyInquiry';
import { dashboardFor, familyCareEntry } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';
import {
  kindFromRelationship,
  type FamilyMember,
  type FamilyRelationship,
} from '@/types/auth';
import { ageYearsFromIso } from '@/utilities/birthInput';
import { activeFamilyMember } from '@/utilities/familyMember';

const SERVICE_ICONS = [
  'home-outline',
  'heart-outline',
  'people-outline',
  'document-text-outline',
] as const;

const CITY_LABELS: Record<string, string> = {
  addis: 'Addis Ababa',
  direDawa: 'Dire Dawa',
  hawassa: 'Hawassa',
  bahirDar: 'Bahir Dar',
  mekelle: 'Mekelle',
  gondar: 'Gondar',
  other: 'Another city in Ethiopia',
};

function patientRelationshipFromCaregiver(
  relationship: FamilyCaregiverRelationshipId | undefined,
): FamilyRelationship {
  switch (relationship) {
    case 'mother':
      return 'mother';
    case 'father':
      return 'father';
    case 'parent':
      return 'parent';
    case 'spouse':
      return 'spouse';
    case 'child':
      return 'child';
    default:
      return 'parent';
  }
}

function memberFromInquiry(
  inquiry: FamilyInquiry | null,
  fallbackName: string,
): FamilyMember {
  const relationship = patientRelationshipFromCaregiver(
    inquiry?.caregiverRelationship,
  );
  const patientName =
    inquiry?.patientName?.trim() ||
    inquiry?.name?.trim() ||
    fallbackName.trim() ||
    'Loved one';
  const cityId = inquiry?.city ?? 'addis';
  const dateOfBirth = inquiry?.patientDateOfBirth?.trim() || '';
  return {
    id: `member-${Date.now()}`,
    kind: kindFromRelationship(relationship),
    name: patientName,
    relationship,
    dateOfBirth,
    ageYears: ageYearsFromIso(dateOfBirth),
    phone: inquiry?.patientPhone?.trim() || '',
    city: CITY_LABELS[cityId] ?? CITY_LABELS.addis,
    address: '',
    emergencyPhone: inquiry?.phone?.trim() || '',
    careNeeds: ['general'],
    preferredLanguage: '',
    notes: '',
    status:
      inquiry?.status === 'accepted' ||
      inquiry?.status === 'setup' ||
      inquiry?.status === 'active'
        ? 'active'
        : 'pending',
  };
}

export default function FamilyCarePlanScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyPlan;
  const type = useLandingType('family');
  const { colors, isDark } = useAppTheme();
  const { user, hasService, needsOnboarding, completeFamilyOnboarding } = useAuth();
  const [inquiry, setInquiry] = useState<FamilyInquiry | null | undefined>(undefined);
  const [accepting, setAccepting] = useState(false);

  const refresh = useCallback(() => {
    let active = true;
    loadFamilyInquiry().then((data) => {
      if (active) {
        setInquiry(data);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (inquiry === undefined) {
    return <FamilyRequestChrome>{null}</FamilyRequestChrome>;
  }

  if (!inquiry) {
    return <Replace href="/family-request" />;
  }

  const proposal = inquiry.proposal;
  const member = activeFamilyMember(user);
  const careName = member?.name || proposal?.recipient || inquiry.patientName || 'Loved one';
  const personMeta = [
    member?.ageYears != null ? t.familyAdd.dobAge.replace('{age}', String(member.ageYears)) : null,
    member?.city || null,
  ]
    .filter(Boolean)
    .join(' · ');

  const services = [
    { title: copy.serviceNurse, detail: proposal?.visitFrequency || copy.serviceNurseDetail },
    { title: copy.serviceCheck, detail: copy.serviceCheckDetail },
    { title: copy.serviceFollow, detail: copy.serviceFollowDetail },
    { title: copy.serviceReport, detail: copy.serviceReportDetail },
  ];

  const canAccept = inquiry.status === 'proposed' && !!proposal && !accepting;
  const canContinueSetup = inquiry.status === 'accepted' || inquiry.status === 'setup';

  const askQuestion = () => {
    const number = CARE_LINE.replace(/[^\d]/g, '');
    Linking.openURL(`https://wa.me/${number}`).catch(() => Linking.openURL(`tel:${CARE_LINE}`));
  };

  const goToFamilyHome = async () => {
    if (!user || !hasService('family')) {
      router.push({ pathname: '/signup', params: { service: 'family' } });
      return;
    }
    if (!user.emailVerified) {
      router.push('/verify-email');
      return;
    }
    const fresh = await loadFamilyInquiry();
    if (needsOnboarding('family') || user.familyMembers.length === 0) {
      completeFamilyOnboarding([
        memberFromInquiry(fresh, user.name || 'Loved one'),
      ]);
    }
    const careId = fresh?.id ?? inquiry?.id;
    if (careId) {
      await markFamilySetupStarted(careId);
      await activateFamilyCare(careId);
    }
    router.replace(dashboardFor('family'));
  };

  const onAccept = () => {
    if (!canAccept) {
      return;
    }
    setAccepting(true);
    acceptFamilyProposal(inquiry.id)
      .then(async () => {
        const fresh = await loadFamilyInquiry();
        if (!user || !hasService('family')) {
          router.replace({ pathname: '/signup', params: { service: 'family' } });
          return;
        }
        if (!user.emailVerified) {
          router.replace('/verify-email');
          return;
        }
        if (needsOnboarding('family') || user.familyMembers.length === 0) {
          completeFamilyOnboarding([
            memberFromInquiry(fresh || inquiry, user.name || 'Loved one'),
          ]);
        }
        await markFamilySetupStarted(inquiry.id);
        await activateFamilyCare(inquiry.id);
        router.replace(dashboardFor('family'));
      })
      .finally(() => setAccepting(false));
  };

  const waiting =
    inquiry.status === 'received'
      ? { title: copy.waitingReceivedTitle, body: copy.waitingReceivedBody }
      : inquiry.status === 'contacted'
        ? { title: copy.waitingContactedTitle, body: copy.waitingContactedBody }
        : inquiry.status === 'accepted'
          ? { title: copy.acceptedTitle, body: copy.acceptedNote }
          : inquiry.status === 'setup'
            ? { title: copy.setupTitle, body: copy.setupNote }
            : inquiry.status === 'active'
              ? { title: copy.activeTitle, body: copy.activeNote }
              : null;

  return (
    <FamilyRequestChrome>
      <Text style={[styles.kicker, type.kicker, { color: colors.muted }]}>{copy.kicker}</Text>

      {proposal ? (
        <View>
          <Text style={[styles.title, type.headline, { color: colors.text }]}>
            {copy.planFor.replace('{name}', careName)}
          </Text>
          <Text style={[styles.subtitle, type.body, { color: colors.muted }]}>{copy.subtitle}</Text>

          <View style={[styles.personCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <FamilyProfilePhoto size={52} name={careName} />
            <View style={styles.personCopy}>
              <Text style={[styles.personName, type.section, { color: colors.text }]}>
                {careName}
              </Text>
              {personMeta ? (
                <Text style={[styles.personMeta, type.bodySmall, { color: colors.muted }]}>{personMeta}</Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.block, { backgroundColor: colors.card, borderColor: isDark ? colors.border : '#D5E3DC' }]}>
            <View style={[styles.priceHead, { backgroundColor: isDark ? colors.continue : '#E7EEEA' }]}>
              <Ionicons name="list-outline" size={16} color={isDark ? '#C9E4D8' : '#5E7A62'} />
              <Text style={[styles.priceHeadText, type.label, { color: isDark ? '#E7EEEA' : '#1A3A32' }]}>
                {copy.includedTitle}
              </Text>
            </View>
            <View style={styles.serviceBody}>
              {services.map((service, index) => (
                <View key={service.title} style={styles.serviceRow}>
                  <FamilyIconWell name={SERVICE_ICONS[index]} />
                  <View style={styles.serviceCopy}>
                    <Text style={[styles.serviceText, type.bodySmall, { color: colors.text }]}>{service.title}</Text>
                    <Text style={[styles.serviceDetail, type.caption, { color: colors.muted }]}>{service.detail}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {proposal.quoteAmount ? (
            <View style={[styles.priceCard, { backgroundColor: colors.card, borderColor: isDark ? colors.border : '#D5E3DC' }]}>
              <View style={[styles.priceHead, { backgroundColor: isDark ? colors.continue : '#E7EEEA' }]}>
                <Ionicons name="pricetag-outline" size={16} color={isDark ? '#C9E4D8' : '#5E7A62'} />
                <Text style={[styles.priceHeadText, type.label, { color: isDark ? '#E7EEEA' : '#1A3A32' }]}>
                  {copy.priceTitle}
                </Text>
              </View>
              <View style={styles.priceBody}>
                <Text style={[styles.feeLabel, type.caption, { color: colors.muted }]}>{copy.monthlyFee}</Text>
                <View style={styles.amountRow}>
                  <Text style={[styles.quoteAmount, { color: colors.text }]}>{proposal.quoteAmount}</Text>
                  <View style={[styles.currencyChip, { backgroundColor: isDark ? colors.continue : '#1A3A32' }]}>
                    <Text style={styles.currencyText}>{proposal.quoteCurrency}</Text>
                  </View>
                </View>
                <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>{proposal.billingPeriod}</Text>
                <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>
                  {proposal.cancellationTerms}
                </Text>
                <Pressable style={styles.termsRow} onPress={() => router.push('/legal?doc=terms')}>
                  <Text style={[styles.termsLink, type.bodySmall]}>{copy.termsLink}</Text>
                  <Ionicons name="chevron-forward" size={14} color="#3D7A9A" />
                </Pressable>
              </View>
            </View>
          ) : null}
        </View>
      ) : waiting ? (
        <View style={[styles.waitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, type.headline, { color: colors.text }]}>{waiting.title}</Text>
          <Text style={[type.body, { color: colors.muted }]}>{waiting.body}</Text>
        </View>
      ) : null}

      {canAccept ? (
        <Pressable
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.continue }, pressed && styles.pressed]}
          onPress={onAccept}
        >
          <Text style={[styles.primaryText, type.button]}>{copy.accept}</Text>
        </Pressable>
      ) : null}

      {canContinueSetup ? (
        <Pressable
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.continue }, pressed && styles.pressed]}
          onPress={() => {
            void goToFamilyHome();
          }}
        >
          <Text style={[styles.primaryText, type.button]}>{copy.continueSetup}</Text>
        </Pressable>
      ) : null}

      {inquiry.status === 'received' ? (
        <Pressable
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.continue }, pressed && styles.pressed]}
          onPress={() => router.push(familyCareEntry(user, hasService, needsOnboarding))}
        >
          <Text style={[styles.primaryText, type.button]}>{copy.goHome}</Text>
        </Pressable>
      ) : null}

      {inquiry.status === 'active' ? (
        <Pressable
          style={({ pressed }) => [styles.primary, { backgroundColor: colors.continue }, pressed && styles.pressed]}
          onPress={() => router.replace(dashboardFor('family'))}
        >
          <Text style={[styles.primaryText, type.button]}>{copy.goHome}</Text>
        </Pressable>
      ) : null}

      {inquiry.status !== 'active' ? (
        <Pressable
          style={({ pressed }) => [
            styles.secondary,
            { borderColor: colors.border, backgroundColor: colors.card },
            pressed && styles.pressed,
          ]}
          onPress={askQuestion}
        >
          <Text style={[styles.secondaryText, type.button, { color: colors.text }]}>{copy.ask}</Text>
        </Pressable>
      ) : null}
    </FamilyRequestChrome>
  );
}

const styles = StyleSheet.create({
  kicker: {
    marginBottom: 16,
  },
  waitCard: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    marginBottom: 18,
  },
  title: {
    marginBottom: 8,
  },
  subtitle: {
    marginBottom: 16,
  },
  personCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  personCopy: {
    flex: 1,
  },
  personName: {
    fontSize: 16,
  },
  personMeta: {
    marginTop: 2,
  },
  block: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  serviceBody: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 16,
  },
  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 14,
  },
  serviceCopy: {
    flex: 1,
  },
  serviceText: {
    lineHeight: 20,
  },
  serviceDetail: {
    marginTop: 2,
  },
  priceCard: {
    borderRadius: 22,
    borderWidth: 1,
    marginBottom: 16,
    overflow: 'hidden',
  },
  priceHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  priceHeadText: {
    flex: 1,
  },
  priceBody: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 10,
  },
  currencyChip: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  currencyText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  feeLabel: {
    letterSpacing: 0.2,
  },
  termsRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  termsLink: {
    color: '#3D7A9A',
    fontWeight: '600',
  },
  sectionBody: {
    lineHeight: 20,
  },
  quoteAmount: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '700',
  },
  primary: {
    minHeight: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginBottom: 10,
  },
  primaryText: {
    color: '#FFFFFF',
    textAlign: 'center',
  },
  secondary: {
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  secondaryText: {
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.88,
  },
});