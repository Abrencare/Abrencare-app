import { useCallback, useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import FamilyRequestChrome from '@/auth/FamilyRequestChrome';
import Replace from '@/components/gates/Replace';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useAppTheme } from '@/context/ThemeContext';
import { CARE_LINE } from '@/data/contact';
import {
  acceptFamilyProposal,
  journeyStageIndex,
  loadFamilyInquiry,
  type FamilyInquiry,
} from '@/data/familyInquiry';
import { dashboardFor, onboardingPath } from '@/service/serviceTheme';
import { useLandingType } from '@/theme/landingType';

export default function FamilyCarePlanScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const copy = t.familyPlan;
  const type = useLandingType('family');
  const { colors, isDark } = useAppTheme();
  const { user, hasService, needsOnboarding } = useAuth();
  const [inquiry, setInquiry] = useState<FamilyInquiry | null | undefined>(undefined);
  const [accepting, setAccepting] = useState(false);

  const refresh = useCallback(() => {
    loadFamilyInquiry().then(setInquiry);
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

  const stages = [
    copy.stepReceived,
    copy.stepContacted,
    copy.stepProposed,
    copy.stepSetup,
    copy.stepActive,
  ];
  const currentStage = journeyStageIndex(inquiry.status);
  const proposal = inquiry.proposal;
  const canAccept = inquiry.status === 'proposed' && !!proposal && !accepting;
  const canContinueSetup = inquiry.status === 'accepted' || inquiry.status === 'setup';

  const askQuestion = () => {
    const number = CARE_LINE.replace(/[^\d]/g, '');
    Linking.openURL(`https://wa.me/${number}`).catch(() => Linking.openURL(`tel:${CARE_LINE}`));
  };

  const goToSetup = () => {
    if (user && hasService('family')) {
      if (!user.emailVerified) {
        router.push('/verify-email');
        return;
      }
      router.push(needsOnboarding('family') ? onboardingPath('family') : dashboardFor('family'));
      return;
    }
    router.push('/signup?service=family');
  };

  const onAccept = () => {
    if (!canAccept) {
      return;
    }
    setAccepting(true);
    acceptFamilyProposal(inquiry.id)
      .then(() => goToSetup())
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
      <View style={styles.kickerRow}>
        <Text style={[styles.kicker, type.kicker, { color: colors.muted }]}>{copy.kicker}</Text>
        <Ionicons name="lock-closed" size={14} color={colors.muted} />
      </View>

      <View style={styles.tracker}>
        {stages.map((label, index) => {
          const done = index < currentStage;
          const current = index === currentStage;
          const isLast = index === stages.length - 1;
          return (
            <View key={label} style={styles.stage}>
              <View style={styles.stageTop}>
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: colors.border },
                    index === 0 && styles.connectorHidden,
                    index <= currentStage && { backgroundColor: colors.continue },
                  ]}
                />
                <View
                  style={[
                    styles.dotWrap,
                    current && { backgroundColor: isDark ? colors.continue : '#E7EEEA' },
                  ]}
                >
                  <View
                    style={[
                      styles.dot,
                      { backgroundColor: colors.card, borderColor: colors.border },
                      (done || current) && { backgroundColor: colors.continue, borderColor: colors.continue },
                    ]}
                  >
                    {done ? <Ionicons name="checkmark" size={11} color="#FFFFFF" /> : null}
                  </View>
                </View>
                <View
                  style={[
                    styles.connector,
                    { backgroundColor: colors.border },
                    isLast && styles.connectorHidden,
                    index < currentStage && { backgroundColor: colors.continue },
                  ]}
                />
              </View>
              <Text
                style={[
                  styles.stageLabel,
                  type.caption,
                  { color: colors.muted },
                  current && { color: colors.text, fontFamily: type.sansSemi },
                ]}
              >
                {label}
              </Text>
            </View>
          );
        })}
      </View>

      {proposal ? (
        <View style={[styles.proposal, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, type.headline, { color: colors.text }]}>{copy.title}</Text>
          <Text style={[styles.subtitle, type.body, { color: colors.muted }]}>{copy.subtitle}</Text>

          <View style={[styles.rule, { backgroundColor: colors.divider }]} />
          <Text style={[styles.sectionLabel, type.label, { color: colors.text }]}>
            {copy.careFor}: {proposal.recipient}
          </Text>

          <View style={[styles.rule, { backgroundColor: colors.divider }]} />
          <Text style={[styles.sectionLabel, type.label, { color: colors.text }]}>{copy.servicesTitle}</Text>
          <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>{proposal.services}</Text>

          <View style={[styles.rule, { backgroundColor: colors.divider }]} />
          <Text style={[styles.sectionLabel, type.label, { color: colors.text }]}>{copy.frequencyTitle}</Text>
          <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>
            {proposal.visitFrequency}
          </Text>
          <Text style={[styles.sectionLabel, type.label, { color: colors.text, marginTop: 12 }]}>
            {copy.durationTitle}
          </Text>
          <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>
            {proposal.planDuration}
          </Text>

          <View style={[styles.rule, { backgroundColor: colors.divider }]} />
          <Text style={[styles.sectionLabel, type.label, { color: colors.text }]}>{copy.quoteTitle}</Text>
          <Text style={[styles.quoteAmount, type.section, { color: colors.text }]}>
            {proposal.quoteAmount} {proposal.quoteCurrency}
          </Text>
          <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>
            {copy.billing}: {proposal.billingPeriod}
          </Text>
          <Text style={[styles.quoteMeta, type.label, { color: colors.text }]}>{copy.exclusionsTitle}</Text>
          <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>
            {proposal.exclusions}
          </Text>
          <Text style={[styles.quoteMeta, type.label, { color: colors.text }]}>{copy.paymentTitle}</Text>
          <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>
            {proposal.paymentTerms}
          </Text>
          <Text style={[styles.quoteMeta, type.label, { color: colors.text }]}>{copy.cancelTitle}</Text>
          <Text style={[styles.sectionBody, type.bodySmall, { color: colors.muted }]}>
            {proposal.cancellationTerms}
          </Text>

          <View style={[styles.nextBox, { backgroundColor: isDark ? colors.continue : '#E7EEEA' }]}>
            <Text style={[styles.nextTitle, type.label, { color: colors.text }]}>{copy.nextTitle}</Text>
            <Text style={[styles.nextBody, type.bodySmall, { color: colors.muted }]}>{copy.nextBody}</Text>
          </View>
        </View>
      ) : waiting ? (
        <View style={[styles.waitCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.title, type.headline, { color: colors.text }]}>{waiting.title}</Text>
          <Text style={[type.body, { color: colors.muted }]}>{waiting.body}</Text>
        </View>
      ) : null}

      {waiting && proposal ? (
        <Text style={[styles.statusNote, type.bodySmall, { color: colors.muted }]}>{waiting.body}</Text>
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
          onPress={goToSetup}
        >
          <Text style={[styles.primaryText, type.button]}>{copy.continueSetup}</Text>
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
  kickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  kicker: {
    flex: 1,
    paddingRight: 12,
  },
  tracker: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  stage: {
    flex: 1,
    alignItems: 'center',
  },
  stageTop: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginBottom: 8,
  },
  connector: {
    flex: 1,
    height: 2,
  },
  connectorHidden: {
    backgroundColor: 'transparent',
  },
  dotWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stageLabel: {
    textAlign: 'center',
    paddingHorizontal: 1,
  },
  proposal: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
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
    marginBottom: 4,
  },
  rule: {
    height: 1,
    marginVertical: 16,
  },
  sectionLabel: {
    marginBottom: 6,
  },
  sectionBody: {
    lineHeight: 20,
  },
  quoteAmount: {
    marginBottom: 4,
  },
  quoteMeta: {
    marginTop: 12,
    marginBottom: 4,
  },
  nextBox: {
    borderRadius: 16,
    padding: 16,
    marginTop: 20,
  },
  nextTitle: {
    marginBottom: 6,
  },
  nextBody: {
    lineHeight: 20,
  },
  statusNote: {
    marginBottom: 16,
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
